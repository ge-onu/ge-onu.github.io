#!/usr/bin/env python3
"""발표 자료 단계 전환 효과 만들기 (Mealplanning).
Canva에서는 움직임을 여러 장으로 나눠 표현했다(스포트라이트가 옮겨 가는 화면, 캐릭터가 흐름을 따라 이동하는 그림).
이 스크립트는 이웃한 두 장을 비교해 deck.js가 쓸 전환 정보를 만든다.
  - lift : 새로 또렷해진 영역(새 화면·팝업·강조된 패널). 살짝 떠오르며 나타난다.
  - mv   : 캐릭터(밀플래닝 마스코트)가 옮겨 간 위치. 앞 장 위치에서 새 위치로 이동한다. 스프라이트는 m{새 장}.webp
  - hdr  : 두 장의 위쪽이 같은 높이(비율). 슬라이드를 넘길 때 그 부분은 움직이지 않는다.
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

def analyze(a, b, sprites=True):
    A, B = img(a), img(b)
    raw = np.abs(A - B).max(2) > 40
    frac = float(raw.mean())
    fx = {}
    if frac == 0: return fx
    rows = raw.any(1)
    top = int(np.argmax(rows)) if rows.any() else H
    if top / H >= 0.05: fx["hdr"] = round((top - 2) / H, 4)
    if frac > 0.6: return fx
    diff = nd.binary_dilation(raw, iterations=6)
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
    inm = nd.binary_closing((D > 5) & diff, iterations=6)
    lab, n = nd.label(inm); boxes = []
    for k, sl in enumerate(nd.find_objects(lab)):
        if (lab[sl] == k + 1).sum() >= 0.006 * W * H:
            y, x = sl; boxes.append([x.start, y.start, x.stop, y.stop])
    boxes = [b_ for b_ in merge(boxes) if (b_[2] - b_[0]) * (b_[3] - b_[1]) <= 0.5 * W * H]
    if "mv" in fx: boxes = [b_ for b_ in boxes if (b_[2] - b_[0]) * (b_[3] - b_[1]) > 0.02 * W * H]
    boxes.sort(key=lambda b_: (round(b_[1] / 120), b_[0]))
    if boxes: fx["lift"] = [R(b_) for b_ in boxes[:6]]
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
