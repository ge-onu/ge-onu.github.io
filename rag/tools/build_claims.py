#!/usr/bin/env python3
"""거누용 claim card를 만든다.

출발점은 RAG PoC가 동결한 claims.json(FROZEN_V2, SHA a0749e64…)이다. 그 파일은 그대로 두고
(tools/poc/claims_frozen_v2.json), 지금 사이트에 맞추려고 바꾼 것만 이 스크립트에 적는다.
바꾼 이유가 코드 옆에 남아야 나중에 PoC와 배포본의 차이를 설명할 수 있다.

    python3 rag/tools/build_claims.py      # → rag/data/claims.json
"""
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
SRC = HERE / 'poc' / 'claims_frozen_v2.json'
OUT = HERE.parent / 'data' / 'claims.json'
M = 'projects/mealplanning/index.html'
K = 'projects/kubernetes-lab/index.html'

# 1) 사이트 개편으로 사라진 chunk id → 지금 id
REMAP = {
    f'{M}::project-overview': [f'{M}::boundary', f'{M}::summary'],
}

# 2) 문구 정정 — 지금 사이트의 사실과 맞춘다
TEXT = {
    'C-GUARDRAIL-FIX': {
        # 지금 사이트는 Guardrail을 '응답 검증'으로 부른다. 그 이름으로 물어도 이 카드가 잡혀야 한다.
        'trigger_terms': lambda t: t + ['응답 검증'],
        # 근거 칸은 4개뿐이라 카드 근거를 늘리면 검색 근거가 밀려난다(P03·X04 인용 실패로 확인). 근거 목록은 그대로 둔다.
    },
    'C-RANKING-DEPLOY': {
        # 서버리스는 '이전'이 아니라 전환 판정과 Lambda 구현까지였다(2026-10-13 정정).
        'verified': lambda s: s.replace('서버리스 이전 대상에서 제외', '서버리스 전환 대상에서 제외'),
        'ownership': lambda s: s.replace('이전 제외 판단', '전환 제외 판단'),
        # 공개 검사(scan-evidence)가 부정문 속 '개인화 효과를 입증'도 막는다. 뜻은 같게, 표현만 바꾼다.
        'not_verified': lambda s: s.replace('개인화 효과를 입증하는 실사용 지표도 없습니다', '개인화가 효과를 냈는지 보여 주는 실사용 지표도 없습니다'),
    },
    'C-OUT-OF-SCOPE': {
        # 학력과 지원 직무, 이메일은 사이트에 공개돼 있다. 그것까지 거절하면 과잉 거절이 된다.
        'not_verified': lambda s: '연봉, 지원 기업, 면접 일정, 비공개 학습 계획, 팀원 개인정보, 회사 내부 정보, 전화번호·주소·생년월일 같은 개인정보는 공개 자료에 없습니다.',
        'trigger_terms': lambda t: [x for x in t if x not in ('학력', '지원', '연락처')] + ['지원 기업', '지원한 회사', '전화번호'],
    },
}

