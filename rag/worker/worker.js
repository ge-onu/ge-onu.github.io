/* 거누 응답 서버(Cloudflare Worker).
 * 1) RAG 엔진(engine.js, RAG PoC FROZEN_V2 이식)이 근거를 고르고 답해도 되는지 판정한다.
 * 2) 거절이면 생성 모델을 부르지 않는다.
 * 3) 답할 수 있으면 Gemini가 근거 안에서만 문장을 쓰고, 숫자·기술명·금지 표현을 검사한다.
 *    한 번 고쳐 쓰게 하고, 그래도 어긋나면 생성 없이 근거 문장으로 답한다.
 * 비밀값: GEMINI_API_KEY (wrangler secret). 질문 원문은 저장하지 않는다. */
import { Engine } from '../engine.js';
import { retrievalQuery, sources, evidencePack, SYSTEM, userPrompt, checkFacts, plainAnswer, refusalText } from '../answer.js';
import data from '../data/geonu-rag.json';

const engine = new Engine(data, { chat: true });
const ORIGINS = new Set(['https://geonu.site', 'https://www.geonu.site', 'http://localhost:8790', 'http://localhost:8765']);
// 2026-10 기준 무료 등급에서 빠르고 안정적인 순서. 앞 모델이 503·시간 초과면 다음 모델로 넘어간다.
const MODELS = ['gemini-3.1-flash-lite', 'gemini-3.8-flash'];
const THINKING = { 'gemini-3.8-flash': { thinkingLevel: 'low' } };
const hits = new Map(); // 같은 인스턴스 안의 간단한 IP별 제한(분당 8회). 바인딩이 있으면 그쪽을 쓴다.

function cors(origin) {
  return { 'Access-Control-Allow-Origin': ORIGINS.has(origin) ? origin : 'https://geonu.site', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Vary': 'Origin' };
}
const json = (body, status, origin) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...cors(origin) } });

async function limited(env, ip) {
  if (env.RL) { const { success } = await env.RL.limit({ key: ip }); return !success; }
  const now = Date.now(), arr = (hits.get(ip) || []).filter(t => now - t < 60000); arr.push(now); hits.set(ip, arr);
  return arr.length > 8;
}

