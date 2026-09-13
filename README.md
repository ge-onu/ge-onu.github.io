# ge-onu.github.io
Personal portfolio for Infrastructure &amp; AIOps engineering

## 로컬 확인

정적 HTML/CSS/JavaScript 사이트다. framework build나 runtime dependency는 없다.

```bash
python3 -m http.server 8765 --bind localhost
python3 tools/check-site.py
python3 tools/scan-evidence.py
python3 tools/test-scan-evidence.py
node --check project-tabs.js
```

브라우저에서 `http://localhost:8765`를 열어 홈 카드 → 상세 페이지 → 근거 링크를 확인한다.
Mealplanning의 직접 링크로 중첩 항목이 열리는지, 모두 펼치기/접기,
기존 Kubernetes 실습의 탭과 키보드 이동을 desktop/mobile에서 확인한다.
외부 이미지·GitHub 링크는 네트워크가 필요하다. 정적 검사는 외부 URL의 응답을 보증하지 않는다.

Playwright가 있는 검증 환경에서는 `node tools/qa-browser.cjs`로 4개 페이지를
1440/768/390/320px에서 확인한다. `QA_URL`, `QA_OUTPUT`, `QA_CHROMIUM`으로
서버 주소·캡처 위치·브라우저 실행 파일을 지정할 수 있다. 기본 캡처 폴더 `qa-output/`은 Git에서 제외한다.

## 공개 범위

- Mealplanning: 당시 실측과 개인 기여 범위를 유지한다.
- RAG Retrieval PoC: 개발 평가 후 동결된 상태이며 unseen holdout v2 이전이다.
- 기존 Kubernetes Multi-node Lab: 이전 개인 실습 기록이다.
- 새 Incident Response Lab: `_drafts/kubernetes-incident-response.md`는 편집용 구성만 담는다.
  Jekyll 기본 빌드에서 제외되는 `_drafts`와 `published: false`를 사용하며 공개 route는 없다.
  공개 시 `--drafts`/`--unpublished` 옵션을 사용하거나 초안을 복사하지 않는다.
  Evidence 검토·사용자 재현·Control Plane ACCEPT 전에는 공개 항목을 만들지 않는다.

TASK-CAREER-002는 랭킹의 채택 보류 판단을 명시적으로 요구한다.
따라서 기존 scanner의 activation-state 서술 일괄 금지만 해제했으며,
근거 없는 Production·개인화 성과, 한계 없는 NDCG, Secret 검사는 유지한다.
공개 원문 자산을 되살리거나 합성 라벨 점수를 실제 사용자 성과로 쓰지 않는다.

작업 branch push와 main 배포는 구분한다. main 반영은 독립 Review와 Control Plane 승인 뒤 수행한다.
