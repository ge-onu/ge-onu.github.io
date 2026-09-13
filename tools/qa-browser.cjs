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
        ['rag', '/projects/rag-retrieval-poc/'], ['kubernetes', '/projects/kubernetes-lab/'],
      ]) {
        const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
        const runtimeErrors = [], consoleErrors = [], failedRequests = [];
        page.on('pageerror', error => runtimeErrors.push(error.message));
        page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
        page.on('requestfailed', request => failedRequests.push(request.url()));
        await page.goto(origin + route, { waitUntil: 'networkidle' });
        await page.evaluate(() => document.fonts.ready);
        const measure = () => page.evaluate(() => ({
          width: innerWidth, documentWidth: document.documentElement.scrollWidth,
          brokenImages: [...document.images].filter(i => !i.complete || i.naturalWidth === 0).map(i => i.src),
          overflowingImages: [...document.images].filter(i => i.getBoundingClientRect().width > innerWidth).map(i => i.src),
          transferBytes: performance.getEntriesByType('resource').reduce((n, r) => n + r.transferSize, 0),
          domContentLoadedMs: Math.round(performance.getEntriesByType('navigation')[0].domContentLoadedEventEnd),
        }));
        const initial = await measure();
        assert.ok(initial.documentWidth <= width, `${name} ${width}: horizontal document overflow`);
        assert.deepEqual(initial.brokenImages, []);
        assert.deepEqual(initial.overflowingImages, []);
        await page.screenshot({ path: path.join(output, `${name}-${width}.png`), fullPage: true });

        if (name === 'home') {
          const cards = await page.locator('.project-showcase-card').evaluateAll(cards => cards.map(c => c.getAttribute('href')));
          assert.deepEqual(cards, ['projects/mealplanning/', 'projects/rag-retrieval-poc/', 'projects/kubernetes-lab/']);
          for (const href of cards) {
            await page.locator(`a[href="${href}"]`).first().click();
            await page.waitForURL(origin + '/' + href);
            assert.equal(await page.locator('h1').count(), 1);
            await page.goto(origin + '/', { waitUntil: 'networkidle' });
          }
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
