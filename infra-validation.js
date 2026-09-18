/* The only publication switch. Promote only after Control Plane accepts Gate A/B/C.
 * Values: current, gate-a, gate-b, all-passed. Initial build provenance never changes.
 * Local draft: ?infra-preview=all-passed (ignored on public hosts).
 */
(() => {
  const publishState = 'current';
  const stages = ['current', 'gate-a', 'gate-b', 'all-passed'];
  const local = location.hostname === 'localhost';
  const requested = new URLSearchParams(location.search).get('infra-preview');
  const preview = local && stages.includes(requested);
  const state = preview ? requested : publishState;
  const level = Math.max(0, stages.indexOf(state));
  const copy = {
    status: level === 3 ? '사용자 검증 완료' : level ? '사용자 검증 진행 중' : '사용자 검증 대기',
    gateA: level >= 1 ? '통과' : '대기',
    gateB: level >= 2 ? '통과' : '대기',
    gateC: level >= 3 ? '통과' : '대기',
    lab: level === 3 ? '직접 수행·검증한 항목에 한해 개인 Evidence' : '사용자 검증 ' + (level ? '진행 중' : '대기'),
    eligible: level === 3 ? '직접 검증한 범위 인정' : '검증 후 해당 범위만 인정',
    card: level === 3
      ? '구조·패킷 흐름·장애 인과를 직접 설명·검증하고, 지정 checkpoint와 대표 장애의 재현·진단·복구를 수행했습니다.'
      : '기술 환경과 장애 주입·복구 기록을 바탕으로 구조·인과 설명과 직접 Hands-on 검증을 준비했습니다.',
    hero: level === 3
      ? 'Gate A/B/C에서 구조·패킷 흐름·장애 인과를 직접 설명·검증했습니다. 지정 checkpoint와 대표 장애의 재현·진단·복구를 수행하고, 기록과 실행 환경을 근거로 선택 이유와 한계를 설명했습니다.'
      : '기술 구축과 Agent 검증은 완료됐습니다. 개인 검증은 구조·인과 설명, 직접 Hands-on, 면접 수준 설명 순서로 진행하며, 아직 완료되지 않았습니다.',
    boundary: level === 3
      ? '개인 Evidence는 직접 설명·검증한 구조와 패킷 흐름, 수행한 checkpoint, 대표 장애의 재현·진단·복구 범위입니다. Workbook과 실행 환경을 근거로 선택 이유와 한계를 설명한 결과를 포함합니다. 초기 구축 전체를 개인 수행으로 바꾸지 않습니다.'
      : '현재 개인 검증은 완료되지 않았습니다. Gate A/B/C에서 직접 설명·검증·재현·진단·복구한 범위만 개인 Evidence로 인정합니다. Agent의 기술 검증 결과를 개인 수행 이력으로 바꾸지 않습니다.',
  };
  document.querySelectorAll('[data-infra-copy]').forEach(node => {
    const value = copy[node.dataset.infraCopy];
    if (value) node.textContent = value;
  });
  document.documentElement.dataset.infraState = state;
  if (preview) {
    const banner = document.createElement('aside');
    banner.className = 'infra-draft-banner';
    banner.textContent = `로컬 목업 · ${state} 상태 미리보기 · 실제 Gate 통과를 뜻하지 않습니다.`;
    document.querySelector('main')?.prepend(banner);
    const meta = document.createElement('meta');
    meta.name = 'robots'; meta.content = 'noindex, nofollow'; document.head.append(meta);
    document.querySelectorAll('a[href]').forEach(a => {
      if (a.getAttribute('href').startsWith('#')) return;
      const url = new URL(a.href);
      if (url.origin === location.origin && (url.pathname === '/' || url.pathname.includes('/projects/infrastructure-lab-series/'))) {
        url.searchParams.set('infra-preview', state); a.href = url.href;
      }
    });
  }
})();
