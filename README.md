# ge-onu.github.io
Personal portfolio for Infrastructure &amp; AIOps engineering

## 로컬 확인

정적 HTML/CSS/JavaScript 사이트다. framework build나 runtime dependency는 없다.

```bash
python3 -m http.server 8765 --bind localhost
python3 tools/check-site.py --external
python3 tools/scan-evidence.py
python3 tools/test-scan-evidence.py
python3 tools/test-check-site.py
node --check project-tabs.js
```

브라우저에서 `http://localhost:8765`를 열어 홈 카드 → 상세 페이지 → 근거 링크를 확인한다.
Mealplanning의 직접 링크로 중첩 항목이 열리는지, 모두 펼치기/접기,
기존 Kubernetes 실습의 탭과 키보드 이동을 desktop/mobile에서 확인한다.
`check-site.py`는 링크·프래그먼트·`alt`에 더해 **태그 중첩**도 본다.
여는 태그 없는 닫는 태그, 짝이 어긋난 태그, 안 닫힌 태그를 잡는다.
홈에 여는 `<p>` 없이 `</p>` 하나가 떠 있었는데 브라우저가 관대하게
넘어가고 검사는 통과했다 — 그 뒤 중첩이 통째로 어긋나 있었다.

`sitemap.xml`에는 공개 페이지 6개(홈과 상세 5개)를 적는다. 상세 페이지를 추가하면 여기에도 넣는다.
없는 주소는 GitHub Pages가 `404.html`을 보여 준다. 어느 경로에서 열려도 깨지지 않도록 자원 경로는 `/`로 시작한다.

외부 이미지·GitHub 링크는 네트워크가 필요하다. `--external`은 인증 정보 없이 외부 링크의 현재 HTTP 응답을 검사한다. 접근 오류는 실패로 보고하며, 응답 성공이 내용의 정확성까지 보증하지는 않는다.

Playwright가 있는 검증 환경에서는 `node tools/qa-browser.cjs`로 6개 페이지(홈과 상세 5개)를
1440/768/390/320px에서 확인한다. `QA_URL`, `QA_OUTPUT`, `QA_CHROMIUM`으로
서버 주소·캡처 위치·브라우저 실행 파일을 지정할 수 있다. 기본 캡처 폴더 `qa-output/`은 Git에서 제외한다.

## 화면 구성과 CSS

- `site.css`: 모든 페이지 공통 글꼴·색·머리말·꼬리말·버튼. 색 이름은 이전 CSS 변수에도 이어 준다.
- `portfolio.css`: 홈과 Mealplanning 상세 본문(A3 개편).
- `legacy-pages.css`: 구조를 그대로 둔 상세 페이지(RAG·Kubernetes·Infrastructure Lab·디딤)와 404의 폭 맞춤.
- 글꼴은 Pretendard 부분집합을 `assets/fonts/`에 직접 두고(OFL, 라이선스 동봉) `scripts/build-font-subset.py`로 다시 만든다.
- Mealplanning 상세의 이전 기록(A-1~D-3)은 `#record` 아래에 그대로 두었다. 기존 직접 링크(`#a2-serverless` 등)는 계속 열린다.
- 팀 프로젝트의 실행 환경(EKS·Argo CD·CI/CD·관측)은 "구성 방향과 도구를 팀이 함께 정했고, 설치·운영은 역할 분담에 따라 인프라 담당"으로 적는다. 개인 구축·운영으로 쓰지 않는다.

## 이력서 PDF

`/resume.pdf`는 공개용 1쪽 이력 요약이다. 전화번호·주소·사진·생년월일은 넣지 않는다.
머리말의 "이력서" 버튼과 홈의 "이력서 PDF" 버튼이 이 파일을 연다. 고칠 때는 같은 이름으로 덮어쓴다.

## Mealplanning 발표 자료 뷰어

Mealplanning 상세 위쪽의 "최종 발표를 넘겨 보기"는 팀 최종 발표(Canva)를 이미지로 내보낸 것이다.

