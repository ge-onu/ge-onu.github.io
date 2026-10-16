/* 거누 응답 서버(Cloudflare Worker).
 * 1) RAG 엔진(engine.js, RAG PoC FROZEN_V2 이식)이 근거를 고르고 답해도 되는지 판정한다.
 * 2) 거절이면 생성 모델을 부르지 않는다.
 * 3) 답할 수 있으면 Gemini가 근거 안에서만 문장을 쓴다. 실패하거나 깨진 글이면 한 번만 다시 부른다.
 * 4) 숫자·기술명·금지 표현(사실 검사)과 글자 비율·반복(정상성 검사)을 본다.
 *    사실 검사에 걸리면 한 번 고쳐 쓰게 하고, 그래도 어긋나거나 시간이 모자라면 생성 없이 근거 문장으로 답한다(간단 모드).
 * 비밀값: GEMINI_API_KEY (wrangler secret). 질문 원문은 저장하지 않는다. */
import { Engine } from '../engine.js';
import { retrievalQuery, sources, evidencePack, SYSTEM, userPrompt, checkFacts, sanityIssues, plainAnswer, refusalText } from '../answer.js';
import data from '../data/geonu-rag.json';

const engine = new Engine(data, { chat: true });
const ORIGINS = new Set(['https://geonu.site', 'https://www.geonu.site', 'http://localhost:8790', 'http://localhost:8765']);
// 첫 모델이 실패(503·시간 초과·깨진 글)하면 다음 모델로 한 번만 다시 부른다. 목록이 하나면 같은 모델을 다시 부른다.
// Workers AI 대체 작성(gpt-oss-120b 등)은 뺐다: 2026-10-14에 '!'만 700여 개 돌려준 답이 그대로 나갔다.
// 무료 등급 키는 요청이 몰리면 503(high demand)을 먼저 받는다(2026-10-17 확인: 같은 때 유료 키는 200).
// 그래서 용량이 따로인 모델을 뒤에 두고, 시간 예산 안에서 차례로 시도한다.
// 2026-10-17 무료 키 시험: 3.8-flash·3.7-flash는 503, 2.5-flash-lite는 404(새 사용자 불가), Gemma는 시간 초과·500, 3.6-flash는 답이 잘림.
const MODELS = ['gemini-3.1-flash-lite', 'gemini-3.5-flash-lite', 'gemini-flash-lite-latest'];
const THINKING = { 'gemini-3.8-flash': { thinkingLevel: 'low' } };
const BUDGET = 18000;   // 화면은 25초를 기다린다. 모델 호출 전체를 이 안에서 끝낸다.
const PER_CALL = 9000;
const isGemma = m => m.startsWith('gemma-');
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

async function callModel(env, model, system, prompt, ms) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST', signal: ctl.signal, headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
      body: JSON.stringify({ ...(isGemma(model) ? {} : { systemInstruction: { parts: [{ text: system }] } }),
        contents: [{ role: 'user', parts: [{ text: isGemma(model) ? `${system}\n\n${prompt}` : prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 600, ...(THINKING[model] ? { thinkingConfig: THINKING[model] } : {}) } }),
    });
    if (!r.ok) {
      // 원인 파악용: Gemini 오류 본문을 Worker 로그에만 남긴다(키는 본문에 없다, 화면 응답에는 넣지 않는다).
      const body = (await r.text().catch(() => '')).replace(/\s+/g, ' ').slice(0, 400);
      console.log(JSON.stringify({ gemini_error: model, status: r.status, body }));
      throw new Error(`${model} ${r.status}`);
    }
    const j = await r.json();
    const text = tidy((j.candidates?.[0]?.content?.parts || []).filter(p => !p.thought).map(p => p.text || '').join(''));
    if (!text) throw new Error(`${model} empty`);
    return text;
  } catch (e) {
    if (e.name === 'AbortError') throw new Error(`${model} timeout`);
    throw e;
  } finally { clearTimeout(t); }
}
// 화면은 마크다운을 그리지 않으므로 기호를 걷어 낸다.
const tidy = t => t.replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/`/g, '').replace(/\*\*/g, '').replace(/^#+\s*/gm, '').trim();
const timeout = (ms, what) => new Promise((_, rej) => setTimeout(() => rej(new Error(`${what} timeout`)), ms));
const models = env => { const m = (env.GEMINI_MODELS || '').split(',').map(s => s.trim()).filter(Boolean); return m.length ? m : MODELS; };

// 작성: 목록의 모델을 차례로(시간 예산 안에서) → 실패하거나 깨진 글이면 다음 모델 → 다 안 되면 호출한 쪽이 간단 모드로 답한다.
async function write(env, system, prompt, errors, deadline) {
  if (!env.GEMINI_API_KEY) { errors.push('no key'); throw new Error('no key'); }
  const list = models(env);
  for (const m of (list.length > 1 ? list : [list[0], list[0]])) {
    const left = deadline - Date.now();
    if (left < 2500) { errors.push('time budget'); break; }
    try {
      const ms = Math.min(PER_CALL, left);
      const text = await Promise.race([callModel(env, m, system, prompt, ms), timeout(ms, m)]);
      const bad = sanityIssues(text);
      if (bad.length) { errors.push(`${m} 출력 이상: ${bad[0]}`.slice(0, 60)); continue; }
      return { text, by: m };
    } catch (e) { errors.push(String(e.message || e).slice(0, 60)); }
  }
  throw new Error('all writers failed');
}

export default {
  async fetch(req, env) {
    const origin = req.headers.get('Origin') || '';
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(origin) });
    const url = new URL(req.url);
    if (req.method === 'GET' && url.pathname === '/health') return json({ ok: true, data: data.version, writers: models(env), fallback: 'plain', key: Boolean(env.GEMINI_API_KEY) }, 200, origin);
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
    const errors = [], deadline = Date.now() + BUDGET;
    const plain = checked => json({ text: plainAnswer(engine, ans), sources: src, mode: 'plain', ...(checked ? { checked } : {}), notes: errors, ...meta }, 200, origin);
    try {
      const base = userPrompt(q, history, pack);
      let { text, by } = await write(env, SYSTEM, base, errors, deadline);
      let bad = checkFacts(text, pack, q, ans);
      if (bad.length) {
        try {
          ({ text, by } = await write(env, SYSTEM, base + `\n\n[고쳐 쓰기]\n앞 답변에 근거에 없는 내용이 있었다: ${bad.join(', ')}. 근거에 있는 사실만으로 다시 써라.`, errors, deadline));
          bad = checkFacts(text, pack, q, ans);
        } catch { /* 고쳐 쓰기 실패: 아래에서 간단 모드 */ }
      }
      bad = [...bad, ...sanityIssues(text)];
      if (!text || bad.length) return plain(bad);
      return json({ text, sources: src, mode: 'generated', by, notes: errors, ...meta }, 200, origin);
    } catch (e) {
      return plain();
    }
  },
};
