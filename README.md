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
외부 이미지·GitHub 링크는 네트워크가 필요하다. `--external`은 인증 정보 없이 외부 링크의 현재 HTTP 응답을 검사한다. 접근 오류는 실패로 보고하며, 응답 성공이 내용의 정확성까지 보증하지는 않는다.

Playwright가 있는 검증 환경에서는 `node tools/qa-browser.cjs`로 5개 페이지(홈과 상세 4개)를
1440/768/390/320px에서 확인한다. `QA_URL`, `QA_OUTPUT`, `QA_CHROMIUM`으로
서버 주소·캡처 위치·브라우저 실행 파일을 지정할 수 있다. 기본 캡처 폴더 `qa-output/`은 Git에서 제외한다.

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
거누의 대화 UI는 준비되어 있으며 실제 RAG 응답 서버는 아직 연결하지 않았다.
테마 설정은 공통 `theme.css`와 `portfolio-ui.js`를 사용한다.
