(() => {
  const browsers = document.querySelectorAll('[data-story-browser]');

  browsers.forEach((browser) => {
    const tabs = [...browser.querySelectorAll('[data-story-tab]')];
    const panelHost = browser.querySelector('[data-story-panels]');
    const panels = [...browser.querySelectorAll('[data-story-panel]')];
    if (!tabs.length || !panelHost || !panels.length) return;

    const select = (id, moveFocus = false) => {
      tabs.forEach((tab) => {
        const active = tab.dataset.storyTab === id;
        tab.classList.toggle('is-active', active);
        tab.setAttribute('aria-selected', String(active));
        tab.tabIndex = active ? 0 : -1;
        if (active && moveFocus) tab.focus();
      });

      panels.forEach((panel) => {
        const active = panel.dataset.storyPanel === id;
        panel.hidden = !active;
      });
    };

    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => select(tab.dataset.storyTab));
      tab.addEventListener('keydown', (event) => {
        if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        let next = index;
        if (event.key === 'ArrowDown') next = (index + 1) % tabs.length;
        if (event.key === 'ArrowUp') next = (index - 1 + tabs.length) % tabs.length;
        if (event.key === 'Home') next = 0;
        if (event.key === 'End') next = tabs.length - 1;
        select(tabs[next].dataset.storyTab, true);
      });
    });

    const initial = tabs.find((tab) => tab.getAttribute('aria-selected') === 'true') || tabs[0];
    select(initial.dataset.storyTab);
  });
})();
