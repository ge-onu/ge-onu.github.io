/* A quiet section index; the existing navigation remains usable without JS. */
(() => {
  const header = document.querySelector('.topbar');
  const main = document.querySelector('main');
  if (!header || !main) return;

  const sections = [...main.querySelectorAll(':scope > section')];
  const entries = sections.map((section, index) => {
    const heading = section.querySelector('h1, h2');
    if (!heading) return null;
    const target = section.id ? section : heading.id ? heading : index === 0 ? main : null;
    if (!target?.id) return null;
    return { section, target, label: index === 0 ? '소개' : heading.textContent.trim() };
  }).filter(Boolean);
  if (entries.length < 2) return;

  const nav = document.createElement('nav');
  nav.className = 'section-rail';
  nav.setAttribute('aria-label', '페이지 구간 이동');
  const links = entries.map(({target, label}) => {
    const link = document.createElement('a');
    link.href = `#${target.id}`;
    link.setAttribute('aria-label', label);
    const tick = document.createElement('span');
    tick.className = 'section-rail-tick';
    tick.setAttribute('aria-hidden', 'true');
    const caption = document.createElement('span');
    caption.className = 'section-rail-label';
    caption.textContent = label;
    caption.setAttribute('aria-hidden', 'true');
    link.append(tick, caption);
    nav.append(link);
    return link;
  });
  document.body.append(nav);

  let scheduled = false;
  const update = () => {
    scheduled = false;
    const threshold = header.getBoundingClientRect().height + 48;
    let current = 0;
    entries.forEach(({section}, index) => {
      if (section.getBoundingClientRect().top <= threshold) current = index;
    });
    if (scrollY > 0 && innerHeight + scrollY >= document.documentElement.scrollHeight - 2) {
      current = entries.length - 1;
    }
    links.forEach((link, index) => {
      if (index === current) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  };
  const schedule = () => {
    if (!scheduled) { scheduled = true; requestAnimationFrame(update); }
  };
  const resize = () => {
    document.documentElement.style.setProperty('--header-height', `${header.getBoundingClientRect().height}px`);
    schedule();
  };
  new ResizeObserver(resize).observe(header);
  new ResizeObserver(schedule).observe(main);
  window.addEventListener('scroll', schedule, {passive: true});
  window.addEventListener('resize', resize, {passive: true});
  nav.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      nav.setAttribute('data-dismissed', '');
    }
  });
  nav.addEventListener('focusin', () => nav.removeAttribute('data-dismissed'));
  nav.addEventListener('pointerover', () => nav.removeAttribute('data-dismissed'));
  resize();
})();
