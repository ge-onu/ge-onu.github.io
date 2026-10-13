/* 거누 RAG 엔진 — infra-aiops-career-hub experiments/rag-retrieval-poc 의 FROZEN_V2 파이프라인을
 * JavaScript로 옮긴 것이다(pipeline_v2.py · pipeline.py · bm25_eval.py · registry.py).
 * 브라우저와 Cloudflare Worker가 같은 파일을 쓴다. 외부 의존성 없음 · 결정적.
 * 규칙과 상수는 Python 원본과 같게 둔다. 바꾸면 parity 테스트(rag/tools/parity)가 깨진다. */

// ── bm25_eval.py ─────────────────────────────────────────────────────────────
const HANGUL = /[가-힣]+/g;
const LATIN = /[a-z0-9][a-z0-9._/\-]*/gi;
const SUFFIX = ['으로는','에서는','에게서','으로써','이라는','까지도','만으로','에서도','으로','에서','에게','부터','까지','보다','처럼','에는','과의','와의','이나','거나','라고','이라','하고','한다','했다','합니다','했습니다','입니다','이다','인가','인지','나요','가요','했나','한가',
  '은','는','이','가','을','를','의','에','와','과','도','만','로','랑','다','고','며','서','야'];
const STOP = new Set(['그리고','그런데','하지만','또는','대해','대한','무엇','어떤','어떻게','어디','언제','있나요','있습니까','알려','주세요','설명','해주세요','인가요','했나요','뭔가요','정말','바로','다시','좀','좀더','수','것','저','제','이','그']);
const isDigits = t => t.length > 0 && /^[0-9]+$/.test(t);
const stripChars = (t, chars) => { let a = 0, b = t.length; while (a < b && chars.includes(t[a])) a++; while (b > a && chars.includes(t[b - 1])) b--; return t.slice(a, b); };

function stripSuffix(tok) {
  for (const s of SUFFIX) if (tok.length > s.length + 1 && tok.endsWith(s)) return tok.slice(0, -s.length);
  return tok;
}

export function tokenize(text) {
  text = text.toLowerCase();
  const out = [];
  for (const m of text.matchAll(LATIN)) {
    const t = stripChars(m[0], '._-/');
    if ((t && !isDigits(t)) || (isDigits(t) && t.length >= 2)) out.push(t);
  }
  for (const m of text.matchAll(HANGUL)) {
    const run = m[0];
    if (STOP.has(run)) continue;
    out.push(run);
    const st = stripSuffix(run);
    if (st !== run && st.length >= 2) out.push(st);
    for (let i = 0; i < run.length - 1; i++) out.push(run.slice(i, i + 2));
  }
  for (const m of text.matchAll(/\d+\s*\/\s*\d+|\d{1,3}(?:,\d{3})+/g)) out.push(m[0].replace(/\s+/g, ''));
  return out;
}

export class BM25 {
  constructor(docs, k1 = 1.2, b = 0.6) {
    this.k1 = k1; this.b = b; this.N = docs.length;
    this.len = docs.map(d => d.length);
    this.avg = this.len.reduce((x, y) => x + y, 0) / Math.max(this.N, 1);
    this.tf = docs.map(d => { const c = new Map(); for (const t of d) c.set(t, (c.get(t) || 0) + 1); return c; });
    const df = new Map();
    for (const d of docs) for (const t of new Set(d)) df.set(t, (df.get(t) || 0) + 1);
    this.idf = new Map();
    for (const [t, n] of df) this.idf.set(t, Math.log(1 + (this.N - n + 0.5) / (n + 0.5)));
  }
  score(q) {
    const s = new Array(this.N).fill(0);
    const qc = new Map(); for (const t of q) qc.set(t, (qc.get(t) || 0) + 1);
    for (const [term, qf] of qc) {
      const idf = this.idf.get(term);
      if (idf === undefined) continue;
      for (let i = 0; i < this.N; i++) {
        const f = this.tf[i].get(term);
        if (!f) continue;
        const denom = f + this.k1 * (1 - this.b + this.b * this.len[i] / this.avg);
        s[i] += idf * (f * (this.k1 + 1) / denom) * (1 + 0.3 * Math.log(1 + qf));
      }
    }
    return s;
  }
}

