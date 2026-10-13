// 연락하기 → Slack 전달 서버(Cloudflare Worker, contact-worker/). Slack 웹후크는 Worker 비밀값에만 있다.
window.PORTFOLIO_CONTACT = { endpoint: "https://geonu-contact.goonbam009.workers.dev/contact" };
// 거누(건우에 대한 RAG 챗봇) 응답 서버. 비어 있거나 응답이 없으면 브라우저 안의 엔진으로 간단히 답한다.
window.PORTFOLIO_CHAT = { endpoint: "https://geonu-rag.goonbam009.workers.dev" };
