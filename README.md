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

Playwright가 있는 검증 환경에서는 `node tools/qa-browser.cjs`로 4개 페이지를
1440/768/390/320px에서 확인한다. `QA_URL`, `QA_OUTPUT`, `QA_CHROMIUM`으로
서버 주소·캡처 위치·브라우저 실행 파일을 지정할 수 있다. 기본 캡처 폴더 `qa-output/`은 Git에서 제외한다.
