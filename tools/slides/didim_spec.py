# 디딤돌 발표 자료 정의 → tools/slides/didim.json
# 사실은 디딤돌 README·docs/DESIGN.md·코드(thinking.py, db.py, mail_summary.py)와 기존 디딤돌 페이지에서만 가져왔다.
# 화면은 디딤돌 세션이 별도 데모 서버(가상 계정·가상 메일 DB)에서 찍은 것을 잘라 썼다.
import json
V={"--hl":"#eef7f2","--acc":"#1f6f4f","--acc2":"#e2f1ea","--bg":"#f6f8f5","--line":"#dfe5df"}
CH=["문제","화면","구성","선택","검증"]
SH="/tools/slides/didim-shots/"
FOOT='<img src="/assets/didimdol-mark.svg" alt="">디딤돌 · 이건우'
def sl(ch,c,t,h,p,body,d):
    return {"ch":ch,"chapters":CH,"h":h,"p":p,"body":body,"foot":FOOT,"vars":V,"_c":c,"_t":t,"_d":d}
def card(h,p,tag=""):
    return f'<div class="card" style="flex:1">{tag}<h3>{h}</h3><p>{p}</p></div>'
def calls(*xs):
    return '<div class="calls">'+''.join(f'<div class="card"><h3><span class="num-dot">{i+1}</span>{h}</h3><p>{p}</p></div>' for i,(h,p) in enumerate(xs))+'</div>'
S=[]
S.append({"cover":True,"k":"개인 웹앱 · FastAPI · SQLite · Cloudflare Tunnel","h":"디딤돌","p":"취업 준비와 하루 일을,<br>한 화면에서 딛습니다.","art":"/assets/didimdol-mark.svg","foot":"이건우 · didimdol.site","vars":V,
  "_c":"intro","_t":"표지","_d":"혼자 쓰던 보드 디딤을 계정마다 자료가 나뉘는 웹앱으로 옮긴 프로젝트입니다. 이 자료의 화면은 모두 가상 자료를 넣은 데모 계정에서 찍었습니다."})
S.append(sl("문제","intro","문제","흩어진 자료로는 지금 할 일이 안 보였습니다","혼자 쓰던 보드를, 계정마다 자료가 나뉘는 웹앱으로",
  '<table><thead><tr><th>항목</th><th>옛 디딤</th><th>디딤돌</th></tr></thead><tbody>'
  '<tr><td><b>형태</b></td><td>claude.ai 아티팩트 · HTML 한 장</td><td>웹앱 · didimdol.site</td></tr>'
  '<tr><td><b>자료</b></td><td>브라우저와 아티팩트 저장소</td><td>서버의 SQLite · 계정마다 따로</td></tr>'
  '<tr><td><b>사용자</b></td><td>나 혼자</td><td>계정마다 자기 보드만 봄</td></tr>'
  '<tr><td><b>메일</b></td><td>별도 도구가 올린 사본</td><td>주인 계정만, 메일 도구의 DB를 읽기 전용으로</td></tr></tbody></table>'
  '<p class="big">그래서 화면을 고치는 대신, <span class="o">서버가 있는 웹앱</span>으로 다시 만들었습니다.</p>',
  "다른 사람에게 보여 주려면 자료가 사람마다 갈라져야 했고, 실제 메일을 다루므로 계정·세션·권한을 처음부터 세워야 했습니다."))
S.append(sl("화면","screens","화면 흐름","로그인하면 \u2018오늘\u2019부터 열립니다","로그인 전에는 소개 화면만 · 로그인하면 자기 보드",
  '<div class="flow"><div class="st"><b>소개</b><span>로그인 전<br>기능 소개만</span></div><div class="ar">→</div><div class="st"><b>로그인</b><span>이메일·비밀번호<br>또는 Google</span></div><div class="ar">→</div><div class="st hl"><b>오늘</b><span>급한 일부터<br>오늘 3가지</span></div></div>'
  '<div class="row">'+card("취업","로드맵 · 자격증 · Lab · 지원 · 면접 · 시장 · 작업물")+card("메일","주인 계정만 · 분류 묶음과 원문 링크")+card("돈","고정비 · 구매 노트")+card("메모","생각 · 할 일 · 살 것을 한 줄로 담기")+'</div>',
  "메뉴는 오늘 · 취업 · 메일 · 돈 · 메모 다섯 갈래입니다. 로그인 전에는 소개 화면만 보이고, 로그인하면 그 계정의 보드만 열립니다."))
