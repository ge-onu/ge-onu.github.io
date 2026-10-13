#!/usr/bin/env python3
"""거누 RAG 근거 데이터 빌드 — RAG PoC(build_corpus.py, G7)를 지금 사이트 구조에 맞춘 사본.

PoC와 같은 자르기 규칙(<details id> → <article> → <section id> → 잔여)을 쓰고,
바뀐 점은 세 가지다: 대상 페이지를 공개 상세 페이지 전체로 넓혔고, 새 머리말(.hdr)과
발표 자료 뷰어를 크롬으로 지우며, 출력 위치를 rag/data/ 로 옮겼다.

(원본 설명) Offline corpus build for the portfolio retrieval PoC.

Reads only files published on ge-onu.github.io main. No network, no Cloudflare.
Emits chunks.jsonl following the chunk schema in the report.

G7 change — magnet/overview fix. v1 dropped every page-level container into a
single `overview` bucket per page, which glued unrelated topics together and
carried the repeated topbar chrome. The pages already name their own blocks
(`<details id>`, `<article id>`, `<section id>`), so we cut on those instead.
Nothing is deleted except chrome that repeats on every page.
"""
from __future__ import annotations
import re, json, html, hashlib, sys
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / 'data'
SITE = Path(sys.argv[1]) if len(sys.argv) > 1 and not sys.argv[1].startswith('-') else Path(__file__).resolve().parents[2]

PAGES = [
    ('index.html',                          'home',     'portfolio'),
    ('projects/mealplanning/index.html',    'project',  'mealplanning'),
    ('projects/kubernetes-lab/index.html',  'project',  'kubernetes-lab'),
    ('projects/infrastructure-lab-series/index.html', 'project', 'infrastructure-lab-series'),
    ('projects/rag-retrieval-poc/index.html', 'project', 'rag-retrieval-poc'),
    ('projects/didim/index.html',           'project',  'didim'),
]
EVIDENCE_GLOB = 'assets/evidence/mealplanning/*/source.html'
FULL_GLOB     = 'assets/evidence/mealplanning/*/full.html'

# 페이지마다 반복되는 크롬. 답에 쓸 내용이 없고, 모든 질문에 걸려 자석이 된다.
CHROME = re.compile(r'<(script|style|svg|nav|footer)\b[^>]*>.*?</\1>', re.S | re.I)
TOPBAR = re.compile(r'<header\b[^>]*\bclass="(?:[^"]*topbar[^"]*|hdr)"[^>]*>.*?</header>'
                    r'|<section class="deck"[^>]*>.*?</section>'
                    r'|<a class="skip[^"]*"[^>]*>.*?</a>', re.S | re.I)
TAG = re.compile(r'<[^>]+>')
WS = re.compile(r'[ \t ]+')

# class 로만 식별되는 블록 → 안정적인 섹션 이름
CLASS_SECTION = {
    'hero': 'hero', 'project-hero': 'hero',
    'project-overview': 'project-overview',
    'story-section': 'story', 'evidence-section': 'evidence-index',
}


def visible_text(raw: str) -> str:
    s = CHROME.sub(' ', raw)
    s = re.sub(r'</(p|div|li|h[1-6]|tr|td|th|summary|details|section|article)>', '\n', s, flags=re.I)
    s = re.sub(r'<br\s*/?>', '\n', s, flags=re.I)
    s = TAG.sub(' ', s)
    s = html.unescape(s)
    s = WS.sub(' ', s)
    s = re.sub(r'\n\s*\n+', '\n', s)
    return '\n'.join(l.strip() for l in s.split('\n') if l.strip())


def find_blocks(raw: str, tag: str):
    """Balanced <tag> spans. Returns (outer_start, outer_end, attrs, inner, n_children).

    A depth counter, not a non-greedy regex: `<details>` nests (category > case)
    and a non-greedy match ends at the first closing tag, swallowing the first
    child. That silently dropped four cases in v1.
    """
    op = re.compile(rf'<{tag}\b([^>]*)>', re.I)
    cl = re.compile(rf'</{tag}\s*>', re.I)
    ev = sorted([(m.start(), m.end(), 'o', m.group(1)) for m in op.finditer(raw)] +
                [(m.start(), m.end(), 'c', '') for m in cl.finditer(raw)])
    stack, out = [], []
    for s, e, k, at in ev:
        if k == 'o':
            stack.append([s, e, at, 0])
        elif stack:
            s0, e0, at0, kids = stack.pop()
            if stack:
                stack[-1][3] += 1
            out.append((s0, e, at0, raw[e0:s], kids))
    return out


