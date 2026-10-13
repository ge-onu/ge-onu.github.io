#!/usr/bin/env python3
"""Worker를 ES 모듈 파일 하나로 묶는다(wrangler 없이 Cloudflare API로 올릴 때).
engine.js · answer.js · data/geonu-rag.json 을 worker.js 앞에 그대로 붙인다. 외부 import가 없어서 가능한 방식이다.

    python3 rag/tools/bundle_worker.py OUT.mjs
"""
import re, sys
from pathlib import Path
R = Path(__file__).resolve().parents[1]
def body(p):
    s = (R / p).read_text(encoding='utf-8')
    s = re.sub(r'^import .*?;\n', '', s, flags=re.M)
    s = re.sub(r'^export \{[^}]*\};?\n', '', s, flags=re.M)
    return re.sub(r'^export (?!default)', '', s, flags=re.M)
out = '\n'.join([
    '// 자동 생성: rag/tools/bundle_worker.py — 직접 고치지 말 것',
    body('engine.js'), body('answer.js'),
    'const data = ' + (R / 'data/geonu-rag.json').read_text(encoding='utf-8') + ';',
    body('worker/worker.js'),
])
Path(sys.argv[1]).write_text(out, encoding='utf-8')
print(f'{sys.argv[1]}  {len(out)//1024} KB')
