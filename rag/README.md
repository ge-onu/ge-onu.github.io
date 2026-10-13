# 거누 — 건우에 대한 RAG 챗봇

geonu.site 오른쪽 아래의 거누는 이 사이트에 공개된 기록만 검색해서 답합니다.

| 단계 | 하는 일 | 파일 |
|---|---|---|
| 검색·판정 | BM25 검색, 주장 카드 라우팅, 근거 없으면 거절(closed-world), 기여 범위 판정 | `engine.js` |
| 답변 조립 | 거절 문장, 근거 묶음, 생성 프롬프트, 사실 검사, 생성 없는 답 | `answer.js` |
| 응답 서버 | 엔진 판정 → Gemini가 근거 안에서만 작성 → 숫자·기술명·금지 표현 검사(어긋나면 한 번 다시 쓰고, 그래도 어긋나면 근거 문장으로 답) | `worker/worker.js` |
| 근거 데이터 | 사이트 HTML → chunk 126개, 주장 카드 17개 | `data/`, `tools/bundle.py` |

## 출발점

엔진은 [RAG Retrieval PoC](../projects/rag-retrieval-poc/)의 FROZEN_V2 파이프라인(Python)을 JavaScript로 옮긴 것입니다.
PoC 평가 문항 100개와 추가 문항 10개에서 Python 원본과 출력이 바이트 단위로 같습니다(`chat` 확장을 끈 상태).

배포판에서 바꾼 것은 `tools/build_claims.py`에 이유와 함께 적었습니다.

- 사이트 개편으로 바뀐 근거 id를 다시 연결했습니다.
- 서버리스 문구를 "전환 판정·Lambda 구현"으로 정정했습니다.
- 공개된 학력·지원 직무는 거절하지 않도록 했습니다.
- 서버리스·역할·자격증 카드를 새로 만들었습니다.

엔진의 `chat` 옵션은 해요체 질문("써 봤어요?")도 경험 질문으로 읽습니다.

## 평가 (`node rag/tools/eval.mjs`)

| 항목 | PoC 동결 기준 | 배포판 |
|---|---|---|
| 근거 없는 질문 정상 거절 | 12/12 | 12/12 |
| 답할 질문 정상 답변 | 88/88 | 88/88 |
| 답한 질문의 인용 정확도 | 0.989 | 0.989 |
| 경계 질문(부정·적대) | 1.000 | 34/34 |
| 배포 점검 문항 | — | 19/19 |

PoC 정답 chunk id는 옛 사이트 기준이라, 글자 4-gram이 가장 많이 겹치는 지금 chunk로 옮겨 채점했습니다.
factual/paraphrase R@3는 0.975(39/40)입니다. 남은 1건은 새로 생긴 요약 구역이 상위에 올라온 경우라, 답의 근거는 맞습니다.

## 다시 만들기

```bash
python3 rag/tools/bundle.py          # 사이트 문구를 고친 뒤
node rag/tools/eval.mjs --fails       # 재평가
python3 rag/tools/bundle_worker.py /tmp/geonu-rag.mjs   # Worker 한 파일로 묶기 (또는 rag/worker 에서 npx wrangler deploy)
```

Worker 비밀값은 `GEMINI_API_KEY` 하나입니다. 무료 등급 Gemini 프로젝트(geonu-rag)의 키를 쓰고, 질문 원문은 저장하지 않습니다.
