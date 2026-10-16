#!/usr/bin/env python3
"""발표 자료 단계 전환 효과 만들기 (Mealplanning).
Canva에서는 움직임을 여러 장으로 나눠 표현했다(스포트라이트가 옮겨 가는 화면, 캐릭터가 흐름을 따라 이동하는 그림).
이 스크립트는 이웃한 두 장을 비교해 deck.js가 쓸 전환 정보를 만든다.
  - lift : 새로 또렷해진 영역(새 화면·팝업·강조된 패널). 살짝 떠오르며 나타난다.
  - mv   : 캐릭터(밀플래닝 마스코트)가 옮겨 간 위치. 앞 장 위치에서 새 위치로 이동한다. 스프라이트는 m{새 장}.webp
  - hdr  : 두 장의 위쪽이 같은 높이(비율). 슬라이드를 넘길 때 그 부분은 움직이지 않는다.
  - bar/focus/unfocus : 화면을 옆으로 이어 붙이며 아래 진행 막대가 옮겨 가는 장(유튜브 추출·영수증 OCR).
           막대는 앞 위치에서 새 위치로 미끄러지고, 지금 볼 화면은 커진 채 머물고, 지난 화면은 작아지며 흐려진다.
  - out  : 강조가 풀린 영역(앞 장에서 또렷했고 이번 장에서 흐려진 곳). 작아지며 사라진다.
  - spot : 나머지가 어두워지는데 그대로 남은 영역(설명할 곳만 밝게 둔 장). 한 번 크게 숨 쉬듯 강조한다.
    python3 tools/deck/fx.py    # projects/mealplanning/index.html 의 deck-data에 fx를 넣고 스프라이트를 쓴다
필요: numpy, scipy, Pillow"""
import json, re
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage as nd

ROOT = Path(__file__).resolve().parents[2]
PAGE = ROOT / "projects/mealplanning/index.html"
DECK = ROOT / "assets/deck/mealplanning"
html = PAGE.read_text(encoding="utf-8")
RX = re.compile(r'(<script type="application/json" id="deck-data">)(.*?)(</script>)', re.S)
data = json.loads(RX.search(html).group(2))
_cache = {}
def img(p):
    if p not in _cache:
        _cache[p] = np.asarray(Image.open(DECK / f"p{p:03d}.webp").convert("RGB")).astype(np.float32)
    return _cache[p]
H, W = img(1).shape[:2]
R = lambda b: [round(b[0] / W, 4), round(b[1] / H, 4), round((b[2] - b[0]) / W, 4), round((b[3] - b[1]) / H, 4)]

def lstd(g):
    m = nd.uniform_filter(g, 9); m2 = nd.uniform_filter(g * g, 9)
    return np.sqrt(np.maximum(m2 - m * m, 0))

def merge(bs, pad=10):
    bs = [list(b) for b in bs]
    changed = True
    while changed:
        changed = False
        for i in range(len(bs)):
            for j in range(i + 1, len(bs)):
                a, b = bs[i], bs[j]
                if a[0] - pad < b[2] and b[0] - pad < a[2] and a[1] - pad < b[3] and b[1] - pad < a[3]:
                    bs[i] = [min(a[0], b[0]), min(a[1], b[1]), max(a[2], b[2]), max(a[3], b[3])]
                    bs.pop(j); changed = True; break
            if changed: break
    return bs

# 마스코트 틀: 71→72에서 ECR 위로 옮겨 온 캐릭터(배경과 다른 픽셀만)
def mascot_template():
    a, b = img(71), img(72)
    x, y, w, h = 334, 525, 45, 48
    pa, pb = a[y:y+h, x:x+w], b[y:y+h, x:x+w]
    mask = np.abs(pa - pb).max(2) > 30
    return pb.mean(2), mask
TPL, TMASK = mascot_template()
TH, TW = TPL.shape

def ncc_at(g, x, y):
    if x < 0 or y < 0 or x + TW > W or y + TH > H: return -1
    p = g[y:y+TH, x:x+TW][TMASK]; t = TPL[TMASK]
    p = p - p.mean(); t = t - t.mean()
    d = np.sqrt((p * p).sum() * (t * t).sum())
    return float((p * t).sum() / d) if d else -1

def find_mascots(g, boxes):
    found = []
    for x0, y0, x1, y1 in boxes:
        if x1 - x0 > 160 or y1 - y0 > 200: continue
        best = (-1, 0, 0)
        for y in range(y0 - 12, y1 - TH + 13, 2):
            for x in range(x0 - 12, x1 - TW + 13, 2):
                s = ncc_at(g, x, y)
                if s > best[0]: best = (s, x, y)
        if best[0] > 0.72:
            s, x, y = best
            for yy in range(y - 2, y + 3):
                for xx in range(x - 2, x + 3):
                    s2 = ncc_at(g, xx, yy)
                    if s2 > s: s, x, y = s2, xx, yy
            if not any(abs(x - f[0]) < 8 and abs(y - f[1]) < 8 for f in found): found.append((x, y, s))
    return found

