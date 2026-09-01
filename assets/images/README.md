# 이미지 슬롯

## 1. home-icon.png (대기 중)

상단 홈 버튼 아이콘. 현재는 같은 모양의 **인라인 SVG** 로 동작 중이며, 파일을 두면 그대로 교체된다.

- 경로: `assets/images/home-icon.png`
- 권장: 투명 배경 PNG · 정사각 비율 · 64px 이상 (표시 크기 18px, 레티나 대비)
- 적용 위치 3곳 — 각 파일의 `<span class="identity-mark">` 안
  - `index.html`
  - `projects/mealplanning/index.html`
  - `projects/kubernetes-lab/index.html`

교체 방법 — `<span class="identity-mark">` 안의 `<svg …>…</svg>` 를 아래로 바꾼다.

```html
<!-- 홈(index.html) -->
<img class="identity-home-img" src="assets/images/home-icon.png" alt="" aria-hidden="true">

<!-- 상세 페이지 2종 -->
<img class="identity-home-img" src="../../assets/images/home-icon.png" alt="" aria-hidden="true">
```

`.identity-home-img` 는 `width/height 18px` + `object-fit: contain` 이라 **비율이 왜곡되지 않는다.**
링크(`<a class="identity">`)에 `aria-label="홈으로 이동"` 이 이미 있으므로 이미지의 `alt` 는 빈 값으로 둔다.

## 2. kubernetes-logo.png (대기 중)

Kubernetes 실습을 대표하는 이미지. 현재는 멀티노드 구성을 나타내는 SVG 커버가 들어가 있다.

- 경로: `assets/images/kubernetes-logo.png`
- 권장: 투명 배경 PNG 또는 SVG · 정사각에 가까운 비율 · 512px 이상
- 적용 위치 2곳
  - `index.html` — Kubernetes 카드 `.project-cover-image--contain`
  - `projects/kubernetes-lab/index.html` — 히어로 `.project-hero-media--k8s > img`
- 표시 방식: `object-fit: contain` · 배경 `#f5f8fe` → **비율 왜곡·검은 배경 없음**

교체 방법 — 두 곳의 `src` 를 `assets/kubernetes-lab-cover.svg` 에서
`assets/images/kubernetes-logo.png`(상세 페이지는 `../../assets/images/kubernetes-logo.png`) 로 바꾼다.
