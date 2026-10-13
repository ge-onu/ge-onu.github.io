#!/usr/bin/env python3
"""사례 페이지 만들기 — Mealplanning 페이지의 머리말·꼬리말·스크립트를 뼈대로 쓰고, 본문과 메타만 바꾼다.
    python3 tools/pages/casepage.py rag      # projects/rag-retrieval-poc/index.html
본문은 아래 PAGES 사전에 있다. 사실은 각 사례의 근거 문서·평가 기록에서만 가져온다."""
import json, re, sys, html
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
MEAL = (ROOT / 'projects/mealplanning/index.html').read_text(encoding='utf-8')
FWD = re.search(r'<svg class="ic fwd".*?</svg>', MEAL, re.S).group(0)
INFO = re.search(r'<li><(svg class="ic"[^>]*><circle cx="12" cy="12" r="9"/>.*?</svg>)', MEAL, re.S).group(1)
INFO = '<' + INFO
EXT = re.search(r'<svg class="ic ext".*?</svg>', MEAL, re.S).group(0)
GH = re.search(r'<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 \.7.*?</svg>', MEAL, re.S).group(0)
BACK = re.search(r'<nav class="crumb"[^>]*><a href="/#work">(<svg.*?</svg>)', MEAL, re.S).group(1)

def ln(*xs): return ''.join(f'<span class="ln">{x}</span>' for x in xs)
def star(items, cls='star4 has-why'):
    out = [f'<dl class="{cls}">']
    for key, label, body in items:
        c = ' class="why"' if key == 'W' else ' class="res"' if key == 'R' else ''
        out.append(f'<div{c}><dt><span class="sl">{key}</span>{label}</dt><dd>{body}</dd></div>')
    return ''.join(out) + '</dl>'
def links(*pairs):
    return '<div class="links">' + ''.join(
        f'<a class="link" href="{h}"{" target=\"_blank\" rel=\"noopener noreferrer\"" if h.startswith("http") else ""}>{t}{FWD}</a>' for t, h in pairs) + '</div>'
def deck_html(d, title, note):
    tabs = ''.join(f'<button type="button" role="tab" data-chapter="{c["id"]}" aria-selected="false" tabindex="-1">{c["title"]}</button>' for c in d['chapters'])
    first = d['base'] + 'p001.webp'
    n = len(d['slides'])
    return (f'<section class="deck" id="deck" data-deck aria-labelledby="deck-h">\n'
      f'  <div class="deck-head"><div><p class="num">발표 자료</p><h2 id="deck-h">{title}</h2></div><p class="deck-note">{note}</p></div>\n'
      f'  <div class="deck-chapters" role="tablist" aria-label="발표 장">{tabs}</div>\n'
      f'  <div class="deck-stage" tabindex="0" role="region" aria-roledescription="슬라이드" aria-label="{d["slides"][0]["t"]} · 방향키로 넘기기">\n'
      f'    <div class="deck-frame"><img class="deck-layer on" src="{first}" alt="{d["slides"][0]["t"]}" width="1600" height="900" decoding="async"></div>\n'
      + re.search(r'    <button class="deck-nav deck-prev".*?</button>\n    <button class="deck-nav deck-next".*?</button>\n', MEAL, re.S).group(0) +
      '  </div>\n'
      f'  <div class="deck-bar"><div class="deck-progress" aria-hidden="true"><i></i></div><p class="deck-meta"><span class="deck-count tnum" aria-live="polite">1 / {n}</span><span class="deck-title">{d["slides"][0]["t"]}</span><span class="deck-steps" role="img" aria-label=""></span></p>'
      '<div class="deck-ctl"><button class="btn btn-secondary btn-sm deck-play" type="button" aria-pressed="false"><span class="lbl">자동 재생</span></button>'
      '<button class="btn btn-secondary btn-sm deck-fs" type="button" aria-pressed="false"><span class="lbl">전체 화면</span></button></div></div>\n'
      f'  <p class="deck-desc" aria-live="polite">{d["slides"][0].get("d","")}</p>\n'
      f'  <script type="application/json" id="deck-data">{json.dumps(d, ensure_ascii=False, separators=(",", ":"))}</script>\n'
      '</section>')

def build(page):
    P = PAGES[page]
    out_path = ROOT / P['path']
    cur = out_path.read_text(encoding='utf-8')
    # 메타: 지금 페이지의 설명·OG·제목 줄을 그대로 가져온다
    meta = re.search(r'  <meta name="description".*?</title>\n', cur, re.S).group(0)
    s = MEAL
    if '<link rel="canonical"' in meta:  # 뼈대(Mealplanning)의 canonical은 먼저 지운다
        s = re.sub(r'\s*<link rel="canonical"[^>]*>', '', s, count=1)
    s = re.sub(r'  <meta name="description".*?</title>\n', lambda m: meta, s, count=1, flags=re.S)
    main = P['main']()
    s = re.sub(r'<main id="main">.*?</main>', lambda m: '<main id="main">\n' + main + '\n</main>', s, count=1, flags=re.S)
    out_path.write_text(s, encoding='utf-8')
    print('wrote', out_path.relative_to(ROOT))

