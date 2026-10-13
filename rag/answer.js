/* 거누 답변 조립 — 엔진 판정(engine.js)을 받아 거절 문장, 근거 묶음, 생성 프롬프트, 사실 검사, 생성 없는 답을 만든다.
 * Worker(생성 포함)와 브라우저(Worker가 안 될 때의 간단 모드)가 같이 쓴다. */

const SITE = 'https://geonu.site';

// 이어 묻기("그건 혼자 했어요?", "왜요?")만 직전 질문과 합쳐 검색한다. 새 질문은 그대로 검색해야
// 앞 질문의 주제가 거절 판단을 흐리지 않는다.
const FOLLOW = /^(그|그건|그거|그게|그걸|그럼|그러면|그래서|그때|거기|거기서|이건|이거|저건|왜|어떻게요|어째서|그\s)/;
export function retrievalQuery(q, history = []) {
  const prev = [...history].reverse().find(m => m.role === 'user');
  return prev && FOLLOW.test(q.trim()) ? `${prev.text} ${q}` : q;
}

// chunk → 사이트 주소. id가 실제 요소 id인 경우에만 #를 붙인다.
const ANCHORABLE = /^(inc-|ev-|a\d-|b\d-|c\d-|d\d-|k8s-|lab-)|^(summary|ai-role|boundary|limits|learned|record|work|strengths|incidents|focus|collab|about|contact|question|failure|measurement|sources|scope|build|mail|graft|audit|ops|overview|architecture|learning-map|failure-patterns|limitations|story|stack|migrate|isolation|geonu|cka-prep)$/;
export function sourceOf(c) {
  const p = c.source_path;
  let url = p === 'index.html' ? '/' : '/' + p.replace(/index\.html$/, '');
  if (ANCHORABLE.test(c.section)) url += '#' + c.section;
  const page = p === 'index.html' ? '홈' : p.startsWith('assets/evidence/') ? '근거 문서' :
    ({ mealplanning: 'Mealplanning', 'kubernetes-lab': 'Kubernetes Lab', 'infrastructure-lab-series': 'Infrastructure Lab', 'rag-retrieval-poc': 'RAG PoC', didim: '디딤돌' })[p.split('/')[1]] || c.doc_title;
  const title = (c.section_title && !/^(문제 상황|문제)$/.test(c.section_title) ? c.section_title : c.text.split('\n')[0]).replace(/\s+/g, ' ').slice(0, 40);
  return { url, label: `${page} · ${title}` };
}

export function sources(engine, ans, n = 3) {
  // 프로젝트 목록 카드처럼 링크 목록을 가진 카드는 그 링크를 그대로 근거로 붙인다.
  const card = ans.constraint && engine.router?.byId?.[ans.constraint.claim_id];
  if (card?.links?.length) return card.links.map(l => ({ url: l.url, label: l.label }));
  const seen = new Set(), out = [];
  for (const e of ans.evidence) {
    const c = engine.byId[e.chunk_id]; if (!c) continue;
    const s = sourceOf(c); if (seen.has(s.url)) continue; seen.add(s.url); out.push(s);
    if (out.length >= n) break;
  }
  return out;
}

// 생성 모델에 넘길 근거. 카드(확인 범위)가 있으면 맨 앞에 둔다.
export function evidencePack(engine, ans, limit = 4200) {
  const parts = [];
  for (const e of ans.evidence) {
    const c = engine.byId[e.chunk_id]; if (!c) continue;
    parts.push(`[${sourceOf(c).label}]\n${c.text}`);
  }
  let text = parts.join('\n\n');
  if (text.length > limit) text = text.slice(0, limit);
  const k = ans.constraint;
  const scope = k ? `확인된 것: ${k.verified}\n확인되지 않은 것: ${k.not_verified}\n기여 범위: ${k.ownership}\n하면 안 되는 표현: ${k.forbidden.join(' / ')}` : '';
  return { text, scope };
}

export const SYSTEM = [
  '너는 "거누"다. 이건우(건우)의 포트폴리오 사이트 geonu.site에 공개된 기록을 검색해서 답하는 RAG 챗봇이다.',
  '규칙:',
  '1. [근거]와 [확인 범위]에 적힌 사실만 쓴다. 근거에 없는 숫자, 기술 이름, 회사, 경험, 날짜를 만들지 않는다.',
  '2. [확인 범위]의 "하면 안 되는 표현"에 해당하는 주장은 하지 않는다. "확인되지 않은 것"이 질문과 관련 있으면 분명히 말한다.',
  '3. 건우를 3인칭("건우는", "건우가")으로 말한다. 팀이 한 일과 건우가 한 일을 섞지 않는다.',
  '4. 말투는 해요체로 통일한다("~했어요", "~이에요"). "~했습니다" 같은 합니다체는 쓰지 않는다. 2~5문장, 필요할 때만 짧은 목록. 제목, 표, 이모지는 쓰지 않는다.',
  '5. 질문이 근거에 없는 내용까지 물을 때만, 아는 범위를 말한 뒤 "포트폴리오 기록에는 그 이상 내용이 없어요"라고 덧붙인다. 근거로 충분히 답했으면 덧붙이지 않는다.',
  '6. 첫 문장에서 질문에 바로 답한다. "건우는 ~"으로 시작해도 좋다.',
  '7. 출처는 화면이 따로 붙이므로 본문에 URL이나 "(출처: …)" 같은 표기를 쓰지 않는다.',
].join('\n');

