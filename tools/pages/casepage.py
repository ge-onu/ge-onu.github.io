#!/usr/bin/env python3
"""사례 페이지 만들기 — Mealplanning 페이지의 머리말·꼬리말·스크립트를 뼈대로 쓰고, 본문과 메타만 바꾼다.
    python3 tools/pages/casepage.py rag      # projects/rag-retrieval-poc/index.html
    python3 tools/pages/casepage.py didim    # projects/didim/index.html
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
  <nav class="crumb" aria-label="이동 경로"><a href="/#work">{BACK}대표 사례</a><span aria-hidden="true">/</span><span aria-current="page">RAG 챗봇 거누</span></nav>
  <header class="chead">
    <p class="chead-meta"><span class="status done"><i aria-hidden="true"></i>개발 평가 완료</span><span>개인 실험</span><span>사이트에서 동작 중</span></p>
    <h1>RAG 챗봇 거누</h1>
    <p class="subt">Retrieval PoC에서 Cloudflare Worker 배포까지</p>
    <dl class="cmeta"><div><dt>기간</dt><dd class="tnum">2026.09 – 10</dd></div><div><dt>구성</dt><dd>개인 실험 · 구현은 AI 도구 활용</dd></div><div><dt>내 역할</dt><dd>평가 기준·실패 분석·채택 판단</dd></div><div><dt>결과</dt><dd>개발 평가 기준 충족 · 거누 배포</dd></div></dl>
    <p class="chead-links"><button class="btn btn-primary btn-sm try-geonu" type="button" data-open-geonu><img src="/assets/chat-mascot-160.png" alt="" width="20" height="20">거누에게 물어보기</button><a class="link" href="https://github.com/ge-onu/ge-onu.github.io/tree/main/rag" target="_blank" rel="noopener noreferrer">{GH}거누 엔진·평가 코드<span class="sr">(새 탭)</span>{EXT}</a></p>
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

def didim_main():
    spec = json.loads((ROOT / 'tools/slides/didim.json').read_text(encoding='utf-8'))
    chap = [('intro', '문제'), ('screens', '화면'), ('arch', '구성'), ('choice', '선택'), ('verify', '검증')]
    d = {'base': '/assets/deck/didim/', 'chapters': [{'id': a, 'title': b} for a, b in chap],
         'slides': [{'c': x['_c'], 't': x['_t'], 'd': x['_d'], 'p': [i + 1]} for i, x in enumerate(spec)]}
    W = lambda *x: ('W', '판단 근거', ln(*x))
    def tbl(head, rows, label):
        h = ''.join(f'<th scope="col">{x}</th>' for x in head)
        b = ''.join('<tr><th scope="row">' + r[0] + '</th>' + ''.join(f'<td data-label="{head[i+1]}">{c}</td>' for i, c in enumerate(r[1:])) + '</tr>' for r in rows)
        return f'<div class="viz tbl-wrap" style="margin-top:14px" role="region" aria-label="{label}" tabindex="0"><table class="tbl"><thead><tr>{h}</tr></thead><tbody>{b}</tbody></table></div>'
    return f'''<div class="wrap">
  <nav class="crumb" aria-label="이동 경로"><a href="/#work">{BACK}대표 사례</a><span aria-hidden="true">/</span><span aria-current="page">디딤돌</span></nav>
  <header class="chead">
    <p class="chead-meta"><span class="status done"><i aria-hidden="true"></i>사이트에서 동작 중</span><span>개인 웹앱</span><span>저장소 비공개</span></p>
    <h1><img class="didim-hero-mark" src="/assets/didimdol-mark.svg" alt="" width="40" height="40" decoding="async">디딤돌</h1>
    <p class="subt">취업 준비와 하루 일을, 한 화면에서 딛는 웹앱</p>
    <dl class="cmeta"><div><dt>구성</dt><dd>개인 · 구현은 AI 도구 활용</dd></div><div><dt>내 역할</dt><dd>기획·보안 원칙·이전 범위·검증</dd></div><div><dt>스택</dt><dd>FastAPI · SQLite · Cloudflare Tunnel</dd></div><div><dt>주소</dt><dd>didimdol.site (로그인 필요)</dd></div></dl>
    <p class="chead-links"><a class="link" href="https://didimdol.site" target="_blank" rel="noopener noreferrer">didimdol.site 소개 화면<span class="sr">(새 탭)</span>{EXT}</a></p>
  </header>
  {deck_html(d, '발표 자료로 넘겨 보기', ln('문제부터 화면, 구성, 기술 선택, 검증까지 15장입니다.', '화면은 가상 계정과 가상 메일로 띄운 데모 서버에서 찍었습니다.'))}
  <div class="cbody">
    <article>
      <section class="blk" id="summary" aria-labelledby="sum-h">
        <div class="card sum"><div class="sum-h"><h2 id="sum-h">30초 요약</h2><span>상황 · 과제 · 판단 근거 · 행동 · 결과</span></div>
          {star([('S','상황','취업 준비 자료가 여러 페이지와 혼자 쓰는 보드(claude.ai 아티팩트 "디딤")에 흩어져, 지금 할 일을 한눈에 보기 어려웠습니다.'),('T','과제','자료를 계정마다 나누고, 실제 메일을 다루는 만큼 계정·세션·권한을 처음부터 세워야 했습니다.'),W('화면만 고쳐서는 자료를 사람마다 나눌 수 없었습니다.','그래서 서버가 있는 웹앱으로 다시 만들고, PC 한 대에서 혼자 지킬 수 있는 구성을 골랐습니다.'),('A','행동',ln('옛 자료를 옮기고 자료 종류마다 행 수를 대조하는 검증 명령을 만든 경험이 있습니다.','남의 자료를 어떤 경로로도 읽을 수 없다는 것을 테스트로 고정한 경험이 있습니다.')),('R','결과',ln('자료 16종이 모두 옛 쪽과 맞았고, didimdol.site에서 동작 중입니다.','메일 도구 전면 검수에서 결함 29가지를 고치고, 테스트를 281개에서 327개로 늘렸습니다.'))],'prr has-why')}
          <div class="sum-metrics"><div><b>16<small>/ 16</small></b><span>옛 디딤과 행 수가 맞은 자료 종류</span></div><div><b>100+</b><span>디딤돌 테스트 (인증·CSRF·사용자 분리)</span></div><div><b>29</b><span>메일 도구 검수에서 고친 결함</span></div><div><b>0</b><span>PC에서 바깥으로 연 포트</span></div></div>
        </div>
        <p class="bnd-note">기여 범위 — 무엇을 만들지, 무엇을 옮기고 무엇을 옮기지 않을지, 보안 원칙은 제가 정했습니다. 구현에는 AI 도구를 사용했고, 결과가 맞는지는 테스트와 실제 화면으로 제가 확인했습니다. 메일 수치는 제 메일함 한 벌(계정 2개·2,382통)에서 나온 것이며, 사용자 수나 운영 규모를 뜻하지 않습니다.</p>
      </section>

      <section class="blk" id="ev-stack" aria-labelledby="ev-stack-h"><p class="num"><span>01</span>구성과 선택</p><h2 id="ev-stack-h">PC 한 대에서 혼자 지킬 수 있는 구성</h2>
        {star([('S','상황','늘 켜 두는 Windows PC(WSL Ubuntu) 한 대에서 혼자 운영해야 했습니다.'),('T','과제','서버를 따로 빌리지 않고, PC의 포트를 열지 않은 채 도메인으로 공개해야 했습니다.'),W('혼자 운영하면 지킬 것이 늘수록 놓치는 곳이 생깁니다.','그래서 DB 서버 대신 파일 하나인 SQLite를, 포트 개방 대신 Cloudflare Tunnel을 골랐습니다.'),('A','행동','FastAPI를 systemd 사용자 서비스로 127.0.0.1에만 띄우고, Cloudflare Tunnel·Turnstile로 공개한 경험이 있습니다.'),('R','결과','바깥으로 연 포트 없이 didimdol.site로 접속되고, 매일 DB 사본을 PC 안과 밖 두 곳에 남깁니다.')])}
        <h3 class="sub-blk" id="stack-table">무엇으로 만들었나</h3>
        {tbl(['층','무엇','왜'],[['실행','WSL Ubuntu · systemd 사용자 서비스','로그인하지 않아도 뜨고, 서버를 빌리지 않음'],['공개','Cloudflare Tunnel · Turnstile','포트를 열지 않고 도메인으로 연결'],['앱','FastAPI · SQLite(WAL)','혼자 운영할 수 있는 크기의 서버와 DB'],['로그인','이메일+비밀번호(argon2id) · Google 로그인(OIDC) · 확인 메일 Resend','Google은 기본 범위(openid·email·profile)만'],['백업','매일 03:30 DB 사본 · PC 안과 밖 두 곳','메일 비밀번호를 푸는 키는 DB 사본과 다른 폴더에 둠']],'디딤돌 구성')}
        <h3 class="sub-blk" id="db-choice">DB는 왜 SQLite인가</h3>
        {tbl(['이유','내용'],[['운영','DB가 파일 하나라 DB 서버를 따로 띄우고 지킬 필요가 없습니다. WAL 모드로 읽기가 쓰기를 기다리지 않게 했습니다.'],['백업','온라인 백업 API로 사본을 뜨고, 무결성 검사가 ok일 때만 남깁니다. 되살릴 때는 사본 파일을 제자리에 둡니다.'],['연결','메일 도구도 SQLite라, 디딤돌은 그 파일을 읽기 전용(mode=ro · query_only)으로 열어 쓰기를 막습니다.'],['보안','secure_delete로 지운 행을 파일에서도 덮어쓰고, 파일 권한은 0600입니다.']],'SQLite를 고른 이유')}
        <p class="tbl-note"><span class="ln">쓰기는 한 번에 하나라, 사용자가 크게 늘면 서버형 DB(PostgreSQL 등)로 옮겨야 합니다.</span></p>
        <h3 class="sub-blk" id="ai-roles">AI는 잘하는 일에만</h3>
        {tbl(['일','모델','지키는 것'],[['생각 갈래 만들기','Codex (ChatGPT 구독)','정해 둔 JSON 모양으로만 답하게 함'],['어느 갈래가 합리적인지','Jev (jev-latest)','글을 쓰지 않고 확률·점수로 판단 · 하루 입력 20만 토큰 상한'],['자세한 비교','Claude (구독, 누를 때만)','안 되면 Codex가 대신 · 모두 안 되면 방향 사전'],['메일 분류','메일 도구가 Claude(claude-sonnet-5)로','등급·할 일·결제 추출 · 애매한 결제 메일만 상위 모델로 재확인 · 정확도는 측정 전']],'AI 역할 나누기')}
        <p class="tbl-note"><span class="ln">생각 갈래는 주인 계정에서만 쓰입니다.</span><span class="ln">메일 내용은 보내지 않고, 비밀번호·토큰처럼 보이는 문자열은 보내기 전에 가립니다.</span></p>
        {links(('발표 자료에서 보기','#deck'))}
      </section>

      <section class="blk" id="ev-migrate" aria-labelledby="ev-migrate-h"><p class="num"><span>02</span>자료 이전</p><h2 id="ev-migrate-h">옮긴 자료는 수로 맞추고, 옮기지 않은 것은 이유를 적었습니다</h2>
        {star([('S','상황','옛 디딤의 화면·자료·사용자가 남긴 상태가 아티팩트 저장소에 있었습니다.'),('T','과제','빠짐없이 옮기되, "빠짐없이"가 무엇인지부터 정해야 했습니다.'),W('수가 맞지 않으면 옮겼다고 말할 수 없습니다.','그래서 옮긴 것, 디딤돌이 원본을 바로 읽는 것, 옮기지 않은 것(이유 기록) 세 가지로 나눴습니다.'),('A','행동',ln('자료 종류마다 옛 쪽과 디딤돌의 행 수를 대조하는 검증 명령을 만든 경험이 있습니다.','가져오기는 적용 전에 백업을 뜨고, 디딤돌에서 고친 행은 덮지 않아 여러 번 돌려도 같은 결과가 나오게 했습니다.')),('R','결과','자료 16종이 모두 맞았고, 사용자가 남긴 표시(푼 문항·메모·응시 기록)도 맞았습니다. 메일 본문은 원칙에 따라 옮기지 않았습니다.')])}
      </section>

      <section class="blk" id="ev-isolation" aria-labelledby="ev-isolation-h"><p class="num"><span>03</span>계정 분리</p><h2 id="ev-isolation-h">남의 자료는 어떤 경로로도 읽을 수 없게</h2>
        {star([('S','상황','실제 메일을 다루는 웹앱이 여러 계정을 받게 됐습니다.'),('T','과제','화면뿐 아니라 API로도 남의 보드를 읽을 수 없어야 했습니다.'),W('화면에서 막아도 요청을 직접 보내면 뚫릴 수 있습니다.','그래서 모든 질의를 서버에서 세션 사용자로 거르고, 그 규칙을 테스트로 고정하기로 했습니다.'),('A','행동','요청 본문에 사용자 번호가 들어오면 거절하고, 남의 항목은 "없음"과 같은 404로 답하게 한 경험이 있습니다.'),('R','결과','인증·CSRF·속도 제한·사용자 분리·메일 권한·보안 머리글·암호화를 보는 테스트가 100개를 넘습니다.')])}
        {tbl(['위협','막는 방법'],[['남의 보드 읽기','세션 사용자로만 조회 · 남의 항목은 404'],['세션 가로채기','서버 쪽 세션 · 쿠키에는 무작위 값만 · 로그인 때마다 새 값'],['요청 위조(CSRF)','쓰기 요청마다 출처와 토큰을 함께 검사'],['계정 유추','가입·로그인 실패·재설정이 계정 유무와 관계없이 같은 답'],['스크립트 삽입','자동 이스케이프 템플릿 · 인라인 스크립트 없는 CSP']],'막은 위협')}
      </section>

      <section class="blk" id="ev-mail" aria-labelledby="ev-mail-h"><p class="num"><span>04</span>메일 읽음 상태</p><h2 id="ev-mail-h">지키던 규칙에 테스트가 없었습니다</h2>
        {star([('S','상황','메일 도구가 지메일·네이버 메일을 가져와 분류하고, 디딤돌은 그 결과를 읽기 전용으로 읽습니다.'),('T','과제','본문을 가져올 때 되돌릴 수 없는 읽음 표시가 붙지 않게 지켜야 했습니다.'),W('코드는 규칙을 지키고 있었지만, 읽기 전용 설정을 지워도 테스트 281개가 전부 통과했습니다.','지키는 테스트가 없으면 다음 수정에서 깨져도 알 수 없습니다.'),('A','행동','읽기 전용·읽음 표시 방지를 지키는 테스트를 붙이고, 코드를 일부러 훼손해 그 테스트가 깨지는지 확인한 경험이 있습니다.'),('R','결과','세 가지 훼손을 모두 붙인 테스트가 잡았습니다.')])}
        {tbl(['무엇을 망가뜨렸나','붙이기 전','붙인 뒤'],[['읽기 전용 설정을 끔','281개 전부 통과','실패 2건'],['읽음 표시가 붙는 방식으로 본문 수집','281개 전부 통과','실패 2건'],['읽은 메일에 플래그를 붙이는 줄 추가','281개 전부 통과','실패 4건']],'테스트 확인 결과')}
      </section>

      <section class="blk" id="ev-audit" aria-labelledby="ev-audit-h"><p class="num"><span>05</span>전면 검수</p><h2 id="ev-audit-h">테스트가 모두 통과하는 상태에서 29가지</h2>
        {star([('S','상황','메일 도구의 테스트 281개가 전부 통과하는 상태였습니다.'),('T','과제','만든 것이 실제 데이터에서 맞게 동작하는지 확인해야 했습니다.'),W('테스트는 미리 생각한 경우만 봅니다.','그래서 코드 읽기에 더해 실제 데이터를 조회하고 재현 실험을 했습니다.'),('A','행동','결함을 하나 고칠 때마다 그것을 잡는 테스트를 같이 붙인 경험이 있습니다.'),('R','결과','29가지를 고쳤고 테스트는 327개가 됐습니다. 한 번의 검수에서 찾은 것이라 더 있을 수 있습니다.')])}
        {tbl(['무엇이 틀렸나','왜 안 보였나','고친 뒤'],[['같은 결제를 두 번 셈','상점과 결제대행사가 상호를 다르게 씀','이번 달 총액에서 허수 18% 제거'],['달러 결제를 원화로 더함','통화 칸은 있는데 합계가 보지 않음','환산 못 한 15건을 빼고 밝힘'],['3년 전 일이 "지금 할 것"에','할 일 판정에 기간 상한이 없음','할 일 21건 → 11건'],['시도 횟수가 성공해도 안 줄어듦','실패 경로만 테스트가 있었음','한도 직전이던 24통 복구']],'검수에서 드러난 결함 4가지')}
      </section>

      <section class="blk" id="ev-ops" aria-labelledby="ev-ops-h"><p class="num"><span>06</span>고장 감지</p><h2 id="ev-ops-h">메일이 0통이면 정상과 고장이 똑같이 조용합니다</h2>
        {star([('S','상황','알림이 메일에서 나오므로, 도구가 죽어도 사용자에게는 조용한 날과 구분되지 않았습니다.'),('T','과제','도구 고장을 메일 내용과 무관하게 알아야 했습니다.'),W('프로그램이 죽으면 프로그램은 스스로 알릴 수 없습니다.','그래서 본체와 별개로 도는 감시와, PC가 통째로 꺼졌을 때를 위한 외부 감시를 두었습니다.'),('A','행동','계정 단위·파이프라인 단위·전체 정지 세 층으로 나누고, 알림 채널을 지금 봐야 하는 것·하루 요약·도구 고장으로 나눈 경험이 있습니다.'),('R','결과','검수에서 "새 메일 0통도 수집 성공"으로 기록하던 구멍과, 죽은 알림 경로로 그 사실을 알리려던 고리를 찾았습니다.')])}
      </section>

      <section class="blk" id="ev-port" aria-labelledby="ev-port-h"><p class="num"><span>07</span>옛 디딤 · 화면 이식</p><h2 id="ev-port-h">중괄호 개수가 맞는다고 구조가 맞는 것은 아니었습니다</h2>
        {star([('S','상황','따로 만든 메일 화면을 한 장짜리 옛 디딤 보드에 옮겨야 했고, 클래스가 198개였습니다.'),('T','과제','목업을 고칠 때마다 손으로 다시 옮기지 않게 해야 했습니다.'),W('정규식으로 선택자와 선언을 긁자 좁은 화면 전용 규칙이 모든 폭에 적용돼 세 화면이 무너졌습니다.','그때 "중괄호 1332개 균형"만 보고 통과라고 판단한 것이 원인이었습니다.'),('A','행동','중괄호 단위로 블록 안쪽까지 재귀하는 파서로 바꾸고, 결과를 스스로 네 가지로 검사해 걸리면 멈추는 변환기를 만든 경험이 있습니다.'),('R','결과','결과물이 원본과 도구만으로 바이트 단위까지 다시 만들어집니다.')])}
      </section>

      <section class="blk" id="limits" aria-labelledby="l-h"><p class="num">한계</p><h2 id="l-h">남겨 둔 것</h2>
        <div class="limits"><ul>
          <li>{INFO}<span>PC 한 대에서 도는 구조라, PC가 꺼지면 사이트도 멈춥니다. 이중화나 여러 서버 운영은 하지 않았습니다.</span></li>
          <li>{INFO}<span>메일 분류 정확도는 측정하지 않았습니다. 검수는 "집계와 표시가 데이터와 맞는가"를 봤지 "판정이 옳은가"를 보지 않았습니다.</span></li>
          <li>{INFO}<span>다른 사용자가 자기 메일을 연결하는 기능은 아직 없습니다. 자격 증명 암호화와 읽기 전용 메일함 같은 안전장치만 테스트로 고정했습니다.</span></li>
          <li>{INFO}<span>옛 디딤은 만드는 동안 커밋을 하지 않아 초기 74판의 코드가 남아 있지 않습니다. 결정과 근거만 설계 문서로 옮겼습니다.</span></li>
        </ul></div>
      </section>

      <section class="blk" id="learned" aria-labelledby="ln-h"><p class="num">배운 점</p><h2 id="ln-h">다음 판단에 남긴 기준</h2>
        <ol class="learned"><li>개수가 맞는 것과 구조가 맞는 것은 다릅니다.</li><li>지키는 규칙에는 그 규칙을 깨면 실패하는 테스트를 붙입니다.</li><li>고장은 내용과 무관한 신호로 따로 봅니다.</li></ol>
      </section>
    </article>
    <aside class="toc" aria-label="목차"><p>목차</p><ol>
      <li><a href="#deck">발표 자료</a></li><li><a href="#summary">30초 요약</a></li>
      <li><a href="#ev-stack"><span>01</span>구성과 선택</a></li><li><a href="#ev-migrate"><span>02</span>자료 이전</a></li><li><a href="#ev-isolation"><span>03</span>계정 분리</a></li><li><a href="#ev-mail"><span>04</span>메일 읽음 상태</a></li><li><a href="#ev-audit"><span>05</span>전면 검수</a></li><li><a href="#ev-ops"><span>06</span>고장 감지</a></li><li><a href="#ev-port"><span>07</span>화면 이식</a></li>
      <li><a href="#limits">한계</a></li><li><a href="#learned">배운 점</a></li></ol></aside>
  </div>
</div>'''

PAGES = {'rag': {'path': 'projects/rag-retrieval-poc/index.html', 'main': rag_main},
         'didim': {'path': 'projects/didim/index.html', 'main': didim_main}}
if __name__ == '__main__':
    build(sys.argv[1])