- 파일: `assets/deck/mealplanning/pNNN.webp`(1600×900, 원본 페이지 번호), 영상 페이지는 `p49.mp4`·`p100.mp4`·`p112.mp4`(720p, 무음).
- 슬라이드 구성은 `projects/mealplanning/index.html`의 `#deck-data`(JSON)에 있다. Canva에서 애니메이션 대신 여러 장으로 나눈 페이지는 한 슬라이드의 `p` 배열(단계)로 묶는다.
- 동작은 `deck.js`: 단계는 겹쳐 넘기고 슬라이드는 옆으로 밀어 넘긴다. 방향키·스와이프·장 탭·자동 재생·전체 화면. 동작 줄이기에서는 애니메이션 없이 바뀐다.
- 공개 전 처리: 팀원 이름(2·6·133쪽)과 계정 이메일·AWS 계정 번호(126쪽)는 모자이크, 112쪽 영상의 설정 코드 구간(63~69초)은 흐림. 숨김 페이지(50·69쪽)와 실제 팀 사진(134쪽)은 넣지 않았다.
- 유료 Canva 요소(모니터 목업·곡선 화살표·꺾쇠)는 사용자 소유 사본에서 직접 그린 그림으로 바꾼 뒤 내보냈다.

## 디딤 상세

경로는 `projects/didim/`다. Home의 프로젝트 카드에서 연결한다.

- **저장소와 실행 화면을 링크하지 않는다.** 두 저장소(`mail-sift`, `didim`)는
  비공개이고, 화면과 데이터에는 실제 메일 제목·발신자·본문이 들어 있다.
  링크를 넣으면 공개 페이지에서 깨진 링크가 되고, 화면 캡처는 개인정보가 된다.
- 수치는 개인 메일함 한 벌(계정 2개·2,382통)에서 나온 것이다. 여러 사용자나
  운영 규모로 확대하지 않는다.
- 분류 정확도는 측정하지 않았다. 검수에서 확인한 것은 "집계와 표시가 데이터와
  일치하는가"이지 "판정이 옳은가"가 아니다 — 이 구분을 문구에서 유지한다.

## Infrastructure Lab Series 상태

새 상세 경로는 `projects/infrastructure-lab-series/`다. Home의 인프라 실습 카드에서 연결한다.
기본 공개 상태는 기술 구축·Agent 검증 완료, 사용자 Gate A/B/C 대기다.
초기 구축의 Agent-assisted 이력은 모든 상태에서 유지한다.

- 단일 공개 전환 위치: `infra-validation.js`의 `publishState`.
- 허용 값: `current`, `gate-a`, `gate-b`, `all-passed`.
- Control Plane이 실제 Gate A/B/C를 승인한 뒤 `current`를 `all-passed`로 변경한다. 구조·스타일·문구 추가 작성은 필요 없다.
- 로컬 미래 상태 QA: `http://localhost:8765/projects/infrastructure-lab-series/?infra-preview=all-passed`.
- 로컬 Home에도 같은 query를 사용한다. draft 표시와 상태는 두 화면에서 유지된다.
- 공개 호스트에서는 preview query를 무시한다. URL만으로 Gate 상태를 바꿀 수 없다.
- JavaScript가 없어도 전체 Lab·구조·한계는 읽을 수 있다. 개인 검증 상태는 보수적으로 표시를 보류한다.
- 전체 상태 분기 검증: `node tools/test-infra-validation.cjs`.
- 공통 동작은 `portfolio-ui.js`를 재사용하며 reduced-motion을 따른다.

다이어그램은 `python3 scripts/build-infra-diagram.py`로 생성한다.
SVG, 탭별 SVG, 애니메이션 SVG와 편집용 draw.io 원본을 함께 갱신한다.
서비스·HA / VPN / 관리·관측 / 모두 보기 탭은 `infra-diagram.js`가 담당한다.
서비스와 VPN에는 거누가 요청·응답 경로를 따라 움직이는 애니메이션이 있다.
카드 펼침 애니메이션은 항상 적용한다.

공개 화면에서는 구축 상태 배지와 별도의 검증 범위 섹션을 제거했다.
검증 상태 데이터와 공개 호스트의 미리보기 차단은 유지한다.

## Contact와 거누

`contact-chat.js`와 `contact-chat.css`가 공통 Contact 창과 이동 가능한 챗봇을 제공한다.
Contact는 `contact-config.js`에 설정된 Slack 웹후크로 직접 전송 요청한다.
브라우저의 opaque 응답은 수신 확인이 아니므로 성공 화면은 전송 요청 완료로 표시한다.
endpoint가 비어 있으면 폼 대신 메일 주소와 메일 쓰기(mailto)·이메일 복사 버튼을 보여 준다.
거누의 대화 UI는 준비되어 있으며 실제 RAG 응답 서버는 아직 연결하지 않았다.
그래서 `contact-chat.js`의 `chatEnabled`를 `false`로 두어 모든 페이지에서 거누를 숨긴다.
응답 서버를 연결한 뒤 `true`로 바꾸면 다시 나타난다. 코드는 지우지 않았다.
테마 설정은 공통 `theme.css`와 `portfolio-ui.js`를 사용한다.
