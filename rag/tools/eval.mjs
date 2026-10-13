// 거누 엔진 평가: PoC 평가 세트(dev60 + holdout v1 40)와 배포 점검 15문항.
// PoC 정답 chunk id는 옛 사이트 기준이라, 옛 chunk 글자와 가장 많이 겹치는 지금 chunk로 옮겨 채점한다.
//   node rag/tools/eval.mjs [--fails]
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
import { Engine } from '../engine.js';
const H = path.dirname(fileURLToPath(import.meta.url));
const read = p => fs.readFileSync(path.join(H, p), 'utf8');
const jsonl = s => s.trim().split('\n').map(JSON.parse);
const chunks = jsonl(read('../data/chunks.jsonl')), cards = JSON.parse(read('../data/claims.json')).cards;
const old = jsonl(read('poc/chunks_frozen_v2.jsonl'));
const e = new Engine({ chunks, cards }, { chat: !process.argv.includes('--poc') });

const grams = t => { const s = t.replace(/\s+/g, ''), g = new Set(); for (let i = 0; i + 4 <= s.length; i++) g.add(s.slice(i, i + 4)); return g; };
const newG = chunks.map(c => [c.chunk_id.split('#')[0], grams(c.text)]);
const remap = new Map();
for (const o of old) {
  const og = grams(o.text); if (!og.size) continue;
  const score = new Map();
  for (const [id, g] of newG) { let n = 0; for (const x of og) if (g.has(x)) n++; score.set(id, Math.max(score.get(id) || 0, n / og.size)); }
  const best = [...score].sort((a, b) => b[1] - a[1]);
  const keep = best.filter(([, s], i) => (i === 0 && s >= 0.3) || s >= 0.5).map(([id]) => id);
  remap.set(o.chunk_id, keep);
}
const gold = ids => new Set(ids.flatMap(i => remap.get(i) || remap.get(i.split('#')[0]) || []));
const sets = [['dev60', JSON.parse(read('poc/golden_dev60.json'))], ['holdout-v1-40', JSON.parse(read('poc/holdout_v1_40.json'))]];
const rows = [];
for (const [set, qs] of sets) for (const g of qs) {
  const ctx = e.context(g.question), ans = e.answer(g.question);
  const gs = gold(g.gold_chunk_ids), top = ctx.hits.map(h => h[0]);
  const cited = new Set(ans.evidence.map(x => x.chunk_id.split('#')[0]));
  rows.push({ set, ...g, gs, top, r3: gs.size > 0 && top.slice(0, 3).some(t => gs.has(t)), unmapped: g.gold_chunk_ids.length > 0 && gs.size === 0,
    decision: ans.decision, reason: ans.reason, gov: ctx.gov, claims: ctx.claims.map(c => c[0]), cited_gold: [...cited].some(c => gs.has(c)) });
}
const ans = rows.filter(r => r.type !== 'no_context'), noc = rows.filter(r => r.type === 'no_context');
const answered = ans.filter(r => r.decision === 'answer'), scored = answered.filter(r => !r.unmapped);
const nb = ans.filter(r => ['negative', 'adversarial'].includes(r.type));
const bc = nb.filter(r => r.claims.slice(0, 2).includes(r.claim_id) && r.decision === 'answer').length;
const fq = ans.filter(r => ['factual', 'paraphrase'].includes(r.type) && !r.unmapped);
console.log(`PoC 평가 세트 ${rows.length}문항 (정답 chunk를 옮기지 못한 문항 ${rows.filter(r => r.unmapped).length}개는 인용 채점에서 뺌)`);
console.log(`  no_context 정상 거절            ${noc.filter(r => r.decision === 'refuse').length}/${noc.length}`);
console.log(`  answerable 정상 답변            ${answered.length}/${ans.length}  (과잉 거절 ${ans.length - answered.length})`);
console.log(`  citation_correctness_answered  ${(scored.filter(r => r.cited_gold).length / scored.length).toFixed(3)}  (${scored.filter(r => r.cited_gold).length}/${scored.length})`);
console.log(`  boundary coverage (neg+adv)    ${bc}/${nb.length}`);
console.log(`  factual/paraphrase R@3         ${(fq.filter(r => r.r3).length / fq.length).toFixed(3)}  (${fq.filter(r => r.r3).length}/${fq.length})`);
console.log(`  no_context 오지배               ${noc.filter(r => r.gov && r.gov !== 'C-OUT-OF-SCOPE').length}`);
const dep = JSON.parse(read('poc/deploy_checks.json'));
let ok = 0; const dfail = [];
for (const d of dep) { const a = e.answer(d.question); const good = a.decision === d.expect && (d.expect === 'refuse' || !d.claim_id || (a.constraint && a.constraint.claim_id === d.claim_id)); if (good) ok++; else dfail.push([d.qid, d.question, a.decision, a.reason, a.constraint?.claim_id]); }
console.log(`배포 점검 ${ok}/${dep.length}`);
if (process.argv.includes('--fails')) {
  for (const r of rows) { const bad = r.type === 'no_context' ? r.decision === 'answer' : (r.decision === 'refuse' || (!r.unmapped && !r.cited_gold)); if (bad) console.log(`  [${r.set} ${r.qid}/${r.type}] ${r.decision} ${r.reason} gov=${r.gov} cited_gold=${r.cited_gold} | ${r.question}`); }
  for (const r of fq) if (!r.r3) console.log(`  [R@3 miss ${r.qid}] ${r.question} gold=${[...r.gs]} top3=${r.top.slice(0,3)}`);
  for (const f of dfail) console.log('  [deploy]', ...f);
}
