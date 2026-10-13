/* 연락하기 → Slack 전달(Cloudflare Worker).
 * WSL contact-relay(server.py, 2026-09-19 로컬 전송 확인)의 검증 규칙과 메시지 형식을 그대로 옮겼다.
 * 비밀값: SLACK_WEBHOOK_URL (Worker secret). 문의 내용은 Slack으로만 보내고 여기서는 저장·로그하지 않는다. */
const ORIGINS = new Set(['https://geonu.site', 'https://www.geonu.site', 'https://ge-onu.github.io']);

function cors(origin) {
  return { ...(ORIGINS.has(origin) ? { 'Access-Control-Allow-Origin': origin } : {}), 'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Cache-Control': 'no-store' };
}
const reply = (status, body, origin) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...cors(origin) } });

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\*/g, '∗').replace(/_/g, '＿').replace(/~/g, '～').replace(/`/g, 'ˋ');
function payload(data) {
  if (!data || typeof data !== 'object') throw new Error('invalid');
  const f = {};
  for (const [key, limit] of [['name', 80], ['email', 200], ['message', 3000]]) {
    const v = data[key];
    if (typeof v !== 'string' || !v.trim() || v.length > limit) throw new Error('invalid');
    f[key] = v.trim();
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) throw new Error('invalid email');
  const page = typeof data.page === 'string' ? data.page.slice(0, 120).replace(/[^\w\-./#가-힣]/g, '') : '';
  return {
    text: `[${f.name}] (${f.email})\n\n${f.message}`,
    blocks: [
      { type: 'section', text: { type: 'mrkdwn', text: `👤 *[${esc(f.name)}]*`, verbatim: true } },
      { type: 'context', elements: [{ type: 'plain_text', text: '✉️ ' + f.email }] },
      { type: 'divider' },
      { type: 'context', elements: [{ type: 'plain_text', text: '💬 문의내용' + (page ? ` · geonu.site${page}` : '') }] },
      { type: 'section', text: { type: 'plain_text', text: f.message } },
    ],
  };
}

async function limited(env, ip) {
  // IP별 분당 3회, 전체 분당 5회(WSL 중계와 같은 전체 한도).
  for (const [b, key] of [[env.RL_IP, ip], [env.RL_ALL, 'all']]) if (b) { const { success } = await b.limit({ key }); if (!success) return true; }
  return false;
}

export default {
  async fetch(req, env) {
    const origin = req.headers.get('Origin') || '';
    const url = new URL(req.url);
    if (req.method === 'GET' && url.pathname === '/health') return reply(200, { ok: Boolean(env.SLACK_WEBHOOK_URL) }, origin);
    if (url.pathname !== '/contact') return reply(404, { ok: false }, origin);
    if (req.method === 'OPTIONS') return new Response(null, { status: ORIGINS.has(origin) ? 204 : 403, headers: cors(origin) });
    if (req.method !== 'POST') return reply(405, { ok: false }, origin);
    if (!ORIGINS.has(origin)) return reply(403, { ok: false }, origin);
    if (!(req.headers.get('Content-Type') || '').startsWith('application/json')) return reply(415, { ok: false }, origin);
    const raw = await req.text();
    if (!raw.length || raw.length > 20000) return reply(413, { ok: false }, origin);
    let data, body;
    try { data = JSON.parse(raw); body = payload(data); } catch { return reply(400, { ok: false }, origin); }
    if (typeof data.website === 'string' && data.website.trim()) return reply(200, { ok: true }, origin); // 자동 입력 봇(숨김 칸) — 보낸 척만 한다
    if (await limited(env, req.headers.get('CF-Connecting-IP') || 'x')) return reply(429, { ok: false }, origin);
    try {
      const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 8000);
      const r = await fetch(env.SLACK_WEBHOOK_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctl.signal });
      clearTimeout(t);
      const ok = r.status === 200 && (await r.text()).trim() === 'ok';
      return reply(ok ? 200 : 502, { ok }, origin);
    } catch { return reply(502, { ok: false }, origin); } // 웹후크 주소가 오류 문자열로 새지 않게 한다
  },
};