S.append(sl("화면","screens","오늘","오늘: 급한 일부터 챙깁니다","가상 자료를 넣은 데모 계정 화면",
  f'<div class="row" style="align-items:center"><img class="shot" src="{SH}today.png" style="height:560px" alt="">'
  +calls(("지금 할 것","마감이 가까운 급한 일만 맨 위에"),("오늘 3가지","오늘 할 일은 세 개만, 빈 자리는 가까운 시험에서 제안"),("시험 카드","남은 날 · 지난 점수 · 합격선을 한 장에"))+'</div>',
  "첫 화면은 지금 할 것, 오늘 3가지, 가장 가까운 시험 순서입니다. 아래쪽에 이번 주 할 일, 지원 현황, 다가오는 날이 이어집니다."))
S.append(sl("화면","screens","취업","취업: 공고부터 면접까지 한 메뉴에","지원 · 자격증 화면 (가상 자료)",
  f'<div class="row" style="align-items:center"><img class="shot" src="{SH}apply.png" style="height:560px" alt="">'
  +calls(("지원 흐름","지원할 공고 → 쓰는 중 → 결과 대기 → 면접 → 합격·마감"),("자격증","시험일 · 지난 점수 · 약한 영역을 기록"),("같은 메뉴","로드맵 · Lab · 면접 질문 · 시장 · 작업물"))+'</div>',
  "취업 메뉴는 로드맵, 자격증, Lab, 지원, 면접, 시장, 작업물 일곱 칸입니다. 회사 이름과 점수는 모두 화면을 보이기 위한 가상 자료입니다."))
S.append(sl("화면","screens","메일","메일: 분류된 결과만 읽기 전용으로","가상 메일함으로 찍은 화면",
  f'<div class="row" style="align-items:center"><img class="shot" src="{SH}mail.png" style="height:560px" alt="">'
  +calls(("읽기 전용","메일 도구가 5분마다 분류한 DB를 mode=ro로만 엽니다"),("묶어서 보기","지금 할 것 · 일정 잡을 것 · 결제로 나눠 보여 줍니다"),("원문은 누를 때만","그 묶음의 최근 5통만, 비밀값은 가리고 글자로만"))+'</div>',
  "메일 메뉴는 주인 계정만 봅니다. 회사 이름과 메일은 모두 지어낸 가상 자료입니다."))
S.append(sl("화면","screens","돈 · 메모","돈과 메모도 같은 보드에서","고정비 · 구매 노트 · 생각담기 (가상 자료)",
  f'<div class="row"><div style="flex:1"><img class="shot" src="{SH}money.png" style="width:100%" alt=""><p class="cap">돈: 매달 나가는 돈과 살 것</p></div>'
  f'<div style="flex:1"><img class="shot" src="{SH}memo.png" style="width:100%" alt=""><p class="cap">메모: 한 줄로 담고 생각 · 할 일 · 살 것으로 나눔</p></div></div>',
  "메모에 할 일로 담은 것은 오늘 화면의 할 일로도 이어집니다. 돈 메뉴는 고정비와 구매 노트를 모읍니다."))
S.append(sl("화면","screens","좁은 화면 · 어두운 화면","좁은 화면과 어두운 화면","같은 보드를 휴대폰 폭(390px)과 어두운 화면에서",
  f'<div class="row" style="align-items:center;justify-content:center"><img class="shot" src="{SH}mobile.png" style="height:560px" alt=""><img class="shot" src="{SH}dark.png" style="height:560px" alt=""></div>',
  "휴대폰 폭에서는 카드가 한 줄로 쌓이고, 어두운 화면은 오른쪽 위 버튼으로 바꿉니다."))
S.append(sl("구성","arch","구성","PC 한 대에서 돌리고, 바깥에는 터널로만 엽니다","Windows PC의 WSL Ubuntu · 따로 빌린 서버 없음",
  '<div class="flow"><div class="st"><b>브라우저</b><span>didimdol.site</span></div><div class="ar">→</div><div class="st"><b>Cloudflare</b><span>DNS · TLS<br>Turnstile</span></div><div class="ar">→</div><div class="st hl"><b>Tunnel</b><span>바깥으로<br>열린 포트 없음</span></div><div class="ar">→</div><div class="st"><b>FastAPI</b><span>systemd 사용자 서비스<br>127.0.0.1에만</span></div><div class="ar">→</div><div class="st"><b>SQLite</b><span>계정별 자료<br>WAL · 0600</span></div></div>'
  '<div class="row">'+card("메일 도구 (mail-sift)","지메일 · 네이버 메일을 가져와 분류합니다. 디딤돌은 그 DB를 읽기 전용으로만 엽니다.")
  +card("백업","매일 03:30 사본을 같은 PC의 두 디스크(SSD·HDD)에. PC 밖 사본은 아직 없습니다.")
  +card("감시","백업 사본이 36시간보다 오래되면 별도 감시가 알립니다.")+'</div>',
  "Cloudflare Tunnel로 PC의 포트를 열지 않고 도메인에 연결했습니다. 앱은 루프백 주소에만 붙고, 메일 도구의 DB는 읽기 전용으로 엽니다."))