def attr(at: str, name: str) -> str:
    m = re.search(rf'\b{name}="([^"]*)"', at)
    return m.group(1) if m else ''


def slug(text: str) -> str:
    t = re.sub(r'[^a-z0-9가-힣]+', '-', text.lower()).strip('-')
    return t[:40] or 'block'


def heading(inner: str) -> str:
    m = re.search(r'<(h[1-4])\b[^>]*>(.*?)</\1>', inner, re.S | re.I) \
        or re.search(r'<strong\b[^>]*>(.*?)</strong>', inner, re.S | re.I)
    if not m:
        return ''
    return TAG.sub(' ', html.unescape(m.group(m.lastindex))).strip()[:90]


def blank(raw: str, spans) -> str:
    """Erase an emitted span but keep offsets so later passes stay aligned."""
    buf = list(raw)
    for s, e in spans:
        for i in range(s, e):
            if buf[i] != '\n':
                buf[i] = ' '
    return ''.join(buf)


def page_sections(raw: str):
    """Innermost-named-block-first. Each pass blanks what it emitted, so a
    parent section yields only its own prose, not its children's."""
    out = []

    # 1) 아코디언 케이스 — 자식이 없는 <details id> 만 (카테고리 래퍼는 건너뛴다)
    spans = []
    for s, e, at, inner, kids in find_blocks(raw, 'details'):
        cid = attr(at, 'id')
        # 지금 사이트: 트러블슈팅 카드 안에 id 없는 '자세히 보기' details가 들어 있다. id가 있는 자식만 래퍼로 본다.
        if not cid or re.search(r'<details\b[^>]*\bid=', inner):
            continue
        out.append((cid, heading(inner), visible_text(inner), 'case'))
        spans.append((s, e))
    raw = blank(raw, spans)

    # 2) <article> — k8s story-panel(id 있음) · focus-item(제목에서 이름 생성)
    spans = []
    for s, e, at, inner, _ in find_blocks(raw, 'article'):
        if re.search(r'<section\b', inner, re.I):   # 구역을 품은 큰 article은 구역 단위로 자른다
            continue
        h = heading(inner)
        aid = attr(at, 'id') or slug(h)
        txt = visible_text(inner)
        if len(txt) < 40:
            continue
        out.append((aid, h, txt, 'panel'))
        spans.append((s, e))
    raw = blank(raw, spans)

    # 3) <section> — id 우선, 없으면 class 매핑
    spans = []
    for s, e, at, inner, kids in find_blocks(raw, 'section'):
        if kids and re.search(r'<section\b[^>]*\bid=', inner, re.I):   # 바깥 래퍼는 id 있는 자식이 처리한다
            continue
        sid = attr(at, 'id')
        if not sid:
            for c in attr(at, 'class').split():
                if c in CLASS_SECTION:
                    sid = CLASS_SECTION[c]; break
        txt = visible_text(inner)
        if not sid or len(txt) < 40:
            continue
        out.append((sid, heading(inner), txt, 'section'))
        spans.append((s, e))
    raw = blank(raw, spans)

    # 4) 어디에도 안 잡힌 잔여 산문
    rest = visible_text(raw)
    if len(rest) >= 60:
        out.append(('page-residual', '', rest, 'residual'))
    return out


def h2_sections(raw: str):
    body = re.search(r'<body[^>]*>(.*)</body>', raw, re.S)
    raw = body.group(1) if body else raw
    out = []
    for p in re.split(r'(?=<h[12][^>]*>)', raw):
        t = re.search(r'<h[12][^>]*>(.*?)</h[12]>', p, re.S)
        title = TAG.sub('', html.unescape(t.group(1))).strip() if t else ''
        txt = visible_text(p)
        if len(txt) >= 40:
            out.append((title, txt))
    return out


def split_long(text: str, hard=1100, soft=700):
    if len(text) <= hard:
        return [text]
    out, cur = [], ''
    for line in text.split('\n'):
        if cur and len(cur) + len(line) + 1 > soft:
            out.append(cur); cur = line
        else:
            cur = (cur + '\n' + line).strip()
    if cur:
        out.append(cur)
    return out


