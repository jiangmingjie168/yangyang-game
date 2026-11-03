'use strict';
// Desktop browser geometry/touch regression; physical iOS rotation remains a device check.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const URL = process.env.BW_URL || 'http://127.0.0.1:19273';
const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8')
  .replace(/^const BRAIN_URL = '[^']*';$/m, "const BRAIN_URL = '';");
let browser;
async function start(p) {
  await p.click('#btn-start');
  if (await p.locator('#name-entry').isVisible()) await p.click('#welcome-play');
  if (await p.locator('#welcome').isVisible()) await p.click('#welcome-play');
  await p.evaluate(() => BW.hideCard());
  assert(await p.evaluate(() => BW.layout().started));
}
async function controls(p, inset = 0) {
  for (const selector of ['#joy', '#btn-jump', '#btn-break', '#btn-place']) {
    const r = await p.locator(selector).boundingBox();
    const { width, height } = p.viewportSize();
    assert(r && r.width > 0 && r.height > 0);
    assert(r.x >= inset && r.y >= 0 && r.x + r.width <= width - inset && r.y + r.height <= height - 21,
      `${selector} inside safe viewport: ${JSON.stringify(r)}`);
    assert(await p.locator(selector).evaluate(el => {
      const r = el.getBoundingClientRect();
      return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
    }), `${selector} accepts touches`);
    await p.locator(selector).tap();
  }
  const c = await p.locator('#view').evaluate(c => ({ w: c.width, h: c.height }));
  const layout = await p.evaluate(() => BW.layout());
  assert.equal(c.w, Math.round(layout.viewW * layout.dpr));
  assert.equal(c.h, Math.round(layout.viewH * layout.dpr));
  assert(c.w > 0 && c.h > 0);
}
(async () => {
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, deviceScaleFactor: 3 });
  const p = await context.newPage(), errors = [];
  p.on('pageerror', e => errors.push(String(e)));
  await p.route(URL + '/', r => r.fulfill({ contentType: 'text/html', body: html }));
  await p.goto(URL + '/#seed=42');
  await start(p); // No portrait button: the hint must never gate startup/play.
  assert(await p.locator('#rotate').isVisible());
  assert(!await p.evaluate(() => document.body.classList.contains('ok-portrait')));
  for (const selector of ['#btn-zh', '#btn-craft', '#btn-words', '#joy', '#btn-jump', '#btn-break', '#btn-place']) {
    assert(await p.locator(selector).evaluate(el => {
      const r = el.getBoundingClientRect();
      return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
    }), `${selector} remains reachable with portrait hint visible`);
  }
  const before = await p.evaluate(() => BW.player().x);
  await p.keyboard.down('ArrowRight'); await p.waitForTimeout(300); await p.keyboard.up('ArrowRight');
  assert((await p.evaluate(() => BW.player().x)) > before + 5, 'portrait plays while hint remains');
  await p.screenshot({ scale: 'css', path: path.resolve(__dirname, '../screens/rotate-hint.png') });
  await p.setViewportSize({ width: 844, height: 390 }); await p.waitForTimeout(450);
  assert(!await p.locator('#rotate').isVisible());
  assert(!await p.evaluate(() => document.body.classList.contains('portrait')));
  await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(450);
  await p.locator('#rotate .big').tap(); // Entire card dismisses.
  assert(!await p.locator('#rotate').isVisible());
  await p.reload(); await start(p);
  assert(!await p.locator('#rotate').isVisible(), 'dismissal survives reload in this tab');
  for (const [width, height] of [[844, 390], [932, 430]]) {
    await p.setViewportSize({ width, height });
    // Chromium has no notch: inject representative iPhone landscape safe-area values.
    await p.evaluate(() => {
      for (const [key, value] of Object.entries({ '--sal': '47px', '--sar': '47px', '--sab': '21px' }))
        document.documentElement.style.setProperty(key, value);
      window.dispatchEvent(new Event('orientationchange'));
    });
    await p.waitForTimeout(450);
    assert(!await p.locator('#rotate').isVisible());
    assert(!await p.evaluate(() => BW.layout().portrait));
    await controls(p, 47);
    await p.evaluate(() => BW.hideCard());
    await p.screenshot({ scale: 'css', path: path.resolve(__dirname, `../screens/iphone-landscape-${width}.png`) });
    console.log(`PASS ${width}×${height}: safe-area controls tappable, canvas DPR reset, hint hidden`);
  }
  // Simulate URL-bar movement/visual viewport offsets without depending on browser chrome.
  await p.evaluate(() => {
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: { width: 820, height: 360, offsetLeft: 12, offsetTop: 20 } });
    window.dispatchEvent(new Event('resize'));
  });
  await p.waitForTimeout(450);
  const box = await p.locator('#app').boundingBox();
  assert.deepEqual(box, { x: 12, y: 20, width: 820, height: 360 });
  assert.equal(await p.evaluate(() => BW.layout().viewH), 360);
  const manifestURL = await p.locator('link[rel=manifest]').getAttribute('href');
  const response = await context.request.get(URL + '/' + manifestURL);
  assert(response.ok());
  const manifest = await response.json();
  assert.equal(manifest.orientation, 'landscape'); assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.start_url, './index.html');
  for (const icon of manifest.icons) assert((await context.request.get(URL + '/' + icon.src)).ok());
  assert(!/screen\.orientation\.lock\s*\(/.test(html));
  assert.deepEqual(errors, []);
  console.log('PASS portrait play with hint, card dismissal/session, rotation, visualViewport offsets and served PWA assets');
})().catch(e => { console.error(e); process.exitCode = 1; }).finally(async () => { await browser?.close(); });