// ── pipeline.py ──────────────────────────────────────────────────────────────
export const ALIASES = {
  '운영': ['프로덕션', 'production', '실서비스', '상용', '운영환경', '실운영'],
  '배포': ['deploy', '서빙', 'serving', '런칭', '출시'],
  '직접': ['본인', '스스로', '혼자', '자체적', '직접적'],
  '구축': ['구성', '셋업', '설치', '세팅', 'setup'],
  '역할': ['담당', '기여', '맡은', '맡았', '범위'],
  '성과': ['지표', '효과', '개선율', '수치', 'kpi', '메트릭'],
  '평가': ['비교', '벤치마크', 'benchmark', '검증'],
  '문제': ['장애', '이슈', '에러', '오류', '실패', 'incident'],
  '모델': ['llm', '언어모델', 'gpt'],
  '추천': ['랭킹', 'ranking', '개인화', '리랭킹'],
  '클러스터': ['kubernetes', 'k8s', '쿠버네티스', 'eks'],
  '서버리스': ['serverless', 'lambda', '람다'],
  // 배포판 추가: 지금 사이트는 Guardrail을 '응답 검증'으로 부른다. PoC 데이터·문항에는 이 표현이 없어 parity에 영향이 없다.
  '가드레일': ['guardrail', '가드 레일', '응답 검증', '응답검증'],
  '수집': ['크롤', '크롤러', '크롤링', 'crawler', '스크래핑'],
  '데이터흐름': ['데이터 흐름', '파이프라인', '이벤트 흐름', 'dataflow'],
  '인식': ['ocr', '광학문자'],
  '학습': ['훈련', 'training', 'fine-tuning', '파인튜닝'],
};
const ALIAS_HITS = Object.entries(ALIASES).flatMap(([canon, vs]) => [...vs, canon].map(v => [canon, v]));
export function expand(text) { const low = text.toLowerCase(); return ALIAS_HITS.filter(([, v]) => low.includes(v)).map(([c]) => `~${c}`); }
export const toks = text => tokenize(text).concat(expand(text));
export const PRECEDENCE = ['OUT_OF_SCOPE', 'NEGATIVE', 'UNCERTAIN', 'BOUNDED', 'SUPPORTED'];
export const MARGIN = 0.85;
export const PER_DOC = 2;
export const cardText = c => (c.topic + ' ').repeat(2) + c.trigger_terms.join(' ').repeat(2) + ' ' + c.verified + ' ' + c.not_verified + ' ' + c.forbidden.join(' ');
const round3 = x => parseFloat(x.toFixed(3));

// ── registry.py ──────────────────────────────────────────────────────────────
export const GENERIC_TERMS = new Set(['운영','구축','배포','구성','관리','사용','도입','적용','설계','개발','작성',
  '수행','진행','처리','분석','개선','해결','최적화','자동화','테스트','검증',
  '클러스터','노드','파이프라인','인프라','리소스','서비스','환경','플랫폼','시스템',
  '도구','모듈','차트','컨테이너','워크로드','아키텍처','스택','솔루션','기능',
  '데이터','로그','메트릭','지표','성과','비용','경험','사례','이력','업무','실무',
  '프로젝트','팀','담당자','범위','기준','방법','과정','결과','문제','장애','이슈']);
export const CATEGORY_SYNONYMS = {
  'kubernetes': ['오케스트레이션', '컨테이너 오케스트레이션', 'k8s', '쿠버네티스'],
  'serverless': ['서버리스', 'serverless', '람다', 'lambda', 'faas'],
  'ci-cd': ['ci/cd', 'cicd', '지속적 통합', '지속적 배포'],
  'ocr': ['ocr', '광학문자', '문자인식', '영수증 인식'],
  'llm': ['llm', '언어모델', '대규모 언어모델'],
  'crawler': ['크롤러', '크롤링', '스크래핑', 'crawler', '수집기'],
  'ranking': ['랭킹', 'ranking', '개인화 추천', '리랭킹'],
};
// Python의 \b(유니코드 단어 경계)와 같게 맞춘다. JS의 \b는 ASCII 기준이라 한글 옆에서 다르게 동작한다.
const W = '[\\p{L}\\p{N}\\p{M}_]';
const TECH_LATIN = new RegExp(`(?<!${W})[A-Za-z][A-Za-z0-9._\\-/]{1,}(?:(?<=${W})(?!${W})|(?<!${W})(?=${W}))`, 'gu');