async function callModel(env, model, system, prompt) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 9000);
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST', signal: ctl.signal, headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 600, ...(THINKING[model] ? { thinkingConfig: THINKING[model] } : {}) } }),
    });
    if (!r.ok) throw new Error(`${model} ${r.status}`);
    const j = await r.json();
    const text = tidy((j.candidates?.[0]?.content?.parts || []).filter(p => !p.thought).map(p => p.text || '').join(''));
    if (!text) throw new Error(`${model} empty`);
    return text;
  } finally { clearTimeout(t); }
}
// 화면은 마크다운을 그리지 않으므로 기호를 걷어 낸다.
const tidy = t => t.replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/`/g, '').replace(/\*\*/g, '').replace(/^#+\s*/gm, '').trim();
const timeout = (ms, what) => new Promise((_, rej) => setTimeout(() => rej(new Error(`${what} timeout`)), ms));

// Cloudflare Workers AI(바인딩 AI). 키가 필요 없고, 무료 한도를 넘으면 과금이 아니라 거절된다.
const WAI_MODELS = ['@cf/openai/gpt-oss-120b', '@cf/meta/llama-3.3-70b-instruct-fp8-fast'];
function textOf(r) {
  if (!r) return '';
  if (typeof r.response === 'string') return r.response;
  if (r.choices?.[0]?.message?.content) return r.choices[0].message.content;
  if (typeof r.output_text === 'string') return r.output_text;
  const out = (r.output || []).filter(o => o.type === 'message').flatMap(o => o.content || []).filter(c => c.type === 'output_text').map(c => c.text);
  return out.join('');
}
async function workersAI(env, model, system, prompt) {
  if (!env.AI) throw new Error('no AI binding');
  const input = model.includes('gpt-oss')
    ? { instructions: system, input: prompt, reasoning: { effort: 'low' }, max_output_tokens: 900 }
    : { messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }], max_tokens: 600, temperature: 0.3 };
  const r = await Promise.race([env.AI.run(model, input), timeout(14000, model)]);
  const text = tidy(textOf(r));
  if (!text) throw new Error(`${model} empty`);
  return text;
}

// 작성 모델 순서: Gemini(무료 등급, 짧은 대기) → Workers AI → (실패하면 호출한 쪽이 근거 문장으로 답한다)
async function write(env, system, prompt, errors) {
  const models = (env.GEMINI_MODELS || '').split(',').map(s => s.trim()).filter(Boolean);
  if (env.GEMINI_API_KEY) for (const m of (models.length ? models : MODELS).slice(0, 1)) {
    try { return { text: await Promise.race([callModel(env, m, system, prompt), timeout(7000, m)]), by: m }; } catch (e) { errors.push(String(e.message || e).slice(0, 60)); }
  }
  for (const m of WAI_MODELS) {
    try { return { text: await workersAI(env, m, system, prompt), by: m }; } catch (e) { errors.push(String(e.message || e).slice(0, 60)); }
  }
  throw new Error('all writers failed');
}

export default {
  async fetch(req, env) {
    const origin = req.headers.get('Origin') || '';
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(origin) });
    const url = new URL(req.url);
    if (req.method === 'GET' && url.pathname === '/health') return json({ ok: true, data: data.version, writers: [...(env.GEMINI_MODELS || MODELS.join(',')).split(',').slice(0, 1), ...WAI_MODELS], key: Boolean(env.GEMINI_API_KEY), ai: Boolean(env.AI) }, 200, origin);
    if (req.method !== 'POST' || url.pathname !== '/chat') return json({ error: 'not_found' }, 404, origin);
    if (!ORIGINS.has(origin)) return json({ error: 'origin' }, 403, origin);
    if (await limited(env, req.headers.get('CF-Connecting-IP') || 'x')) return json({ error: 'rate_limited', text: '질문이 조금 많았어요. 1분 뒤에 다시 물어봐 주세요.' }, 429, origin);

    let body; try { body = await req.json(); } catch { return json({ error: 'bad_json' }, 400, origin); }
    const q = String(body.q || '').trim().slice(0, 500);
    const history = (Array.isArray(body.history) ? body.history : []).slice(-6).map(m => ({ role: m.role === 'user' ? 'user' : 'bot', text: String(m.text || '').slice(0, 600) }));
    if (!q) return json({ error: 'empty' }, 400, origin);

    const ans = engine.answer(retrievalQuery(q, history));
    const meta = { decision: ans.decision, stance: ans.stance, claim: ans.constraint?.claim_id || null, data: data.version };
    if (ans.decision === 'refuse') return json({ text: refusalText(ans), sources: [], mode: 'refuse', ...meta }, 200, origin);

    const pack = evidencePack(engine, ans), src = sources(engine, ans);
    const errors = [], t0 = Date.now();
    try {
      const base = userPrompt(q, history, pack);
      let { text, by } = await write(env, SYSTEM, base, errors);
      let bad = checkFacts(text, pack, q, ans);
      if (bad.length && Date.now() - t0 < 12000) {
        ({ text, by } = await write(env, SYSTEM, base + `\n\n[고쳐 쓰기]\n앞 답변에 근거에 없는 내용이 있었다: ${bad.join(', ')}. 근거에 있는 사실만으로 다시 써라.`, errors));
        bad = checkFacts(text, pack, q, ans);
      }
      if (!text || bad.length) return json({ text: plainAnswer(engine, ans), sources: src, mode: 'plain', checked: bad, notes: errors, ...meta }, 200, origin);
      return json({ text, sources: src, mode: 'generated', by, notes: errors, ...meta }, 200, origin);
    } catch (e) {
      return json({ text: plainAnswer(engine, ans), sources: src, mode: 'plain', notes: errors, ...meta }, 200, origin);
    }
  },
};