S.append(sl("선택","choice","도구와 서비스","무엇으로 만들었고, 왜 골랐나","혼자 운영할 수 있는 크기로",
  '<table><thead><tr><th>층</th><th>무엇</th><th>왜</th></tr></thead><tbody>'
  '<tr><td><b>실행</b></td><td>WSL Ubuntu · systemd 사용자 서비스</td><td>로그인하지 않아도 뜨고, 서버를 빌리지 않음</td></tr>'
  '<tr><td><b>공개</b></td><td>Cloudflare Tunnel · Turnstile</td><td>포트를 열지 않고 도메인으로 연결 · 자동 가입 막기</td></tr>'
  '<tr><td><b>앱</b></td><td>FastAPI · SQLite(WAL)</td><td>혼자 운영할 수 있는 크기의 서버와 DB</td></tr>'
  '<tr><td><b>로그인</b></td><td>이메일+비밀번호(argon2id) · Google(OIDC)</td><td>Google은 기본 범위(openid · email · profile)만</td></tr>'
  '<tr><td><b>백업</b></td><td>매일 사본 · 같은 PC의 두 디스크</td><td>SSD 고장에 견딤 · 키는 DB 사본과 다른 폴더에</td></tr></tbody></table>',
  "실행, 공개, 앱, 로그인, 백업 다섯 층으로 나눴습니다. 기준은 PC 한 대에서 혼자 운영하고 지킬 수 있는가였습니다."))
S.append(sl("선택","choice","DB 선택","SQLite, 이 규모에 맞는가","AI 도구 추천으로 정하고, 운영하며 확인한 점",
  '<div class="row">'+card("지킬 서버가 하나 줄어듭니다","DB가 파일 하나라 DB 서버를 따로 띄우고 지킬 필요가 없습니다. WAL 모드로 읽기가 쓰기를 기다리지 않게 했습니다.",'<span class="tag ok">운영</span>')
  +card("백업과 되살리기가 단순합니다","온라인 백업 API로 사본을 뜨고, 무결성 검사가 ok일 때만 남깁니다. 되살릴 때는 사본 파일을 제자리에 둡니다.",'<span class="tag ok">백업</span>')+'</div>'
  '<div class="row">'+card("메일 도구와 같은 방식","메일 도구도 SQLite라, 디딤돌은 그 파일을 읽기 전용(mode=ro · query_only)으로 열어 쓰기를 막습니다.",'<span class="tag ok">연결</span>')
  +card("지운 자료가 파일에 남지 않게","secure_delete로 지운 행을 덮어쓰고, 파일 권한은 0600입니다.",'<span class="tag ok">보안</span>')+'</div>'
  '<p class="note"><span class="x">한계</span> · 쓰기는 한 번에 하나라, 사용자가 크게 늘면 서버형 DB(PostgreSQL 등)로 옮겨야 합니다.</p>',
  "SQLite는 AI 도구가 추천한 구성을 받아들인 선택입니다. 운영 부담, 백업, 메일 도구와의 연결, 삭제 보장 네 가지로 이 규모에 맞는지 확인했고, 사용자가 크게 늘면 바꿔야 한다는 점도 함께 적었습니다."))