function buildRegistry(chunks, cards) {
  const corpus = chunks.map(c => c.text).join(' ').toLowerCase();
  const topics = {};
  for (const c of cards) {
    const t = { topic_id: c.claim_id, specific: new Set(), generic: new Set(), claim_ids: [c.claim_id], evidence_chunk_ids: [...(c.evidence_chunk_ids || [])] };
    for (const raw of c.trigger_terms) { const term = raw.toLowerCase().trim(); (GENERIC_TERMS.has(term) ? t.generic : t.specific).add(term); }
    for (const phrase of c.forbidden || []) {
      for (let w of phrase.toLowerCase().split(/[\s·,()]+/)) {
        w = stripChars(w, '.,·');
        if (!w || GENERIC_TERMS.has(w)) continue;
        if (/^[가-힣]/.test(w)) { if (w.length >= 3) t.specific.add(w); }
        else if (w.length >= 2) t.specific.add(w);
      }
    }
    topics[c.claim_id] = t;
  }
  for (const forms of Object.values(CATEGORY_SYNONYMS))
    for (const t of Object.values(topics)) if (forms.some(f => t.specific.has(f))) forms.forEach(f => t.specific.add(f));
  const named = new Set();
  for (const m of corpus.matchAll(TECH_LATIN)) { const n = m[0].toLowerCase(); if (n.length >= 2 && !GENERIC_TERMS.has(n)) named.add(n); }
  topics._CORPUS_NAMED = { topic_id: '_CORPUS_NAMED', specific: named, generic: new Set(), claim_ids: [], evidence_chunk_ids: [] };
  return topics;
}

// ── pipeline_v2.py ───────────────────────────────────────────────────────────
const ENDINGS = ['했습니까','하셨나요','했었나요','이었나요','했습니다','으로는','에서는','에게서',
  '으로써','이라는','만으로','까지도','인가요','있나요','했나요','였나요','합니까',
  '입니까','하나요','되나요','건가요','주세요','습니까','습니다','나요','가요',
  '시키는','시키던','되었던','하였던','하던','하는','했던','되던','되는','시킨',
  '까요','군요','네요','인가','한가','으로','에서','에게','부터','까지','보다',
  '처럼','에는','과의','와의','이나','거나','라고','이라','하고','한다','했다',
  '에도','에만','인','은','는','이','가','을','를','의','에','와','과','도',
  '만','로','랑','다','고','며','서','야','들','한','된','될','할'];
const SCAFFOLD = new Set(['무엇','어떤','어떻게','어디','언제','얼마','내용','설명','알려','주세','보여',
  '이것','그것','때문','관련','대해','대한','통해','위해','서로','모두','전체',
  '정말','혹시','다시','아직','이번','현재','지금','직접','본인','스스로',
  '중에','도중','동안','당시','이후','이전','무렵','경우','만큼','뿐']);

