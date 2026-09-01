# 이미지 자산

## 🔴 현재 상태 — 제공된 SVG 2종이 손상돼 사용 불가

`home-icon.svg` · `kubernetes-logo.svg` 는 base64 PNG 를 `<image>` 로 감싼 형식인데,
**PNG 페이로드가 손상**돼 브라우저에서 깨진 이미지로 표시된다. 검사 결과:

| 파일 | base64 길이 | 증상 |
|---|---|---|
| `home-icon.svg` | 1,759자 (**mod4 = 3 → 길이 자체가 부적합**) | IHDR 은 정상, **IDAT CRC 불일치 후 잘림** |
| `kubernetes-logo.svg` | 12,412자 | IHDR 은 정상, **PLTE CRC 불일치 후 청크 길이 손상** |

두 파일 모두 PNG 시그니처와 IHDR 까지는 읽히므로 크기(96×95 / 640×326)는 확인되지만,
픽셀 데이터가 깨져 렌더링되지 않는다. base64 문자열이 기록 과정에서 잘린 것으로 보인다.

**재업로드가 필요하다.** 원본 PNG/SVG 를 그대로 올리는 편이 안전하다
(base64 를 SVG 안에 다시 감싸지 않아도 된다).

## 재업로드 후 적용 방법

파일이 정상이면 아래 두 곳만 바꾸면 된다. CSS 는 이미 준비돼 있다.

### 홈 아이콘 — 3곳
`<span class="identity-mark">` 안의 인라인 `<svg class="identity-home">…</svg>` 를 교체:

```html
<!-- index.html -->
<img class="identity-home-img" src="assets/images/home-icon.svg" alt="" aria-hidden="true">
<!-- projects/*/index.html -->
<img class="identity-home-img" src="../../assets/images/home-icon.svg" alt="" aria-hidden="true">
```

`.identity-home-img` = 18px 정사각 박스 + `object-fit: contain` (모바일 19px) → **비율 유지**.
링크에 `aria-label="홈으로 이동"` 이 있으므로 이미지 `alt` 는 빈 값.

### Kubernetes 이미지 — 2곳
`assets/kubernetes-lab-cover.svg` 를 아래로 교체:

```html
<!-- index.html (카드) -->
src="assets/images/kubernetes-logo.svg"
<!-- projects/kubernetes-lab/index.html (히어로) -->
src="../../assets/images/kubernetes-logo.svg"
```

`object-fit: contain` + 여백만 지정돼 있고 배경색을 덧씌우지 않아, 투명 배경이 그대로 살아난다.

## 현재 임시로 쓰는 것

`assets/kubernetes-lab-cover.svg` — 멀티노드 구성을 나타내는 도형 커버.
정상 로고가 올라오면 삭제 대상.
