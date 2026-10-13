// 거누 Worker 끝단 시험: Gemini 응답을 흉내 내어 깨진 글·503·시간 초과에서 간단 모드로 떨어지는지 본다.
//   node rag/tools/test-worker.mjs        (python3 필요: Worker를 한 파일로 묶어서 불러온다)
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const H = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'geonu-')), 'worker.mjs');
execFileSync('python3', [path.join(H, 'bundle_worker.py'), out], { stdio: 'ignore' });
const worker = (await import(pathToFileURL(out).href)).default;

const gem = text => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }), { status: 200 });
let script = [], calls = [];
globalThis.fetch = async (url, init) => {
  calls.push(String(url).match(/models\/([^:]+)/)?.[1]);
  const step = script.shift();
  if (step === 'hang') return new Promise((_, rej) => init.signal.addEventListener('abort', () => rej(Object.assign(new Error('aborted'), { name: 'AbortError' }))));
  if (typeof step === 'number') return new Response('{}', { status: step });
  return gem(step ?? '');
};
let ip = 0;
async function ask(q, steps, env = {}) {
  script = [...steps]; calls = [];
  const r = await worker.fetch(new Request('https://w.example/chat', { method: 'POST', headers: { Origin: 'https://geonu.site', 'Content-Type': 'application/json', 'CF-Connecting-IP': `10.0.0.${++ip}` }, body: JSON.stringify({ q }) }),
    { GEMINI_API_KEY: 'test', GEMINI_MODELS: 'gemini-a,gemini-b', ...env });
  return { ...(await r.json()), calls };
}
const BROAD = '이건우는 어떤 프로젝트를 했나요?';
const GOOD = '건우는 공개한 프로젝트가 5개예요. Mealplanning은 5인 팀 서비스이고, 나머지는 RAG Retrieval PoC, 디딤, Kubernetes Multi-node Lab, Infrastructure Lab Series예요.';
const BANG = '!'.repeat(700);
let n = 0; const t = async (name, fn) => { await fn(); n++; console.log('  ok', name); };

await t('2026-10-14 사례: 503 뒤 \'!\' 700개 → 간단 모드(프로젝트 5개 목록과 링크 5개)', async () => {
  const r = await ask(BROAD, [503, BANG]);
  assert.equal(r.mode, 'plain'); assert.equal(r.claim, 'C-PROJECTS');
  for (const p of ['Mealplanning', 'RAG Retrieval PoC', '디딤', 'Kubernetes Multi-node Lab', 'Infrastructure Lab Series']) assert.ok(r.text.includes(p), p);
  assert.equal(r.sources.length, 5); assert.ok(!/!{8}/.test(r.text));
  assert.deepEqual(r.calls, ['gemini-a', 'gemini-b']);
});
await t('첫 답이 깨진 글이면 다음 모델로 한 번 더 → 정상이면 생성 답', async () => {
  const r = await ask(BROAD, [BANG, GOOD]);
  assert.equal(r.mode, 'generated'); assert.equal(r.by, 'gemini-b'); assert.equal(r.text, GOOD);
  assert.ok(r.notes.some(x => x.includes('출력 이상')));
});
await t('503 뒤 정상 → 생성 답(다시 부르기는 한 번뿐)', async () => {
  const r = await ask(BROAD, [503, GOOD]);
  assert.equal(r.mode, 'generated'); assert.deepEqual(r.calls, ['gemini-a', 'gemini-b']);
});
await t('두 번 다 실패(503·빈 답) → 간단 모드, 세 번째 호출 없음', async () => {
  const r = await ask(BROAD, [503, '', GOOD]);
  assert.equal(r.mode, 'plain'); assert.equal(r.calls.length, 2);
});
await t('같은 구절 반복 → 간단 모드', async () => {
  const loop = '건우는 '.repeat(40);
  const r = await ask('Mealplanning에서 맡은 역할은 무엇인가요?', [loop, loop]);
  assert.equal(r.mode, 'plain');
});
await t('모델이 하나면 같은 모델로 한 번 더', async () => {
  const r = await ask(BROAD, [503, GOOD], { GEMINI_MODELS: 'gemini-a' });
  assert.equal(r.mode, 'generated'); assert.deepEqual(r.calls, ['gemini-a', 'gemini-a']);
});
await t('키가 없으면 모델을 부르지 않고 간단 모드', async () => {
  const r = await ask(BROAD, [GOOD], { GEMINI_API_KEY: '' });
  assert.equal(r.mode, 'plain'); assert.equal(r.calls.length, 0);
});
await t('거절 질문은 모델을 부르지 않음', async () => {
  const r = await ask('희망 연봉이 얼마인가요?', [GOOD]);
  assert.equal(r.mode, 'refuse'); assert.equal(r.calls.length, 0);
});
await t('시간 초과 두 번 → 간단 모드(전체 18초 안)', async () => {
  const t0 = Date.now(); const r = await ask(BROAD, ['hang', 'hang']);
  assert.equal(r.mode, 'plain'); assert.ok(Date.now() - t0 < 18500, `${Date.now() - t0}ms`);
  assert.ok(r.notes.some(x => x.includes('timeout')));
});
await t('health에 Workers AI 대체 작성이 없음', async () => {
  const r = await (await worker.fetch(new Request('https://w.example/health'), { GEMINI_API_KEY: 'x', GEMINI_MODELS: 'gemini-a,gemini-b' })).json();
  assert.deepEqual(r.writers, ['gemini-a', 'gemini-b']); assert.equal(r.fallback, 'plain');
});
console.log(`Worker 시험 ${n}개 통과`);
