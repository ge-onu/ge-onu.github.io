#!/usr/bin/env python3
"""본문 글꼴(Pretendard Variable)을 사이트에 필요한 글자만 남겨 woff2 하나로 만든다.

CDN의 동적 subset 대신 저장소에 글꼴 한 벌을 둔다. 외부 요청이 없고, 페이지를
옮겨 다녀도 같은 파일 하나만 캐시된다.

- 글자 범위: KS X 1001 한글 2,350자 + ASCII + 사이트에서 쓰는 문장 부호,
  그리고 공개 HTML에 실제로 들어 있는 모든 글자. 문구를 고쳐도 대부분은
  다시 만들 필요가 없고, KS X 1001 밖의 글자를 새로 쓰면 이 스크립트를 다시 돌린다.
- 굵기 축: 400–700만 남긴다. 사이트가 쓰는 굵기가 그 안에 있다.
- 이름: OFL의 예약 글꼴 이름(Reserved Font Name) 조항 때문에 수정본(subset)은
  "Pretendard"라는 이름을 쓰지 않는다. 내부 이름을 PortfolioSans로 바꾼다.
  저작권·라이선스 표기는 그대로 둔다. 라이선스: assets/fonts/Pretendard-LICENSE.txt

fontTools와 brotli가 필요하다. 사이트 실행에는 필요 없다.

    pip install --target /tmp/pyfont fonttools brotli
    curl -L -o /tmp/PretendardVariable.woff2 \\
      https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/web/variable/woff2/PretendardVariable.woff2
    PYTHONPATH=/tmp/pyfont python3 scripts/build-font-subset.py /tmp/PretendardVariable.woff2
"""
from __future__ import annotations

import sys
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "fonts" / "portfolio-sans-subset.woff2"
FAMILY = "PortfolioSans"
EXTRA = "·–—‘’“”…→←↑↓↗×«»「」『』≈±°%※○●•─│©"


def ks_x_1001_hangul() -> set[str]:
    chars = set()
    for hi in range(0xB0, 0xC9):
        for lo in range(0xA1, 0xFF):
            try:
                ch = bytes([hi, lo]).decode("euc-kr")
            except UnicodeDecodeError:
                continue
            if "\uac00" <= ch <= "\ud7a3":
                chars.add(ch)
    return chars


def site_text() -> set[str]:
    chars = set()
    for page in ROOT.rglob("*.html"):
        parts = page.relative_to(ROOT).parts
        if any(p.startswith((".", "_")) for p in parts):
            continue
        chars |= set(page.read_text(encoding="utf-8"))
    return {c for c in chars if c.isprintable()}


def rename(font: TTFont) -> None:
    names = {1: FAMILY, 4: FAMILY, 16: FAMILY, 6: f"{FAMILY}-Variable",
             3: f"{FAMILY}-Variable;subset of Pretendard 1.3.9", 25: FAMILY}
    table = font["name"]
    for record in list(table.names):
        if record.nameID in names:
            table.setName(names[record.nameID], record.nameID,
                          record.platformID, record.platEncID, record.langID)


def main() -> int:
    if len(sys.argv) != 2:
        print(__doc__)
        return 2
    font = TTFont(sys.argv[1])
    font = instancer.instantiateVariableFont(font, {"wght": (400, 700)})
    text = set(chr(c) for c in range(0x20, 0x7F)) | set(EXTRA) | ks_x_1001_hangul() | site_text()
    options = subset.Options()
    options.flavor = "woff2"
    options.layout_features = ["kern", "liga", "calt", "ccmp", "locl", "mark", "mkmk", "tnum"]
    options.name_IDs = ["*"]
    options.notdef_outline = True
    subsetter = subset.Subsetter(options)
    subsetter.populate(text="".join(sorted(text)))
    subsetter.subset(font)
    rename(font)
    font.flavor = "woff2"
    OUT.parent.mkdir(parents=True, exist_ok=True)
    font.save(OUT)
    print(f"{OUT.relative_to(ROOT)}: {OUT.stat().st_size:,} bytes, {len(text):,} chars")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
