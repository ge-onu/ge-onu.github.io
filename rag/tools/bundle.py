#!/usr/bin/env python3
"""근거 데이터를 다시 만든다: 사이트 → chunks.jsonl → claims.json → geonu-rag.json(브라우저·Worker 공용).

    python3 rag/tools/bundle.py      # 사이트 문구를 고친 뒤 매번 실행하고 node rag/tools/eval.mjs 로 재평가한다
"""
import hashlib, json, subprocess, sys
from pathlib import Path
T = Path(__file__).resolve().parent
D = T.parent / 'data'
subprocess.run([sys.executable, str(T / 'build_corpus.py'), str(T.parents[1])], check=True)
subprocess.run([sys.executable, str(T / 'build_claims.py')], check=True)
keep = ('chunk_id', 'doc_id', 'doc_title', 'section', 'section_title', 'source_path', 'text')
chunks = [{k: c[k] for k in keep} for c in map(json.loads, (D / 'chunks.jsonl').read_text(encoding='utf-8').splitlines())]
cards = json.loads((D / 'claims.json').read_text(encoding='utf-8'))['cards']
body = json.dumps({'chunks': chunks, 'cards': cards}, ensure_ascii=False, separators=(',', ':'))
ver = hashlib.sha256(body.encode()).hexdigest()[:12]
(D / 'geonu-rag.json').write_text(body[:-1] + f',"version":"{ver}"}}', encoding='utf-8')
print(f'geonu-rag.json  chunks {len(chunks)} · cards {len(cards)} · version {ver} · {len(body)//1024} KB')
