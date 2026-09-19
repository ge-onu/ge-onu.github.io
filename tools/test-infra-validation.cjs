/* infra-validation.js 상태 분기 검증.
 *
 * 이 스크립트가 지키는 것은 "표시가 예쁜가"가 아니라 **claim 안전성**이다.
 * infra-validation.js는 Infrastructure Lab Series 페이지에서 개인 검증 상태를
 * 승격하는 유일한 스위치이므로, 다음이 깨지면 공개 claim이 근거보다 강해진다.
 *
 *   1) 기본 상태는 가장 보수적인 'current'다.
 *   2) 공개 호스트에서는 ?infra-preview= 로 상태를 올릴 수 없다.
 *   3) 어떤 상태에서도 "Agent 구축을 개인 수행으로 바꾸지 않는다"는 경계 문구가 남는다.
 *
 * 실행: node tools/test-infra-validation.cjs
 */
'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

const SRC = path.join(__dirname, '..', 'infra-validation.js');
const code = fs.readFileSync(SRC, 'utf8');

/** 최소 DOM 스텁. 실제 렌더링이 아니라 스크립트가 읽고 쓰는 지점만 흉내 낸다. */
function run({ hostname, search = '', copyKeys = [] }) {
  const nodes = copyKeys.map(k => ({ dataset: { infraCopy: k }, textContent: null }));
  const created = [];
  const head = [];
  const mainPrepended = [];
  const document = {
    querySelectorAll(sel) {
      if (sel === '[data-infra-copy]') return nodes;
      if (sel === 'a[href]') return [];
      return [];
    },
    querySelector(sel) {
      if (sel === 'main') return { prepend: n => mainPrepended.push(n) };
      return null;
    },
    createElement(tag) { const el = { tag, dataset: {} }; created.push(el); return el; },
    documentElement: { dataset: {} },
    head: { append: n => head.push(n) },
  };
  const location = { hostname, search, origin: `https://${hostname}` };
  const sandbox = { document, location, URL, URLSearchParams, console };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: SRC });
  const copy = {};
  nodes.forEach(n => { copy[n.dataset.infraCopy] = n.textContent; });
  return { copy, state: document.documentElement.dataset.infraState, created, head, mainPrepended };
}

const KEYS = ['status', 'gateA', 'gateB', 'gateC', 'lab', 'eligible', 'card', 'hero', 'boundary'];
let pass = 0, fail = 0;
function check(name, fn) {
  try { fn(); console.log(`  PASS  ${name}`); pass++; }
  catch (e) { console.log(`  FAIL  ${name}\n        ${e.message}`); fail++; }
}

console.log('infra-validation.js 상태 분기 검증\n');

check('기본 상태는 current (가장 보수적)', () => {
  const r = run({ hostname: 'geonu.site', copyKeys: KEYS });
  assert.strictEqual(r.state, 'current');
  assert.strictEqual(r.copy.status, '사용자 검증 대기');
  assert.strictEqual(r.copy.gateA, '대기');
  assert.strictEqual(r.copy.gateB, '대기');
  assert.strictEqual(r.copy.gateC, '대기');
});

check('공개 호스트에서 ?infra-preview=all-passed 는 무시된다', () => {
  const r = run({ hostname: 'geonu.site', search: '?infra-preview=all-passed', copyKeys: KEYS });
  assert.strictEqual(r.state, 'current', 'URL 조작으로 Gate 상태를 위조할 수 있으면 안 된다');
  assert.strictEqual(r.copy.gateC, '대기');
  assert.strictEqual(r.head.length, 0, '공개 호스트에 noindex 를 넣지 않는다');
  assert.strictEqual(r.mainPrepended.length, 0, '공개 호스트에 목업 배너를 넣지 않는다');
});

check('공개 호스트에서 gate-b 미리보기도 무시된다', () => {
  const r = run({ hostname: 'www.geonu.site', search: '?infra-preview=gate-b', copyKeys: KEYS });
  assert.strictEqual(r.state, 'current');
});

check('localhost 에서만 미리보기가 동작한다', () => {
  const r = run({ hostname: 'localhost', search: '?infra-preview=all-passed', copyKeys: KEYS });
  assert.strictEqual(r.state, 'all-passed');
  assert.strictEqual(r.copy.gateC, '통과');
  assert.strictEqual(r.copy.status, '사용자 검증 완료');
});

check('미리보기는 noindex 와 목업 배너를 함께 넣는다', () => {
  const r = run({ hostname: 'localhost', search: '?infra-preview=gate-a', copyKeys: KEYS });
  const robots = r.head.find(n => n.name === 'robots');
  assert.ok(robots, 'robots meta 가 없다');
  assert.match(robots.content, /noindex/);
  assert.strictEqual(r.mainPrepended.length, 1, '목업 배너가 없다');
  assert.match(r.mainPrepended[0].textContent, /실제 Gate 통과를 뜻하지 않습니다/);
});

check('알 수 없는 preview 값은 무시된다', () => {
  const r = run({ hostname: 'localhost', search: '?infra-preview=완료', copyKeys: KEYS });
  assert.strictEqual(r.state, 'current');
});

check('Gate 단계가 순서대로 올라간다', () => {
  const expect = {
    'current':    ['대기', '대기', '대기'],
    'gate-a':     ['통과', '대기', '대기'],
    'gate-b':     ['통과', '통과', '대기'],
    'all-passed': ['통과', '통과', '통과'],
  };
  for (const [stage, want] of Object.entries(expect)) {
    const r = run({ hostname: 'localhost', search: `?infra-preview=${stage}`, copyKeys: KEYS });
    assert.deepStrictEqual([r.copy.gateA, r.copy.gateB, r.copy.gateC], want, `${stage} 단계가 어긋난다`);
  }
});

check('모든 상태에서 claim 경계 문구가 유지된다', () => {
  for (const stage of ['current', 'gate-a', 'gate-b', 'all-passed']) {
    const r = run({ hostname: 'localhost', search: `?infra-preview=${stage}`, copyKeys: KEYS });
    assert.match(
      r.copy.boundary,
      /개인 수행(으로|_)?|바꾸지 않습니다/,
      `${stage}: boundary 문구에 상한 표현이 없다`);
    assert.ok(/바꾸지 않습니다/.test(r.copy.boundary),
      `${stage}: "바꾸지 않습니다" 상한이 사라졌다 — Agent 구축이 개인 수행으로 승격될 수 있다`);
  }
});

check('최상위 상태에서도 초기 구축을 개인 수행으로 바꾸지 않는다', () => {
  const r = run({ hostname: 'localhost', search: '?infra-preview=all-passed', copyKeys: KEYS });
  assert.match(r.copy.boundary, /초기 구축 전체를 개인 수행으로 바꾸지 않습니다/);
});

console.log(`\n  ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