# 3) 새 카드 — 사이트에 이미 공개된 사실만 쓴다
NEW = [
    {
        'claim_id': 'C-SERVERLESS', 'topic': '서버리스 전환 범위', 'stance': 'BOUNDED',
        'verified': 'Mealplanning의 AI 기능 12종을 검토 기준 5개로 판정해 10종을 서버리스 전환 대상으로, 2종은 근거와 함께 기존 방식 유지로 정했습니다. Terraform으로 Lambda·SQS·SNS·S3·EventBridge Scheduler 구성(.tf 파일 13개)을 작성해 Lambda 구현과 동작 확인까지 했습니다.',
        'not_verified': '운영 환경을 실제로 서버리스로 전환하지는 않았습니다(프로젝트 일정상). 전환 뒤의 비용 절감 실측도 없습니다.',
        'forbidden': ['서버리스 이전 완료', '운영 환경을 서버리스로 전환', '프로덕션 마이그레이션 완료', '서버리스 전환으로 비용 절감 달성'],
        'ownership': '검토 기준 정의·채택/제외 결정·Terraform 작성·Lambda 구현 = 본인(전담) · 상위 인프라 결정 = 팀 공동 설계 · 클러스터 구현·운영 = 인프라 담당 팀원',
        'evidence_chunk_ids': [f'{M}::ev-svl', f'{M}::a2-serverless', 'evidence/serverless-judgment::s1'],
        'evidence_urls': ['/projects/mealplanning/#ev-svl'],
        'trigger_terms': ['서버리스', 'Serverless', 'Lambda', '람다', 'Terraform', 'SQS', 'EventBridge', '전환', '이전', '마이그레이션', '12종'],
    },
    {
        'claim_id': 'C-AI-ROLE', 'topic': 'Mealplanning에서 맡은 역할', 'stance': 'BOUNDED',
        'verified': 'Mealplanning(5인 팀, 더존비즈온 최우수상)의 핵심 기능인 유튜브 레시피 추출, 영수증 OCR, 레시피별 재료 최저가 연결, RAG 챗봇은 모두 AI가 있어야 동작하는 기능이었습니다. 팀 회의에서 꼭 넣기로 정한 이 기능들의 PoC, 구현 방안, 실제 구현, 트러블슈팅을 대부분 혼자 맡았습니다.',
        'not_verified': '꼭 넣을 기능은 팀 전원이 회의에서 정했고, 서비스 기획과 공통 기능 구현도 팀이 함께 했습니다. Amazon EKS·Argo CD·CI/CD·Prometheus·Grafana는 팀이 함께 설계했고 구현·운영은 인프라 담당 팀원이 맡았습니다.',
        'forbidden': ['프로젝트 전체를 혼자', '팀장으로서', '인프라 전체를 구축', 'EKS를 직접 구축'],
        'ownership': '핵심 AI 기능 PoC·구현 방안·구현·트러블슈팅 = 전담(대부분 단독) · 기능 아이디어 = 팀 전원 · 인프라 = 공동 설계, 구현·운영은 담당 팀원',
        'evidence_chunk_ids': [f'{M}::ai-role', f'{M}::boundary', 'index.html::mealplanning'],
        'evidence_urls': ['/projects/mealplanning/#ai-role', '/projects/mealplanning/#boundary'],
        'trigger_terms': ['맡은 일', 'AI 기능', '핵심 기능', 'PoC', '단독', '팀 프로젝트', 'Mealplanning', '밀플래닝'],
    },
    {
        'claim_id': 'C-CERT', 'topic': '자격증', 'stance': 'BOUNDED',
        'verified': '네트워크관리사 2급을 2026년 6월에 취득했습니다. CKA는 준비 중입니다.',
        'not_verified': 'CKA는 아직 취득하지 않았습니다. AWS 자격증은 공개 자료에 없습니다.',
        'forbidden': ['CKA 보유', 'CKA 합격', 'CKA 취득', 'AWS 자격증 보유'],
        'ownership': '-',
        'evidence_chunk_ids': ['index.html::about', 'index.html::focus'],
        'evidence_urls': ['/#about'],
        'trigger_terms': ['CKA', '자격증', '자격', '네트워크관리사', 'certification', 'SAA'],
    },
    {
        # "어떤 프로젝트를 했나요?" 같은 넓은 질문에 맞는 chunk가 없어, 검색이 Mealplanning 페이지 조각을 골랐다(2026-10-14 QA).
        # 홈 카드와 상세 페이지에 이미 적힌 문장만 모았다. 다른 카드를 가로채지 않도록
        # 트리거는 '목록을 묻는 말'만 쓰고, 금지 표현에는 3글자 이상 한글 단어를 넣지 않는다(금지 표현의 단어도 라우팅 단서가 된다).
        # stance는 SUPPORTED: 다른 카드와 함께 걸리면 경계가 있는 카드가 이긴다.
        'claim_id': 'C-PROJECTS', 'topic': '프로젝트 목록', 'stance': 'SUPPORTED',
        'verified': '\n'.join([
            '공개한 프로젝트는 5개입니다.',
            'Mealplanning: 식비 예산에서 레시피 추천과 장보기까지 연결한 5인 팀 서비스입니다(2026.06–08, 더존비즈온 최우수상). 핵심 AI 기능의 PoC·구현 방안·구현·트러블슈팅을 대부분 혼자 맡았습니다.',
            'RAG Retrieval PoC: 질문에 맞는 근거를 찾고, 답해도 되는 범위와 거절 조건을 나눠 평가한 개인 실험입니다.',
            '디딤: 공고 수집, 학습 기록, 메일 요약을 한 화면에 모은 1인용 개인 도구입니다(저장소 비공개).',
            'Kubernetes Multi-node Lab: kubeadm 멀티노드 클러스터를 직접 구성하고, 문제를 Event와 리소스 상태로 확인한 개인 실습입니다.',
            'Infrastructure Lab Series: Linux 라우팅·NAT부터 DNS·VPN, 이중화, 로그·감시까지 AI Agent와 함께 단계별로 구성한 실습 기록입니다.',
        ]),
        'not_verified': 'Infrastructure Lab Series를 직접 설명·재현하는 개인 검증은 아직 진행 중입니다. 이 5개 밖의 프로젝트는 공개 자료에 없습니다.',
        'forbidden': ['다섯 개 모두 혼자', '모두 팀 프로젝트'],
        'ownership': 'Mealplanning = 5인 팀 프로젝트(핵심 AI 기능 전담 · 꼭 넣을 기능은 팀 전원 · 실행 환경은 공동 설계, 구현·운영은 인프라 담당 팀원) · RAG Retrieval PoC·디딤·Kubernetes Lab = 개인 · Infrastructure Lab = AI Agent 활용 개인 실습',
        'evidence_chunk_ids': ['index.html::mealplanning', 'index.html::work', 'index.html::kubernetes-multi-node-lab', 'index.html::infrastructure-lab-series'],
        'evidence_urls': ['/#work'],
        # 화면의 근거 링크. answer.js sources()가 이 목록을 그대로 붙인다.
        'links': [
            {'url': '/projects/mealplanning/', 'label': 'Mealplanning · 사례 상세'},
            {'url': '/projects/rag-retrieval-poc/', 'label': 'RAG Retrieval PoC'},
            {'url': '/projects/didim/', 'label': '디딤'},
            {'url': '/projects/kubernetes-lab/', 'label': 'Kubernetes Multi-node Lab'},
            {'url': '/projects/infrastructure-lab-series/', 'label': 'Infrastructure Lab Series'},
        ],
        'trigger_terms': ['프로젝트 목록', '어떤 프로젝트를', '무슨 프로젝트를', '어떤 프로젝트들', '무슨 프로젝트들', '프로젝트들', '프로젝트를 했', '한 프로젝트', '프로젝트 소개', '프로젝트는 뭐', '프로젝트가 뭐', '프로젝트 뭐', '프로젝트가 몇', '프로젝트는 몇', '무엇을 만들', '뭐 만들', '뭘 만들', '어떤 작업을'],
    },
]


def main():
    data = json.loads(SRC.read_text(encoding='utf-8'))
    cards = []
    for c in data['cards']:
        c = dict(c)
        c['evidence_chunk_ids'] = [n for e in c['evidence_chunk_ids'] for n in REMAP.get(e, [e])]
        for field, fn in TEXT.get(c['claim_id'], {}).items():
            c[field] = fn(c[field])
        cards.append(c)
    # OUT_OF_SCOPE 카드는 PoC처럼 마지막에 둔다
    oos = [c for c in cards if c['claim_id'] == 'C-OUT-OF-SCOPE']
    cards = [c for c in cards if c['claim_id'] != 'C-OUT-OF-SCOPE'] + NEW + oos
    data['cards'] = cards
    data['derived_from'] = 'infra-aiops-career-hub experiments/rag-retrieval-poc claims.json (FROZEN_V2, sha256 a0749e64…) + rag/tools/build_claims.py'
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print(f'cards {len(cards)} → {OUT.relative_to(HERE.parents[1])}')


if __name__ == '__main__':
    main()
