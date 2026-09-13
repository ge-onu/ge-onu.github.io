#!/usr/bin/env python3
"""Check static HTML routes, fragments and local resources without a server."""
import argparse
from urllib.request import Request, build_opener
from urllib.error import URLError
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


def check_external(url):
    # Fresh opener: no cookies, Git credentials or authorization headers.
    try:
        with build_opener().open(Request(url, headers={"User-Agent": "Portfolio-Link-Check"}), timeout=30) as response:
            if not 200 <= response.status < 300:
                return f"HTTP {response.status}"
            if "infra-aiops-career-hub" in response.url.lower():
                return "redirect to private evidence repository"
    except (URLError, OSError, ValueError) as exc:
        return str(exc)
    return None


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--external", action="store_true", help="check HTTP links anonymously (network required)")
    args = parser.parse_args()
    external = set()
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
                if "infra-aiops-career-hub" in unquote(raw).lower():
                    errors.append(f"{rel}: private evidence link: {raw}")
                if url.scheme in ("http", "https") or url.netloc:
                    external.add(raw if url.scheme else "https:" + raw)
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
    if args.external:
        for url in sorted(external):
            error = check_external(url)
            print(f"External {'FAIL' if error else 'PASS'}: {url}" + (f" — {error}" if error else ""))
            if error:
                errors.append(f"external link failed: {url}: {error}")
    print(f"HTML pages: {len(pages)}; local references: {checked}; errors: {len(errors)}")
    for error in errors:
        print(error)
    return bool(errors)


if __name__ == "__main__":
    raise SystemExit(main())