def rag_main():
    spec = json.loads((ROOT / 'tools/slides/rag.json').read_text(encoding='utf-8'))
    chap = [('intro', '문제'), ('engine', '엔진'), ('eval', '평가'), ('geonu', '거누'), ('retro', '회고')]
    d = {'base': '/assets/deck/rag/', 'chapters': [{'id': a, 'title': b} for a, b in chap],
         'slides': [{'c': x['_c'], 't': x['_t'], 'd': x['_d'], 'p': [i + 1]} for i, x in enumerate(spec)]}
    W = lambda *x: ('W', '판단 근거', ln(*x))
    return f'''<div class="wrap">
  <nav class="crumb" aria-label="이동 경로"><a href="/#work">{BACK}대표 사례</a><span aria-hidden="true">/</span><span aria-current="page">RAG Retrieval PoC</span></nav>
  <header class="chead">
    <p class="chead-meta"><span class="status done"><i aria-hidden="true"></i>개발 평가 완료</span><span>개인 실험</span><span>챗봇 거누로 배포</span></p>
    <h1>RAG Retrieval PoC</h1>
    <p class="subt">검색한 문서와 답해도 되는 근거를 나눈 실험, 그리고 챗봇 거누</p>
    <dl class="cmeta"><div><dt>기간</dt><dd class="tnum">2026.09 – 10</dd></div><div><dt>구성</dt><dd>개인 실험 · 구현은 AI 도구 활용</dd></div><div><dt>내 역할</dt><dd>평가 기준·실패 분석·채택 판단</dd></div><div><dt>결과</dt><dd>개발 평가 기준 충족 · 거누 배포</dd></div></dl>
    <p class="chead-links"><a class="link" href="https://github.com/ge-onu/ge-onu.github.io/tree/main/rag" target="_blank" rel="noopener noreferrer">{GH}거누 엔진·평가 코드<span class="sr">(새 탭)</span>{EXT}</a></p>
  </header>
  {deck_html(d, '발표 자료로 넘겨 보기', ln('문제부터 엔진, 평가, 거누 배포, 회고까지 10장입니다.', '장마다 아래에 설명을 붙였습니다.'))}
  <div class="cbody">
    <article>
      <section class="blk" id="summary" aria-labelledby="sum-h">
        <div class="card sum"><div class="sum-h"><h2 id="sum-h">30초 요약</h2><span>상황 · 과제 · 판단 근거 · 행동 · 결과</span></div>
          {star([('S','상황','경험을 묻는 질문에 비슷한 문서가 검색되면, 팀이 한 일이 내 경험으로 읽히거나 기록에 없는 기술에 답이 붙을 수 있었습니다.'),('T','과제','검색 순위와 답변 허용을 나누고, 근거가 없으면 답하지 않는 기준을 세워야 했습니다.'),W('실패를 고치려면 검색 문제인지 판단 문제인지부터 갈라야 했습니다.','그래서 검색은 BM25로 단순하게 두고, 답해도 되는지 판단하는 층을 따로 세웠습니다.'),('A','행동',ln('처음 보는 질문에서 나온 실패 9건을 검색과 판단으로 나눠 분석하고, 판단 규칙을 고친 경험이 있습니다.','동결한 엔진을 JavaScript로 옮겨 이 사이트의 챗봇 거누로 배포한 경험이 있습니다.')),('R','결과',ln('개발 평가 100문항에서 근거 없는 질문은 12개 모두 거절하고, 답할 질문 88개에는 모두 답했습니다.','옮긴 엔진은 110문항에서 원본과 출력이 같았습니다.'))],'prr has-why')}
          <div class="sum-metrics"><div><b>12<small>/ 12</small></b><span>근거 없는 질문 정상 거절</span></div><div><b>88<small>/ 88</small></b><span>답할 질문 정상 답변</span></div><div><b>0.989</b><span>답한 질문의 인용 정확도</span></div><div><b>110<small>/ 110</small></b><span>이식본 출력이 원본과 같은 문항</span></div></div>
        </div>
      </section>

      <section class="blk" id="ev-fail" aria-labelledby="ev-fail-h"><p class="num"><span>01</span>실패 분석</p><h2 id="ev-fail-h">실패 9건 중 8건은 검색이 아니라 판단에서</h2>
        {star([('S','상황','동결한 설정을 처음 보는 질문 40개(holdout v1)에 돌리자 9건이 틀렸습니다.'),('T','과제','같은 실패가 다시 나지 않게 고치되, 그 40문항에만 맞춘 수정은 피해야 했습니다.'),W('검색 결과를 보니 필요한 근거는 대부분 찾았고, 틀린 것은 그 뒤의 판단이었습니다.','그래서 검색 설정은 그대로 두고 판단 규칙만 일반 원리로 바꿨습니다.'),('A','행동','가장 가까운 카드를 늘 고르던 규칙을 "단서가 없으면 고르지 않음"으로, 모르는 주제 판단을 "공개 자료에 근거가 있는지"로 바꾼 경험이 있습니다.'),('R','결과','개발 평가 기준을 모두 충족했고, 새 규칙에서 holdout 문항의 기술명·문장 조각은 0건이었습니다.')])}
        {links(('발표 자료에서 보기','#deck'),('개발 평가표·기각한 대안 원문','../../assets/evidence/rag-retrieval-poc/development-summary.md'))}
      </section>

      <section class="blk" id="ev-geonu" aria-labelledby="ev-geonu-h"><p class="num"><span>02</span>거누 배포</p><h2 id="ev-geonu-h">같은 엔진으로 만든 RAG 챗봇</h2>
        {star([('S','상황','PoC 엔진은 Python 실험 코드여서, 사이트 방문자가 쓸 수 없었습니다.'),('T','과제','엔진의 판단을 바꾸지 않은 채 사이트에서 돌리고, 생성 모델이 근거 밖 내용을 말하지 않게 해야 했습니다.'),W('엔진을 옮기다 판단이 달라지면 평가 결과를 그대로 믿을 수 없습니다.','그래서 옮긴 뒤 원본과 출력부터 대조하고, 생성 답은 근거와 다시 맞춰 보기로 했습니다.'),('A','행동','엔진을 JavaScript로 옮겨 Cloudflare Worker에서 판정하고, Gemini가 근거 안에서만 쓰게 한 경험이 있습니다.'),('R','결과','110문항에서 원본과 출력이 같았고, 지금 사이트 기준 재평가도 PoC 수치와 같은 수준이었습니다.')])}
        <p class="bnd-note">기여 범위 — 엔진을 거누에 쓰기로 한 결정, "자유롭게 쓰되 사실만 검사"라는 생성 원칙, 챗봇임을 화면에서 분명히 하는 원칙은 제가 정했습니다. JavaScript 이식·응답 서버·평가 스크립트 작성에는 AI 도구를 사용했습니다.</p>
      </section>

      <section class="blk" id="ev-safety" aria-labelledby="ev-safety-h"><p class="num"><span>03</span>배포 후 수정</p><h2 id="ev-safety-h">사실 검사가 놓친 깨진 글</h2>
        {star([('S','상황','2026-10-14에 대체 모델이 느낌표만 700여 개 돌려준 답이 화면에 나갔습니다.'),('T','과제','틀린 사실뿐 아니라 깨진 글도 화면에 나가지 않게 해야 했습니다.'),W('사실 검사는 숫자·기술명·금지 표현만 보므로, 기호뿐인 글은 통과합니다.','그래서 글의 형식을 보는 검사를 따로 두기로 했습니다.'),('A','행동','글자·기호 비율, 반복, 길이를 보는 출력 정상성 검사를 넣고, 문제를 낸 대체 모델을 뺀 경험이 있습니다.'),('R','결과','깨진 글 9개와 정상 답 5개로 만든 시험을 모두 통과했고, 실패하면 근거 문장으로 답합니다.')])}
      </section>

      <section class="blk" id="limits" aria-labelledby="l-h"><p class="num">한계</p><h2 id="l-h">남겨 둔 것</h2>
        <div class="limits"><ul>
          <li>{INFO}<span>새 평가 세트(holdout v2) 검증 전입니다. 개발 평가 수치를 새 질문 성능으로 읽지 않습니다.</span></li>
          <li>{INFO}<span>개발 문항 X08(데이터 수집부터 학습까지의 기여)은 필요한 근거가 4위에 남았고, 한 문항만을 위한 튜닝은 하지 않았습니다.</span></li>
          <li>{INFO}<span>검색과 답변 허용을 검증한 PoC이며, 상용 RAG·Vector DB 운영 경험이 아닙니다.</span></li>
        </ul></div>
      </section>

      <section class="blk" id="learned" aria-labelledby="ln-h"><p class="num">배운 점</p><h2 id="ln-h">다음 판단에 남긴 기준</h2>
        <ol class="learned"><li>실패를 검색과 판단으로 나눠 봐야 고칠 곳이 보입니다.</li><li>측정해서 나빠진 대안은 그럴듯해도 넣지 않습니다.</li><li>생성 답은 사실과 형식을 따로 검사합니다.</li></ol>
      </section>
    </article>
    <aside class="toc" aria-label="목차"><p>목차</p><ol>
      <li><a href="#deck">발표 자료</a></li><li><a href="#summary">30초 요약</a></li>
      <li><a href="#ev-fail"><span>01</span>실패 분석</a></li><li><a href="#ev-geonu"><span>02</span>거누 배포</a></li><li><a href="#ev-safety"><span>03</span>배포 후 수정</a></li>
      <li><a href="#limits">한계</a></li><li><a href="#learned">배운 점</a></li></ol></aside>
  </div>
</div>'''

PAGES = {'rag': {'path': 'projects/rag-retrieval-poc/index.html', 'main': rag_main}}
if __name__ == '__main__':
    build(sys.argv[1])