S.append(sl("선택","choice","AI와 모델","AI는 잘하는 일에만 나눠 씁니다","생각 갈래(주인 계정 전용) · 메일 분류",
  '<div class="flow"><div class="st"><b>생각 한 줄</b><span>메모에 담은 고민</span></div><div class="ar">→</div><div class="st"><b>Codex</b><span>갈래 만들기<br>정해 둔 JSON 모양으로만</span></div><div class="ar">→</div><div class="st hl"><b>Jev</b><span>어느 갈래가 합리적인지<br>확률 · 점수로 판단</span></div><div class="ar">→</div><div class="st"><b>Claude</b><span>자세한 비교<br>누를 때만</span></div></div>'
  '<div class="row">'+card("안 될 때","갈래 만들기가 실패하면 미리 적어 둔 방향 사전(24개)에서 고르고, 비교는 Claude가 안 되면 Codex가 씁니다.")
  +card("비용 상한","Jev는 하루 입력 20만 토큰을 넘기면 요청 전에 막습니다.")
  +card("보내지 않는 것","메일 내용은 보내지 않고, 비밀번호 · 토큰처럼 보이는 문자열은 보내기 전에 가립니다.")+'</div>'
  '<p class="note">메일 분류는 메일 도구가 Claude(claude -p, 구독)로 등급 · 할 일 · 결제를 뽑습니다. 앱 구현에는 AI 도구를 썼고, 결과는 테스트와 실제 화면으로 확인했습니다.</p>',
  "글을 쓰는 일, 판단하는 일, 길게 비교하는 일을 서로 다른 모델에 나눴습니다. 생각 갈래는 주인 계정에서만 쓰입니다."))
S.append(sl("선택","choice","생각 갈래 화면","생각 한 줄을 갈래로 나누고 점수를 붙입니다","가상 생각에 실제 Codex · Jev · Claude를 돌린 화면",
  f'<div class="row" style="align-items:center"><img class="shot" src="{SH}think.png" style="height:560px" alt="">'
  +calls(("Codex","갈래를 만듭니다 (최대 6개, 정해 둔 JSON 모양)"),("Jev","목표 도움 · 부담 · 오늘 시작으로 점수를 매깁니다"),("Claude","‘자세히 비교’를 누를 때만 글을 씁니다"))+'</div>',
  "가상 생각 “시험 끝나고 첫 주말을 어떻게 쓸지”에 실제 모델을 돌린 결과입니다. 이 한 번에 Jev 입력은 2,835토큰이었습니다."))
S.append(sl("검증","verify","검증","남의 자료는 어떤 경로로도 못 읽게","옮긴 자료는 수로 맞추고, 지킬 것은 테스트로 고정",
  '<div class="kpis"><div class="kpi"><b>16<small style="font-size:28px">/16</small></b><span>옛 디딤과 행 수가<br>맞은 자료 종류</span></div><div class="kpi"><b>100+</b><span>디딤돌 테스트<br>인증 · CSRF · 사용자 분리</span></div><div class="kpi"><b>29</b><span>메일 도구 전면 검수에서<br>찾아 고친 결함</span></div><div class="kpi"><b>0</b><span>PC에서 바깥으로<br>연 포트</span></div></div>'
  '<table><thead><tr><th>위협</th><th>막는 방법</th></tr></thead><tbody><tr><td><b>남의 보드 읽기</b></td><td>세션 사용자로만 조회 · 남의 항목은 \u201c없음\u201d과 같은 404</td></tr><tr><td><b>요청 위조(CSRF)</b></td><td>쓰기 요청마다 출처와 토큰을 함께 검사</td></tr><tr><td><b>계정 유추</b></td><td>가입 · 로그인 실패 · 재설정이 계정 유무와 관계없이 같은 답</td></tr></tbody></table>',
  "옛 자료 16종은 행 수를 대조해 모두 맞았습니다. 계정 분리와 보안 규칙은 테스트로 고정했고, 메일 도구는 전면 검수에서 29가지를 고쳤습니다."))
S.append(sl("검증","verify","한계","확인하지 않은 범위","남겨 둔 것",
  '<div class="row">'+card("PC 한 대","PC가 꺼지면 사이트도 멈춥니다. 이중화나 여러 서버 운영은 하지 않았습니다.",'<span class="tag warn">운영</span>')
  +card("분류 품질","메일 분류 정확도는 측정하지 않았습니다. 검수는 집계와 표시가 데이터와 맞는지만 봤습니다.",'<span class="tag warn">측정</span>')
  +card("다른 사용자의 메일","다른 사용자가 자기 메일을 연결하는 기능은 아직 없습니다. 안전장치만 테스트로 고정했습니다.",'<span class="tag warn">기능</span>')+'</div>'
  '<p class="big">사용자 수나 운영 규모를 말하는 프로젝트가 아닙니다.<br>혼자 쓰는 도구를 <span class="o">남에게 열어도 되는 구조</span>로 옮긴 기록입니다.</p>',
  "분류 정확도, 사용자 규모, 상용 운영 경험으로 넓혀 말하지 않습니다."))
json.dump(S,open("tools/slides/didim.json","w"),ensure_ascii=False,indent=1)
print(len(S))