export const clean = tok => tok.replace(/^[^가-힣A-Za-z0-9]+|[^가-힣A-Za-z0-9./_\-]+$/g, '').toLowerCase();
export function stem(tok) {
  let t = clean(tok);
  for (let k = 0; k < 3; k++) {
    let hit = false;
    for (const s of ENDINGS) if (t.length > s.length + 1 && t.endsWith(s)) { t = t.slice(0, -s.length); hit = true; break; }
    if (!hit) break;
  }
  return t;
}
const EXPERIENCE = /경험|사례|이력|해\s?본|해\s?봤|다뤄|운영|구축|사용|도입|관리|구성|적용|수행|설계|작성|개발|만든\s?적|맡아|담당/;
const INTERROGATIVE = /있나요|있습니까|있는지|했나요|하셨|였나요|인가요|있었|해봤|보여|알려|가능한가/;
export const isExperienceQuestion = q => EXPERIENCE.test(q) && INTERROGATIVE.test(q);
// 배포판 확장(chat): 채팅 질문은 해요체("써 봤어요?", "있어요?")가 많다. PoC 평가 문항은 합니다체라
// 이 확장 없이도 결과가 같고, parity 테스트는 확장을 끈 상태로 돌린다.
const EXPERIENCE_CHAT = /써\s?봤|써\s?본|다뤄\s?봤|해\s?봤|해\s?본|경험|사용|운영|구축/;
const INTERROGATIVE_CHAT = /봤나요|봤어요|봤어|본\s?적|있어요|있어\?|했어요|하셨어요|해봤어|나요\?|어요\?/;
export const isExperienceChat = q => isExperienceQuestion(q) || (EXPERIENCE_CHAT.test(q) && INTERROGATIVE_CHAT.test(q));
export function subjectSlots(q, chat = false) {
  const parts = q.split(/\s+/).filter(Boolean), out = [];
  parts.forEach((tok, i) => {
    const raw = clean(tok), s = stem(tok);
    if (s.length < 2 || SCAFFOLD.has(s)) return;
    const nxt = i + 1 < parts.length ? stem(parts[i + 1]) : '';
    const instrumental = (raw.endsWith('로') || raw.endsWith('으로')) && raw !== s;
    const basis = nxt.startsWith('기반');
    const bare = raw === s && nxt.length >= 2 && !SCAFFOLD.has(nxt);
    // chat: 한국어 질문 속 영문 단어는 거의 항상 기술 이름이다("Ansible 써 봤어요?").
    const latin = chat && /^[a-z][a-z0-9.+#/-]+$/.test(raw);
    if (instrumental || basis || bare || latin) out.push(s);
  });
  return out;
}
const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\/\-]/g, '\\$&');
function hasForm(text, form) {
  if (/^[a-z0-9]/.test(form)) return new RegExp(`(?<![a-z0-9])${escapeRe(form)}(?![a-z0-9])`).test(text);
  return text.includes(form);
}

class TopicIndex {
  constructor(chunks, cards) {
    this.topics = buildRegistry(chunks, cards);
    this.specific = new Set(); for (const t of Object.values(this.topics)) for (const f of t.specific) this.specific.add(f);
    this.corpus = chunks.map(c => c.text).join(' ').toLowerCase();
    this.claimsBlob = cards.map(cardText).join(' ').toLowerCase();
  }
  supported(term) {
    if (GENERIC_TERMS.has(term) || expand(term).length) return true;
    if (this.specific.has(term)) return true;
    return hasForm(this.corpus, term) || hasForm(this.claimsBlob, term);
  }
  anchors(claimId, q) {
    const t = this.topics[claimId]; if (!t) return [];
    const ql = q.toLowerCase();
    return [...t.specific].filter(f => hasForm(ql, f)).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  }
}

const argsortDesc = sc => sc.map((v, i) => i).sort((a, b) => sc[b] - sc[a]);

class ClaimRouter {
  constructor(cards, topics) {
    this.cards = cards; this.byId = Object.fromEntries(cards.map(c => [c.claim_id, c]));
    this.bm = new BM25(cards.map(c => toks(cardText(c)))); this.ids = cards.map(c => c.claim_id); this.topics = topics;
  }
  rank(q, k = 3) { const sc = this.bm.score(toks(q)); return argsortDesc(sc).slice(0, k).filter(i => sc[i] > 0).map(i => [this.ids[i], round3(sc[i])]); }
  applicable(q) { const got = []; for (const [cid, score] of this.rank(q, this.cards.length)) { const anc = this.topics.anchors(cid, q); if (anc.length) got.push([cid, score, anc]); } return got; }
  route(q) {
    const ranked = this.rank(q), app = this.applicable(q);
    if (!app.length) return [ranked, null, []];
    const top = app[0][1];
    const close = app.filter(a => a[1] >= top * MARGIN);
    let gov = close[0];
    for (const a of close) if (PRECEDENCE.indexOf(this.byId[a[0]].stance) < PRECEDENCE.indexOf(this.byId[gov[0]].stance)) gov = a;
    return [ranked, gov[0], gov[2]];
  }
}

