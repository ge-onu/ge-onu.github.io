// Optional QA: install Playwright separately; this is not a site dependency.
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

(async () => {
  const output = process.env.QA_OUTPUT || 'qa-output';
  fs.mkdirSync(output, { recursive: true });
  const origin = process.env.QA_URL || 'http://localhost:8765';
  const browser = await chromium.launch({
    ...(process.env.QA_CHROMIUM ? { executablePath: process.env.QA_CHROMIUM } : {}),
  });
  const results = [];
  try {
    for (const width of [1440, 768, 390, 320]) {
      for (const [name, route] of [
        ['home', '/'], ['mealplanning', '/projects/mealplanning/'],
        ['rag', '/projects/rag-retrieval-poc/'], ['didim', '/projects/didim/'],
        ['kubernetes', '/projects/kubernetes-lab/'],
        ['infra', '/projects/infrastructure-lab-series/'],
      ]) {
        const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
        const runtimeErrors = [], consoleErrors = [], failedRequests = [];
        page.on('pageerror', error => runtimeErrors.push(error.message));
        page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
        page.on('requestfailed', request => failedRequests.push(request.url()));
        await page.goto(origin + route, { waitUntil: 'networkidle' });
        await page.evaluate(() => document.fonts.ready);
        // 늦게 불러오는(loading=lazy) 그림도 모두 불러온 뒤 깨진 그림을 센다.
        await page.evaluate(() => document.querySelectorAll('img[loading=lazy]').forEach(i => { i.loading = 'eager'; }));
        await page.waitForLoadState('networkidle');
        await page.waitForFunction(() => [...document.images].every(i => i.complete));
        const measure = () => page.evaluate(() => ({
          width: innerWidth, documentWidth: document.documentElement.scrollWidth,
          brokenImages: [...document.images].filter(i => !i.complete || i.naturalWidth === 0).map(i => i.src),
          // 가로 스크롤 상자(예: Infrastructure Lab 구조도 720px) 안의 이미지는 문서 밖으로 넘치지 않으므로 뺀다.
          overflowingImages: [...document.images].filter(i => {
            if (i.getBoundingClientRect().width <= innerWidth) return false;
            for (let e = i.parentElement; e; e = e.parentElement) if (['auto', 'scroll'].includes(getComputedStyle(e).overflowX)) return false;
            return true;
          }).map(i => i.src),
          transferBytes: performance.getEntriesByType('resource').reduce((n, r) => n + r.transferSize, 0),
          domContentLoadedMs: Math.round(performance.getEntriesByType('navigation')[0].domContentLoadedEventEnd),
        }));
        const initial = await measure();
        assert.ok(initial.documentWidth <= width, `${name} ${width}: horizontal document overflow`);
        assert.deepEqual(initial.brokenImages, []);
        assert.deepEqual(initial.overflowingImages, []);
        await page.screenshot({ path: path.join(output, `${name}-${width}.png`), fullPage: true });

        if (name === 'home') {
          // 대표 사례 구간(#work)에서 상세 페이지로 가는 링크. 사례가 늘면 여기도 같이 고친다.
          const cards = await page.locator('#work a[href^="projects/"]').evaluateAll(links =>
            [...new Set(links.map(a => a.getAttribute('href')).filter(h => !h.includes('#')))]);
          assert.deepEqual(cards, [
            'projects/mealplanning/', 'projects/kubernetes-lab/',
            'projects/infrastructure-lab-series/', 'projects/rag-retrieval-poc/',
            'projects/didim/',
          ]);
          for (const href of cards) {
            await page.locator(`#work a[href="${href}"]`).first().click();
            await page.waitForURL(origin + '/' + href);
            assert.equal(await page.locator('h1').count(), 1);
            await page.goto(origin + '/', { waitUntil: 'networkidle' });
          }
        }
        if (name === 'home' || name === 'mealplanning') {
          const resume = page.locator('a[href="/resume.pdf"]');
          assert.ok(await resume.count() >= 1, `${name}: resume link`);
          const pdf = await page.request.get(origin + '/resume.pdf');
          assert.equal(pdf.status(), 200);
          assert.ok((await pdf.body()).subarray(0, 5).toString() === '%PDF-');
        }
        if (name === 'rag') {
          const link = page.locator('#sources a');
          assert.equal(await link.count(), 1);
          // Resolve relative links against the detail page, not the QA origin.
          const evidenceUrl = new URL(await link.getAttribute('href'), page.url()).href;
          const evidence = await page.request.get(evidenceUrl);
          assert.equal(evidence.status(), 200);
          assert.ok((await evidence.text()).includes('unseen holdout'));
        }
        if (name === 'mealplanning') {
          // 발표 자료 뷰어: 첫 장이 보이고, 다음 버튼과 단계 넘김이 동작해야 한다.
          const deck = page.locator('[data-deck]');
          assert.equal(await deck.count(), 1);
          assert.equal(await page.locator('.deck-count').textContent(), '1 / 50');
          await page.locator('.deck-nav.next').click();
          await page.waitForFunction(() => document.querySelector('.deck-count').textContent === '2 / 50');
          await page.locator('.deck-chapters [data-chapter="feature"]').click();
          await page.waitForFunction(() => document.querySelector('.deck-title').textContent.includes('핵심 기능'));
          const layer = await page.locator('.deck-layer.on').getAttribute('src');
          assert.equal((await page.request.get(new URL(layer, page.url()).href)).status(), 200);
          assert.ok((await measure()).documentWidth <= width, `deck ${width}: overflow`);
          assert.equal(await page.locator('#ranking-decision, a[href*="ranking-decision"]').count(), 0);
          await page.locator('a[href="#d1-dataflow"]').first().click();
          assert.equal(await page.locator('#d1-dataflow').evaluate(e => e.open), true);
          assert.equal(await page.locator('#d1-dataflow').evaluate(e => e.parentElement.closest('details').open), true);
          await page.reload({ waitUntil: 'networkidle' });
          assert.equal(await page.locator('#d1-dataflow').evaluate(e => e.open), true);
          await page.locator('[data-expand-all]').click();
          assert.equal(await page.locator('details:not([open])').count(), 0);
          assert.ok((await measure()).documentWidth <= width, `expanded mealplanning ${width}: overflow`);
          if ([1440, 390].includes(width)) await page.locator('#chat-comparison').screenshot({ path: path.join(output, `chat-comparison-${width}.png`) });
          await page.locator('[data-collapse-all]').click();
          assert.equal(await page.locator('details[open]').count(), 0);
          await page.goto(origin + route + '#%E0%A4%A', { waitUntil: 'networkidle' });
          await page.locator('[data-expand-all]').click();
          assert.equal(await page.locator('details:not([open])').count(), 0);
        }
        if (name === 'kubernetes') {
          const tabs = page.locator('[data-story-tab]');
          for (let i = 0; i < await tabs.count(); i++) {
            await tabs.nth(i).click();
            assert.equal(await page.locator('[data-story-panel]:visible').count(), 1);
            assert.ok((await measure()).documentWidth <= width, `kubernetes tab ${i}: overflow`);
          }
          await tabs.first().focus();
          await page.keyboard.press('ArrowDown');
          assert.equal(await tabs.nth(1).getAttribute('aria-selected'), 'true');
        }
        assert.deepEqual(runtimeErrors, [], `${name} runtime errors`);
        assert.deepEqual(consoleErrors, [], `${name} console errors`);
        assert.deepEqual(failedRequests, [], `${name} failed requests`);
        results.push({ name, route, ...initial, runtimeErrors, consoleErrors, failedRequests, interactions: 'PASS' });
        await page.close();
      }
    }
    fs.writeFileSync(path.join(output, 'browser-results.json'), JSON.stringify({ browser: browser.version(), results }, null, 2));
    console.log(`PASS: ${results.length} page/viewport combinations; screenshots and metrics: ${output}`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
