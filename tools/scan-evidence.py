#!/usr/bin/env python3
"""Publication gate for public portfolio content.

Scans every HTML/JSON/MD file in the repository for content that must never be
published: credentials, cloud identifiers, internal network names, personal
data, unnecessary local paths, and wording the resume baseline forbids.

Exit code 0 = safe to publish. Non-zero = publication blocked.

    python3 tools/scan-evidence.py
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SKIP_DIRS = {".git", "node_modules", "tools"}
SUFFIXES = {".html", ".json", ".md", ".css", ".js"}

# (id, severity, pattern, description)
RULES: list[tuple[str, str, re.Pattern[str], str]] = [
    ("AWS_KEY",      "BLOCK", re.compile(r"\b(?:AKIA|ASIA)[A-Z0-9]{16}\b"),
     "AWS access key id"),
    ("AWS_ACCOUNT",  "BLOCK", re.compile(r"\biam::\d{12}:|arn:aws:[a-z0-9-]*:[a-z0-9-]*:\d{12}:|\b\d{12}\b"),
     "AWS account id / IAM arn"),
    ("PRIVATE_IP",   "BLOCK", re.compile(r"\b(?:10|127|192)\.(?:\d{1,3}\.){2}\d{1,3}\b"
                                         r"|\b172\.(?:1[6-9]|2\d|3[01])\.(?:\d{1,3})\.\d{1,3}\b"),
     "private / internal IP address"),
    ("INTERNAL_HOST", "BLOCK", re.compile(r"(?i)\b[a-z0-9-]+\.(?:mealbong\.cloud|internal|local|svc\.cluster\.local)\b"),
     "internal hostname or cluster endpoint"),
    ("CREDENTIAL",   "BLOCK", re.compile(r"(?i)\b(?:password|passwd|secret|api[_-]?key|access[_-]?token|"
                                         r"bearer)\s*[=:]\s*[\"']?[\w./+-]{6,}"),
     "credential assignment"),
    ("PRIVATE_KEY",  "BLOCK", re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"),
     "private key block"),
    ("LOCAL_PATH",   "BLOCK", re.compile(r"/home/[a-z][\w.-]*|/mnt/[cd]/|[A-Z]:\\\\Users\\\\|~/[\w.-]+/"),
     "absolute or user-specific local filesystem path"),
    ("FORBIDDEN_TERM", "BLOCK", re.compile(r"(?i)클릭스트림|clickstream"),
     "forbidden term (use 추천 노출·행동 이벤트)"),
    ("OVERCLAIM_CASES", "BLOCK", re.compile(r"1,750\s*(?:cases|개\s*평가\s*케이스|평가\s*케이스)"),
     "1,750 must be described as cumulative evaluation records"),
    ("OVERCLAIM_PERSONALIZATION", "BLOCK",
     re.compile(r"(?i)개인화[^.\n]{0,18}(?:성공|달성|개선했|향상했|입증)"
                r"|personalization\s+(?:success|proven|improved)"),
     "unsupported personalization success claim"),
    # Ranking references are allowed; only activation-state narrative is not.
    ("RANKING_ACTIVATION_STATE", "BLOCK",
     re.compile(r"(?:랭킹|Ranking|LightGBM)[^.\n]{0,40}"
                r"(?:켜지\s*않|끄|꺼져|미배포|배포하지\s*않|활성화하지\s*않|비활성)"
                r"|(?:켜지\s*않|꺼져|미배포|활성화하지\s*않)[^.\n]{0,40}(?:랭킹|Ranking)"),
     "ranking activation-state narrative"),
    ("RANKING_PRODUCTION_CLAIM", "BLOCK",
     re.compile(r"(?:랭킹|Ranking)[^.\n]{0,30}(?:프로덕션에서 (?:운영|서빙|사용)|실서비스에서 (?:운영|서빙))"),
     "unsupported production-active ranking claim"),
    ("AMBIGUOUS_ZERO_COST", "BLOCK",
     re.compile(r"(?:추가\s*)?비용\s*0\s*(?:원|\b)|비용은?\s*0원|무료로\s*(?:해결|처리)"),
     "ambiguous zero-cost wording (state the exact call/resource instead)"),
    ("INTERNAL_IAM_GROUP", "BLOCK",
     re.compile(r"\bmealplanning-dev\b"),
     "real internal IAM group name (use the mp-dev alias)"),
    # email is allowed only for the owner's public contact address
    ("EMAIL", "WARN", re.compile(r"\b[\w.%+-]+@[\w.-]+\.[A-Za-z]{2,}\b"),
     "email address"),
]

ALLOW_EMAIL = {"goonbam009@gmail.com", "noreply@anthropic.com"}
# NDCG numbers are permitted only where the offline synthetic-label warning is present.
NDCG = re.compile(r"NDCG")
SYNTH_WARN = re.compile(r"합성 라벨|오프라인 합성|synthetic")


def scan_text(text: str) -> list[tuple[str, str, str, str]]:
    hits: list[tuple[str, str, str, str]] = []
    for rid, sev, pat, desc in RULES:
        for m in set(pat.findall(text)):
            token = m if isinstance(m, str) else next((x for x in m if x), "")
            if rid == "EMAIL" and token in ALLOW_EMAIL:
                continue
            hits.append((rid, sev, desc, token[:70]))
    if NDCG.search(text) and not SYNTH_WARN.search(text):
        hits.append(("NDCG_UNLABELLED", "BLOCK",
                     "NDCG shown without offline synthetic-label warning", "NDCG"))
    return hits


def main() -> int:
    files = [p for p in ROOT.rglob("*")
             if p.is_file() and p.suffix in SUFFIXES
             and not any(part in SKIP_DIRS for part in p.relative_to(ROOT).parts)]

    blocks = warns = 0
    print(f"scan root : {ROOT}")
    print(f"files     : {len(files)}\n")
    for p in sorted(files):
        try:
            text = p.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue
        for rid, sev, desc, token in scan_text(text):
            rel = p.relative_to(ROOT)
            print(f"  [{sev}] {rel} :: {rid} — {desc}  →  {token!r}")
            if sev == "BLOCK":
                blocks += 1
            else:
                warns += 1

    print(f"\nBLOCK {blocks}   WARN {warns}")
    if blocks:
        print("RESULT: FAIL — publication blocked")
        return 1
    print("RESULT: PASS — safe to publish")
    return 0


if __name__ == "__main__":
    sys.exit(main())
