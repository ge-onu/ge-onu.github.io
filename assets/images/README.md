# 이미지 슬롯

## kubernetes-logo.png (대기 중)

Kubernetes 실습을 대표하는 이미지를 이 경로에 두면 커버로 사용된다.

- 경로: `assets/images/kubernetes-logo.png`
- 권장: 투명 배경 PNG 또는 SVG · 정사각에 가까운 비율 · 512px 이상
- 연결 지점 2곳
  - `index.html` — Kubernetes 카드 `.project-cover-image--contain`
  - `projects/kubernetes-lab/index.html` — 히어로 `.project-hero-media--k8s > img`
- 표시 방식: `object-fit: contain` 이라 **비율이 왜곡되지 않는다.**
  배경은 `#f5f8fe` 로 지정돼 있어 투명 배경이 검게 보이지 않는다.

파일을 두면 두 곳의 `src` 를 `assets/kubernetes-lab-cover.svg` → `assets/images/kubernetes-logo.png`
(상세 페이지는 `../../assets/images/kubernetes-logo.png`) 로 바꾸기만 하면 된다.