class Retriever {
  constructor(chunks, perDoc = PER_DOC) {
    this.chunks = chunks; this.perDoc = perDoc; this.ids = chunks.map(c => c.chunk_id); this.docs = chunks.map(c => c.doc_id);
    this.bm = new BM25(chunks.map(c => toks((c.section_title + ' ').repeat(2) + c.doc_title + ' ' + c.text)));
  }
  search(q, k = 5) {
    const sc = this.bm.score(toks(q)); const seen = new Set(), per = {}, out = [], spill = [];
    for (const i of argsortDesc(sc)) {
      const b = this.ids[i].split('#')[0]; if (seen.has(b)) continue; seen.add(b);
      const row = [b, this.ids[i], round3(sc[i])];
      if (this.perDoc && (per[this.docs[i]] || 0) >= this.perDoc) { spill.push(row); continue; }
      per[this.docs[i]] = (per[this.docs[i]] || 0) + 1; out.push(row);
      if (out.length >= k) return out;
    }
    return out.concat(spill).slice(0, k);
  }
}

const OWNERSHIP_Q = ['직접', '본인', '스스로', '혼자', '맡', '담당'];
const OWNERSHIP_EV = ['담당 역할', '맡았습니다', '제가', '개인이 직접', '직접 구성', '직접 개선', '구분했습니다', '범위가 아닙니다', '개인 실습', '직접 판단', '기여 범위'];
function ownershipState(q, govCard, hits, byId) {
  if (!OWNERSHIP_Q.some(m => q.includes(m))) return null;
  if (govCard && !['', '-'].includes((govCard.ownership || '').trim())) return 'claim';
  if (hits.length && OWNERSHIP_EV.some(m => byId[hits[0][1]].text.includes(m))) return 'evidence';
  return 'unsupported';
}
const pyList = a => '[' + a.map(x => `'${x}'`).join(', ') + ']';
function refusal(ctx) {
  if (ctx.gov === 'C-OUT-OF-SCOPE') return [true, 'out_of_scope_policy'];
  if (ctx.unsupported_subjects.length) return [true, `no_topic_support=${pyList(ctx.unsupported_subjects)}`];
  if (ctx.ownership === 'unsupported') return [true, 'ownership_unattributed'];
  return [false, 'answerable'];
}

export class Engine {
  constructor({ chunks, cards }, { chat = false } = {}) {
    this.chat = chat; this.chunks = chunks; this.byId = Object.fromEntries(chunks.map(c => [c.chunk_id, c]));
    this.cards = cards; this.retr = new Retriever(chunks); this.topics = new TopicIndex(chunks, cards); this.router = new ClaimRouter(cards, this.topics);
  }
  context(q) {
    const hits = this.retr.search(q, 5);
    let [ranked, gov, anchors] = this.router.route(q);
    let unsupported = [];
    const exp = this.chat ? isExperienceChat(q) : isExperienceQuestion(q);
    if (exp) unsupported = [...new Set(subjectSlots(q, this.chat).filter(s => !this.topics.supported(s)))].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    const govPre = gov;
    if (unsupported.length) { gov = null; anchors = []; }
    const govCard = gov ? this.router.byId[gov] : null;
    return { q, hits, claims: ranked, gov, gov_pre_gate: govPre, anchors, experience_q: exp, unsupported_subjects: unsupported, ownership: ownershipState(q, govCard, hits, this.byId) };
  }
  answer(q) {
    const ctx = this.context(q);
    const [refuse, why] = refusal(ctx);
    const card = ctx.gov ? this.router.byId[ctx.gov] : null;
    return {
      question: q, decision: refuse ? 'refuse' : 'answer', reason: why,
      stance: refuse ? 'OUT_OF_SCOPE' : (card ? card.stance : 'UNGOVERNED'),
      constraint: card && !refuse ? { claim_id: card.claim_id, anchors: ctx.anchors, verified: card.verified, not_verified: card.not_verified, ownership: card.ownership, forbidden: card.forbidden } : null,
      evidence: this.cite(refuse ? null : card, ctx),
    };
  }
  cite(card, ctx) {
    const out = [], seen = new Set();
    for (const cid of (card || {}).evidence_chunk_ids || []) {
      const c = this.byId[cid];
      if (c && !seen.has(cid)) { seen.add(cid); out.push({ chunk_id: cid, section: c.section, source: c.source_path, via: 'claim' }); }
    }
    for (const [, cid, s] of ctx.hits.slice(0, 3)) {
      if (seen.has(cid)) continue; seen.add(cid);
      out.push({ chunk_id: cid, section: this.byId[cid].section, source: this.byId[cid].source_path, via: 'retrieval', score: s });
    }
    return out.slice(0, 4);
  }
}