export function userPrompt(q, history, pack) {
  const h = history.slice(-4).map(m => `${m.role === 'user' ? '질문' : '거누'}: ${m.text}`).join('\n');
  return `${h ? `[이전 대화]\n${h}\n\n` : ''}${pack.scope ? `[확인 범위]\n${pack.scope}\n\n` : ''}[근거]\n${pack.text}\n\n[질문]\n${q}`;
}

// 사실 검사: 숫자와 영문 기술명은 근거·확인 범위·질문에 있어야 하고, 금지 표현은 없어야 한다.
const norm = s => s.toLowerCase().replace(/(\d),(?=\d{3})/g, '$1').replace(/\s+/g, ' ');
export function checkFacts(answer, pack, q, ans) {
  const hay = norm(`${pack.text}\n${pack.scope}\n${q}`);
  const a = norm(answer), bad = [];
  for (const m of a.matchAll(/\d+(?:\.\d+)?/g)) {
    const n = m[0];
    if (n.length === 1 && !/[%건종회개장명초원배]/.test(a[m.index + 1] || '')) continue; // "1. 2." 같은 목록 번호
    if (!new RegExp(`(^|[^0-9.])${n.replace('.', '\\.')}($|[^0-9])`).test(hay)) bad.push(`숫자 ${n}`);
  }
  for (const m of answer.matchAll(/[A-Za-z][A-Za-z0-9.+#/-]{1,}/g)) {
    const w = m[0].replace(/[.]+$/, '').toLowerCase();
    if (w.length < 2 || ['geonu', 'rag', 'ai'].includes(w)) continue;
    if (!hay.includes(w)) bad.push(`표현 ${m[0]}`);
  }
  for (const f of ans.constraint?.forbidden || []) if (f.length >= 4 && a.includes(norm(f))) bad.push(`금지 표현 ${f}`);
  return [...new Set(bad)];
}

// 출력 정상성 검사: 사실 검사는 숫자·기술명·금지 표현만 보므로, 깨진 글은 그대로 통과한다.
// 2026-10-14 실제 사례: Gemini 503 뒤 대체 모델이 '!'만 700여 개 돌려줬는데 사실 검사를 통과해 그대로 나갔다.
// 하나라도 걸리면 생성 결과를 버리고 근거 문장으로 답한다. 빈 배열이면 정상.
export function sanityIssues(text) {
  const t = String(text || '').trim();
  const chars = [...t.replace(/\s+/g, '')], n = chars.length;
  const count = re => chars.filter(c => re.test(c)).length;
  const hangul = count(/[가-힣]/), latin = count(/[A-Za-z]/), digit = count(/[0-9]/);
  const out = [];
  if (n < 20) out.push(`너무 짧음(${n}자)`);
  if (hangul + latin < 15) out.push(`글자가 거의 없음(${hangul + latin}자)`);
  if (n && (hangul + latin) / n < 0.5) out.push(`글자 비율 낮음(${Math.round((hangul + latin) / n * 100)}%)`);
  if (n && (n - hangul - latin - digit) / n > 0.3) out.push(`기호 비율 높음(${Math.round((n - hangul - latin - digit) / n * 100)}%)`);
  const run = t.match(/(\S)\1{7,}/u);
  if (run) out.push(`같은 글자 ${run[0].length}번 연속(${run[1]})`);
  const tally = new Map(); for (const c of chars) if (!/[가-힣A-Za-z0-9]/.test(c)) tally.set(c, (tally.get(c) || 0) + 1);
  for (const [c, k] of tally) if (k > 40) out.push(`같은 기호 ${k}번(${c})`);
  if (!run && /(\S[\s\S]{1,29}?)\1{4,}/u.test(t)) out.push('같은 구절 반복');
  return out;
}

// 생성 없이 만드는 답(Worker를 못 쓸 때, 또는 생성 결과가 사실 검사·정상성 검사를 못 넘었을 때).
export function plainAnswer(engine, ans) {
  const k = ans.constraint;
  if (k) return `${k.verified}${k.not_verified ? `\n다만 ${k.not_verified}` : ''}`;
  const c = engine.byId[ans.evidence[0]?.chunk_id];
  if (!c) return '포트폴리오 기록에서 이 질문에 맞는 근거를 찾지 못했어요.';
  const lines = c.text.split('\n').filter(l => l.length > 18 && /[다요]\.?$/.test(l)).slice(0, 3);
  return `가장 가까운 기록은 "${sourceOf(c).label}"이에요.\n${(lines.length ? lines : [c.text.slice(0, 220)]).join('\n')}`;
}

export function refusalText(ans) {
  if (ans.reason === 'out_of_scope_policy') return '그건 건우가 포트폴리오에 공개한 내용이 아니라서 답할 수 없어요. 저는 geonu.site에 공개된 기록만 근거로 답하는 RAG 챗봇이에요. 따로 궁금한 점은 상단 "연락하기"로 남겨 주세요.';
  const m = ans.reason.match(/no_topic_support=\[(.*)\]/);
  if (m) { const all = m[1].replace(/'/g, '').split(', '), lat = all.filter(x => /[a-z]/.test(x)); const t = (lat.length ? lat : all.slice(0, 1)).join(', '); return `포트폴리오 기록에는 ${t}에 대한 경험이 없어요. 기록에 없는 경험은 있다고도 없다고도 추측하지 않아요. 궁금하시면 "연락하기"로 직접 물어봐 주세요.`; }
  if (ans.reason === 'ownership_unattributed') return '누가 그 일을 했는지는 공개된 기록으로 확인되지 않아요. 확인되지 않은 기여는 건우의 것이라고 말하지 않아요.';
  return '포트폴리오 기록에서 답할 근거를 찾지 못했어요.';
}

export { SITE };
