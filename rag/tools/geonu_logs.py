#!/usr/bin/env python3
"""거누 Worker 로그 모으기·요약.

Workers Logs(무료 요금제는 3일 보관)에서 거누가 남긴 두 종류의 줄만 가져와 쌓는다.
  - ev=chat : 요청마다 모드(generated/plain/refuse)·작성 모델·다시 시도 수·걸린 시간
  - ev=jev  : 답을 보낸 뒤 Jev가 매긴 그림자 판정(위험 점수, 0.5 이상이면 flag)
질문 원문·IP·위치는 Worker가 애초에 남기지 않고, 여기서도 source 칸만 저장한다.

    python3 rag/tools/geonu_logs.py collect          # 최근 26시간을 모아 붙인다(중복 제외). cron 매일
    python3 rag/tools/geonu_logs.py summary [--days 7]

토큰: ~/.config/geonu-site/cloudflare.env (Workers Observability 읽기 권한 필요). 출력하지 않는다.
저장: ~/.local/share/geonu-rag/events.jsonl (0600)
"""
import json, os, statistics, sys, time, urllib.request
from collections import Counter
from pathlib import Path

ENV = Path.home() / '.config/geonu-site/cloudflare.env'
OUT = Path.home() / '.local/share/geonu-rag/events.jsonl'
KEEP = ('ev', 'mode', 'by', 'tries', 'notes', 'checked', 'claim', 'data', 'ms', 'ok', 'flag', 'risk',
        'unsupported', 'ownership', 'numbers_tech', 'model', 'tokens', 'status', 'err')


def env():
    return dict(l.strip().split('=', 1) for l in ENV.read_text().splitlines() if '=' in l and not l.startswith('#'))


def query(hours=26, limit=2000):
    e = env(); now = int(time.time() * 1000)
    body = {"queryId": "geonu-collect", "timeframe": {"from": now - hours * 3600 * 1000, "to": now}, "view": "events", "limit": limit,
            "parameters": {"filters": [{"key": "$metadata.service", "operation": "eq", "type": "string", "value": "geonu-rag"}]}}
    req = urllib.request.Request(
        f"https://api.cloudflare.com/client/v4/accounts/{e['CLOUDFLARE_ACCOUNT_ID']}/workers/observability/telemetry/query",
        data=json.dumps(body).encode(), headers={"Authorization": f"Bearer {e['CLOUDFLARE_API_TOKEN']}", "Content-Type": "application/json"})
    d = json.load(urllib.request.urlopen(req, timeout=30))
    if not d.get('success'):
        raise SystemExit(f"조회 실패: {str(d.get('errors') or d)[:200]}")
    return ((d.get('result') or {}).get('events') or {}).get('events') or []


def collect():
    OUT.parent.mkdir(parents=True, exist_ok=True); os.chmod(OUT.parent, 0o700)
    seen = set()
    if OUT.exists():
        for line in OUT.read_text().splitlines():
            try: r = json.loads(line); seen.add((r['rid'], r['ev']))
            except Exception: pass
    new = []
    for e in query():
        s = e.get('source') or {}
        if s.get('ev') not in ('chat', 'jev'):
            continue
        rid = (e.get('$metadata') or {}).get('requestId') or str(e.get('timestamp'))
        if (rid, s['ev']) in seen:
            continue
        seen.add((rid, s['ev']))
        new.append({'ts': e.get('timestamp'), 'rid': rid, **{k: s[k] for k in KEEP if k in s}})
    new.sort(key=lambda r: r['ts'] or 0)
    with OUT.open('a') as f:
        for r in new: f.write(json.dumps(r, ensure_ascii=False) + '\n')
    os.chmod(OUT, 0o600)
    print(time.strftime('%F %T'), f"새 줄 {len(new)}개 (chat {sum(r['ev']=='chat' for r in new)}, jev {sum(r['ev']=='jev' for r in new)})")


def pct(v, p):
    v = sorted(v); return v[min(len(v) - 1, int(round(p * (len(v) - 1))))] if v else None


def summary(days=7):
    if not OUT.exists():
        print('아직 모은 로그가 없어요.'); return
    since = (time.time() - days * 86400) * 1000
    rows = [json.loads(l) for l in OUT.read_text().splitlines() if l.strip()]
    rows = [r for r in rows if (r.get('ts') or 0) >= since]
    chat = [r for r in rows if r['ev'] == 'chat']; jev = [r for r in rows if r['ev'] == 'jev']
    print(f"최근 {days}일 · 질문 {len(chat)}건")
    if chat:
        modes = Counter(r.get('mode') for r in chat); by = Counter(r.get('by') for r in chat if r.get('by'))
        ms = [r['ms'] for r in chat if r.get('mode') != 'refuse' and isinstance(r.get('ms'), (int, float))]
        print('  모드:', dict(modes))
        print('  작성 모델:', dict(by))
        print('  다른 모델로 넘어간 질문:', sum(1 for r in chat if (r.get('tries') or 0) > 0))
        if ms: print(f"  응답 시간: 중간 {statistics.median(ms)/1000:.1f}초 · 95% {pct(ms, .95)/1000:.1f}초")
    ok = [r for r in jev if r.get('ok')]
    if jev:
        flags = [r for r in ok if r.get('flag')]
        print(f"  Jev 그림자 판정: {len(ok)}/{len(jev)} 성공 · 0.5 이상 {len(flags)}건 · 위험 중간값 {statistics.median([r['risk'] for r in ok]) if ok else '-'}")
        for r in flags[-5:]:
            print(f"    - {time.strftime('%m-%d %H:%M', time.localtime(r['ts']/1000))} risk {r['risk']} claim {r.get('claim')} by {r.get('by')}")


if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else 'summary'
    if cmd == 'collect': collect()
    elif cmd == 'summary': summary(int(sys.argv[sys.argv.index('--days') + 1]) if '--days' in sys.argv else 7)
    else: raise SystemExit(__doc__)