def make(chunks, *, doc_id, doc_title, source_path, section, section_title,
         text, doc_type, project, block_kind, visibility='public'):
    for i, part in enumerate(split_long(text)):
        chunks.append({
            'chunk_id': f'{doc_id}::{section}' + (f'#{i}' if i else ''),
            'doc_id': doc_id, 'doc_title': doc_title,
            'doc_type': doc_type,          # home | project | evidence | evidence_full
            'project': project,            # portfolio | mealplanning | kubernetes-lab
            'block_kind': block_kind,      # case | panel | section | residual | evidence
            'section': section, 'section_title': section_title,
            'source_path': source_path, 'visibility': visibility,
            'char_len': len(part), 'text': part,
            'sha1': hashlib.sha1(part.encode()).hexdigest()[:12],
        })


def main(include_full=False, out_name='chunks.jsonl'):
    chunks = []
    for rel, dtype, project in PAGES:
        p = SITE / rel
        if not p.exists():
            print(f'  MISSING {rel}'); continue
        raw = TOPBAR.sub(' ', p.read_text(encoding='utf-8'))
        t = re.search(r'<title[^>]*>(.*?)</title>', raw, re.S)
        title = html.unescape(TAG.sub('', t.group(1))).strip() if t else rel
        secs = page_sections(raw)
        # 프로젝트 페이지의 배너(hero)와 개요는 같은 담당·범위 문장을 공유한다.
        # 따로 색인하면 둘이 상위 두 칸을 함께 차지해 실제 근거 문서를 3위 밖으로
        # 밀어낸다(dev set cross R@3 1.000 → 0.750). 문장은 하나도 버리지 않고
        # 같은 "이 페이지가 무엇인가" 단위로 합친다.
        names = {s[0] for s in secs}
        if {'hero', 'project-overview'} <= names:
            hero = next(s for s in secs if s[0] == 'hero')
            secs = [(sid, st, (hero[2] + '\n' + tx) if sid == 'project-overview' else tx, k)
                    for sid, st, tx, k in secs if sid != 'hero']
        for sid, stitle, txt, kind in secs:
            make(chunks, doc_id=rel, doc_title=title, source_path=rel,
                 section=sid, section_title=stitle, text=txt,
                 doc_type=dtype, project=project, block_kind=kind)

    for p in sorted(SITE.glob(EVIDENCE_GLOB)):
        raw = p.read_text(encoding='utf-8')
        eid = p.parent.name
        t = re.search(r'<title[^>]*>(.*?)</title>', raw, re.S)
        title = html.unescape(TAG.sub('', t.group(1))).strip() if t else eid
        for j, (stitle, txt) in enumerate(h2_sections(raw)):
            make(chunks, doc_id=f'evidence/{eid}', doc_title=title,
                 source_path=str(p.relative_to(SITE)), section=f's{j}',
                 section_title=stitle, text=txt, doc_type='evidence',
                 project='mealplanning', block_kind='evidence')

    if include_full:
        for p in sorted(SITE.glob(FULL_GLOB)):
            eid = p.parent.name
            for j, (stitle, txt) in enumerate(h2_sections(p.read_text(encoding='utf-8'))):
                make(chunks, doc_id=f'full/{eid}', doc_title=f'{eid} 전문',
                     source_path=str(p.relative_to(SITE)), section=f'f{j}',
                     section_title=stitle, text=txt, doc_type='evidence_full',
                     project='mealplanning', block_kind='evidence')

    with open(OUT / out_name, 'w', encoding='utf-8') as f:
        for c in chunks:
            f.write(json.dumps(c, ensure_ascii=False) + '\n')

    from collections import Counter
    lens = [c['char_len'] for c in chunks]
    print(f'  chunks {len(chunks)} → {out_name}')
    print(f'  chars  min {min(lens)} · median {sorted(lens)[len(lens)//2]} · '
          f'max {max(lens)} · total {sum(lens):,}')
    for k, v in Counter(c['block_kind'] for c in chunks).most_common():
        print(f'    {k:10s} {v}')


if __name__ == '__main__':
    main(include_full='--full' in sys.argv)