def sprite(a, b, x, y, name):
    A, B = img(a), img(b)
    pad = 4
    xs, ys = max(x - pad, 0), max(y - pad, 0); xe, ye = min(x + TW + pad, W), min(y + TH + pad, H)
    pb = B[ys:ye, xs:xe]; pa = A[ys:ye, xs:xe]
    m = nd.binary_dilation(np.abs(pb - pa).max(2) > 22, iterations=1)
    m = nd.binary_fill_holes(m)
    alpha = Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.7))
    im = Image.fromarray(pb.astype(np.uint8)).convert("RGBA"); im.putalpha(alpha)
    im.save(DECK / name, "WEBP", lossless=True)
    return [xs, ys, xe, ye]

def find_bar(A):
    # 화면 아래쪽의 남색 진행 막대(선 + 양 끝 원). 너비 200px 이상, 높이 60px 이하인 어두운 덩어리
    y0 = int(H * 0.72)
    dark = A[y0:].sum(2) < 250
    lab, n = nd.label(nd.binary_closing(dark, iterations=2))
    best = None
    for sl in nd.find_objects(lab):
        y, x = sl
        w, h = x.stop - x.start, y.stop - y.start
        if not (240 <= w <= 360 and 26 <= h <= 40):
            continue
        reg = A[y0 + y.start:y0 + y.stop, x.start:x.stop]; m = reg.sum(2) < 250
        col = reg[m].mean(0)
        if 0.2 <= m.mean() <= 0.45 and col[2] - col[0] > 25:   # 선 + 양 끝 원(속이 빔), 남색
            best = [x.start, y.start + y0, x.stop, y.stop + y0]
    return best

def boxes_of(mask, minfrac):
    lab, n = nd.label(mask); out = []
    for k, sl in enumerate(nd.find_objects(lab)):
        if (lab[sl] == k + 1).sum() >= minfrac * W * H:
            y, x = sl; out.append([x.start, y.start, x.stop, y.stop])
    return [b_ for b_ in merge(out) if (b_[2] - b_[0]) * (b_[3] - b_[1]) <= 0.5 * W * H]

def overlap_x(b, lo, hi):
    return max(0, min(b[2], hi) - max(b[0], lo))

