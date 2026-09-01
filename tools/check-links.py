#!/usr/bin/env python3
"""Verify every relative link inside published evidence HTML resolves."""
import re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
bad = total = 0
for page in sorted(ROOT.rglob("*.html")):
    if ".git" in page.parts:
        continue
    text = page.read_text(encoding="utf-8", errors="ignore")
    for href in re.findall(r'(?:href|src)="([^"#][^"]*)"', text):
        if href.startswith(("http://", "https://", "mailto:")):
            continue
        total += 1
        rel = href.split("#")[0].split("?")[0]
        if not rel:
            continue
        target = (page.parent / rel).resolve()
        if not target.exists():
            print(f"  [BROKEN] {page.relative_to(ROOT)} -> {href}")
            bad += 1
print(f"\nrelative links {total}   broken {bad}")
print("RESULT: PASS" if not bad else "RESULT: FAIL")
sys.exit(1 if bad else 0)
