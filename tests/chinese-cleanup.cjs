// Shell-only regression: serve the repository on BW_URL (default port 19273).
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM || '/usr/bin/google-chrome',
    headless: true, args: ['--no-sandbox']
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1180, height: 720 } });
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    await page.goto((process.env.BW_URL || 'http://127.0.0.1:19273') + '/#seed=42');
    await page.waitForFunction(() => window.BW?.ready);
    await page.click('#btn-start');
    await page.waitForTimeout(300);
    assert.equal(await page.evaluate(() => BW.layout().started), true);
    assert.equal(await page.evaluate(() => BW.totalWords()), 42);
    console.log('PASS game loads and starts');

    // Exercise an original bilingual toast through the real quiz button.
    await page.click('#btn-words');
    await page.click('#btn-quiz');
    assert.equal(await page.locator('#toast').innerText(), 'Collect words first!');
    assert.equal(await page.locator('#toast').isVisible(), true);
    assert.equal(await page.locator('#toast').locator('*').count(), 1);
    await page.waitForFunction(() => document.getElementById('toast').hidden, null, { timeout: 4500 });
    console.log('PASS original bilingual toast displays only English and expires');

    // Inventory fixture learns a world-present word; toggle with actual UI clicks.
    await page.evaluate(() => BW.give('wood', 1));
    await page.click('#btn-words');
    await page.click('#btn-quiz');
    assert.equal(await page.evaluate(() => BW.quiz()), 'wood');
    assert.equal(await page.locator('#quest-en').innerText(), 'Find the WOOD!');
    await page.click('#btn-words');
    assert.equal(await page.locator('#quiz-btn-en').innerText(), 'Stop Quiz');
    await page.click('#btn-quiz');
    assert.equal(await page.evaluate(() => BW.quiz()), '');
    assert.equal(await page.locator('#quest-en').innerText(), 'Find a tree!');
    console.log('PASS Treasure Quiz starts and stops, restoring the English quest');

    await page.locator('#hotbar .slot').click();
    assert.equal(await page.locator('#card-en').innerText(), 'Wood');
    assert.equal(await page.locator('#wordcard canvas').count(), 1);
    assert.equal(await page.locator('#held-en').innerText(), 'Wood');
    await page.evaluate(() => BW.hideCard());
    for (const [open, close] of [['#btn-craft', '#craft-back'], ['#btn-words', '#book-back']]) {
      await page.click(open);
      assert(!/[\u4e00-\u9fff]/u.test(await page.locator('body').innerText()));
      await page.click(close);
    }
    assert.equal(await page.locator('#quest-zh, #card-zh, #held-zh, #toast-zh, #quiz-btn-zh, .hint').count(), 0);
    // Include hidden nodes and attributes: Chinese is allowed only in parent UI.
    assert.deepEqual(await page.evaluate(() => {
      const remaining = [];
      for (const el of document.body.querySelectorAll('*')) {
        if (el.closest('#parent-help') || el.id === 'btn-zh' || el.tagName === 'SCRIPT') continue;
        if ([...el.childNodes].some(n => n.nodeType === Node.TEXT_NODE && /[\u4e00-\u9fff]/u.test(n.textContent)) ||
            [...el.attributes].some(a => /[\u4e00-\u9fff]/u.test(a.value))) remaining.push(el.outerHTML);
      }
      return remaining;
    }), []);
    console.log('PASS word card, held label, Craft and Word Book have no Chinese display slots');

    await page.click('#btn-zh');
    assert.equal(await page.locator('#parent-help').isVisible(), true);
    assert((await page.locator('#parent-help').innerText()).includes('家长说明'));
    await page.click('#parent-close');
    assert.equal(await page.locator('#parent-help').isVisible(), false);
    console.log('PASS Chinese parent help still opens and closes');
    assert.equal(await page.evaluate(() => BW.error()), '');
    assert.deepEqual(errors, []);
    console.log('PASS no page, console or game-loop errors');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