def analyze(a, b, sprites=True):
    A, B = img(a), img(b)
    raw = np.abs(A - B).max(2) > 40
    frac = float(raw.mean())
    fx = {}
    if frac == 0: return fx
    rows = raw.any(1)
    top = int(np.argmax(rows)) if rows.any() else H
    if top / H >= 0.05: fx["hdr"] = round((top - 2) / H, 4)
    big = frac > 0.6
    diff = nd.binary_dilation(raw, iterations=6)
    # 설명할 곳(spot): ① 어두운 막 위에서 새로 밝아진 덩어리, 없으면 ② 나머지가 어두워지는데 그대로 남은 덩어리
    if frac > 0.25:
        lumB = B.mean(2); content = np.zeros((H, W), bool); content[int(H * 0.13):] = True
        def pick(mask, need_area):
            lab, n = nd.label(mask); cands = []
            for k, sl in enumerate(nd.find_objects(lab)):
                y, x = sl; bw, bh = x.stop - x.start, y.stop - y.start
                if (lab[sl] == k + 1).sum() >= need_area * W * H and 0.02 * W * H <= bw * bh <= 0.4 * W * H and bw < W * 0.9:
                    inside = np.zeros((H, W), bool); inside[sl] = True
                    # 둘레가 어두운 막일 때만: 안쪽이 바깥(본문)보다 확실히 밝아야 한다
                    if lumB[inside].mean() - lumB[content & ~inside].mean() > 30:
                        cands.append((bw * bh, [x.start, y.start, x.stop, y.stop]))
            return max(cands)[1] if cands else None
        dl = B.mean(2) - A.mean(2)
        bright = nd.binary_opening(nd.binary_closing(dl > 35, iterations=6), iterations=6); bright[:int(H * 0.13)] = False
        sp = pick(bright, 0.01)
        if sp is None and dl[raw].mean() < -20:
            keep = ~nd.binary_dilation(raw, iterations=4); keep[:int(H * 0.13)] = False
            sp = pick(nd.binary_opening(keep, iterations=3), 0.008)
        if sp: fx["spot"] = R(sp)
    lab, n = nd.label(nd.binary_dilation(nd.binary_closing(raw, iterations=3), iterations=3))
    small = []
    for sl in nd.find_objects(lab):
        y, x = sl; small.append([x.start, y.start, x.stop, y.stop])
    ga, gb = A.mean(2), B.mean(2)
    if sprites and frac < 0.03:  # 캐릭터 이동은 바뀐 곳이 아주 작은 장에서만
        oa, nb = find_mascots(ga, small), find_mascots(gb, small)
        still = [(o, q) for o in oa for q in nb if abs(o[0] - q[0]) < 6 and abs(o[1] - q[1]) < 6]
        oa = [o for o in oa if not any(o is s_[0] for s_ in still)]
        nb = [q for q in nb if not any(q is s_[1] for s_ in still)]
        if len(nb) == 1:
            q = nb[0]; box = sprite(a, b, q[0], q[1], f"m{b:03d}.webp")
            mv = {"to": R(box), "s": f"m{b:03d}.webp"}
            if len(oa) == 1:
                o = oa[0]; dx, dy = q[0] - o[0], q[1] - o[1]
                mv["from"] = R([box[0] - dx, box[1] - dy, box[2] - dx, box[3] - dy])
            fx["mv"] = mv
    D = nd.uniform_filter(lstd(gb) - lstd(ga), 31)
    inmask = (D > 5) & diff
    boxes = boxes_of(nd.binary_closing(inmask, iterations=6), 0.006)
    if not boxes:   # 흩어진 작은 것(아이콘 격자)은 더 크게 묶어 한 덩어리로
        boxes = boxes_of(nd.binary_closing(inmask, iterations=14), 0.006)
    boxes = [b_ for b_ in boxes if not (b_[1] < H * 0.12 and b_[3] - b_[1] < H * 0.15)]   # 제목·메뉴 줄의 짧은 글자는 띄우지 않는다(위에서 시작하는 큰 화면은 둔다)
    outs = boxes_of(nd.binary_closing((D < -5) & diff, iterations=6), 0.015)
    if "mv" in fx: boxes = [b_ for b_ in boxes if (b_[2] - b_[0]) * (b_[3] - b_[1]) > 0.02 * W * H]
    if big:   # 거의 다른 장: 가운데 큰 카드처럼 새로 뜬 것만 남기고 나머지는 겹쳐 넘긴다
        boxes = [b_ for b_ in boxes if (b_[2] - b_[0]) * (b_[3] - b_[1]) <= 0.35 * W * H][:2]; outs = []
    # 진행 막대가 있는 장: 막대 이동 + 지금 볼 화면(막대 위) + 지난 화면
    bb, ba = find_bar(B), find_bar(A)
    if bb and (not ba or abs(bb[0] - ba[0]) > 20):
        cand = [b_ for b_ in boxes if overlap_x(b_, bb[0], bb[2]) > 0.5 * (bb[2] - bb[0]) and b_[1] < bb[1] - 100]
        if cand:
            f = max(cand, key=lambda b_: (b_[2] - b_[0]) * (b_[3] - b_[1]))
            f = [max(f[0], bb[0] - 12), f[1], min(f[2], bb[2] + 12), bb[1] - 2]   # 화면 + 그 아래 설명 글자까지
            fx["focus"] = R(f)
            fx["bar"] = {"to": R([bb[0] - 4, bb[1] - 4, bb[2] + 4, bb[3] + 4])}
            if ba:
                fx["bar"]["from"] = R([ba[0] - 4, ba[1] - 4, ba[2] + 4, ba[3] + 4])
                uc = [b_ for b_ in outs if overlap_x(b_, ba[0], ba[2]) > 0.5 * (ba[2] - ba[0])]
                if uc:
                    u = max(uc, key=lambda b_: (b_[2] - b_[0]) * (b_[3] - b_[1]))
                    fx["unfocus"] = R([max(u[0], ba[0] - 12), u[1], min(u[2], ba[2] + 12), ba[1] - 2])
            boxes = [b_ for b_ in boxes if b_ is not None and overlap_x(b_, bb[0], bb[2]) == 0]
            outs = []
    boxes.sort(key=lambda b_: (round(b_[1] / 120), b_[0]))
    if boxes: fx["lift"] = [R(b_) for b_ in boxes[:6]]
    if outs and "mv" not in fx: fx["out"] = [R(b_) for b_ in outs[:4]]
    return fx

if __name__ == "__main__":
    for f in DECK.glob("m*.webp"): f.unlink()
    FX = {}
    S = data["slides"]
    for k, s in enumerate(S):
        for a, b in zip(s["p"], s["p"][1:]):
            if s.get("v") and b == s["p"][-1]: continue
            r = analyze(a, b)
            if r: FX[f"{a}-{b}"] = r
        if k + 1 < len(S):
            a, b = s["p"][-1], S[k + 1]["p"][0]
            r = analyze(a, b, sprites=False)
            if "hdr" in r: FX[f"{a}-{b}"] = {"hdr": r["hdr"]}
    data["fx"] = FX
    new = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    PAGE.write_text(RX.sub(lambda m: m.group(1) + new + m.group(3), html, count=1), encoding="utf-8")
    print("transitions", len(FX), "lift", sum("lift" in v for v in FX.values()), "mv", sum("mv" in v for v in FX.values()),
          "hdr", sum("hdr" in v for v in FX.values()), "json", len(json.dumps(FX)))
    for k, v in FX.items():
        if "mv" in v: print(k, v["mv"])
