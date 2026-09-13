#!/usr/bin/env python3
"""Check static HTML routes, fragments and local resources without a server."""
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parent.parent


class Page(HTMLParser):
    def __init__(self, path):
        super().__init__(convert_charrefs=True)
        self.ids, self.links, self.errors = [], [], []
        self.feed(path.read_text(encoding="utf-8"))

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if attrs.get("id"):
            self.ids.append(attrs["id"])
        for key in ("href", "src"):
            if attrs.get(key):
                self.links.append(attrs[key])
        if tag == "img" and "alt" not in attrs:
            self.errors.append("image missing alt")


def main():
    pages = {p: Page(p) for p in ROOT.rglob("*.html")
             if not any(x.startswith((".", "_")) or x == "node_modules"
                        for x in p.relative_to(ROOT).parts)}
    errors, checked = [], 0
    for path, page in pages.items():
        rel = path.relative_to(ROOT)
        errors.extend(f"{rel}: {e}" for e in page.errors)
        errors.extend(f"{rel}: duplicate id {i}" for i, n in Counter(page.ids).items() if n > 1)
        for raw in page.links:
            url = urlsplit(raw)
            if url.scheme or url.netloc:
                continue
            checked += 1
            target = ((ROOT / unquote(url.path).lstrip("/")) if url.path.startswith("/")
                      else (path.parent / unquote(url.path)) if url.path else path).resolve()
            if target.is_dir():
                target /= "index.html"
            if not target.is_relative_to(ROOT):
                errors.append(f"{rel}: link outside site: {raw}")
            elif "_drafts" in target.relative_to(ROOT).parts:
                errors.append(f"{rel}: draft linked publicly: {raw}")
            elif not target.is_file():
                errors.append(f"{rel}: missing target: {raw}")
            elif url.fragment and target in pages and unquote(url.fragment) not in pages[target].ids:
                errors.append(f"{rel}: missing fragment: {raw}")
    print(f"HTML pages: {len(pages)}; local references: {checked}; errors: {len(errors)}")
    for error in errors:
        print(error)
    return bool(errors)


if __name__ == "__main__":
    raise SystemExit(main())
