'use strict';
// Headless Chromium; TTS is synthetic. Local mock brain only; no real child audio.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { normalize, template, createServer, greetingLines } = require('../brain/server.cjs');
// Isolate greeting regressions; first-visit onboarding is covered in memory-chat.cjs.
const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8').replace("if (determineMode('gameLoad') === 'name_ask') openNameAsk(); else openGreeting();", 'openGreeting();');
const origin = 'http://127.0.0.1:19273';
let browser, upstream, brain;
const samples = [];
async function listen(s) { await new Promise(r => s.listen(0, '127.0.0.1', r)); return 'http://127.0.0.1:' + s.address().port; }
async function close(s) { if (s) { s.closeAllConnections(); await new Promise(r => s.close(r)); } }
async function page({ data, endpoint = '', response, timeout = 6500, tts = true, viewport = { width: 1180, height: 720 }, offline = false, file = false } = {}) {
  const context = await browser.newContext({ viewport });
  await context.grantPermissions(['local-network-access']);
  const p = await context.newPage(); p.errors = []; p.calls = [];
  p.on('pageerror', e => p.errors.push(String(e)));
  await p.clock.install({ time: new Date('2026-11-03T09:00:00Z') });
  await p.route(origin + '/', r => r.fulfill({ contentType: 'text/html', body: html.replace(/^const BRAIN_URL = '[^']*';$/m, 'const BRAIN_URL = ' + JSON.stringify(endpoint) + ';').replace('const BRAIN_TIMEOUT_MS = 6500;', 'const BRAIN_TIMEOUT_MS = ' + timeout + ';') }));
  if (response) await p.route('**/mock-buddy', async r => {
    const q = r.request().postDataJSON(); p.calls.push(q);
    if (response === 'hang') return;
    const result = response(q);
    await r.fulfill({ contentType: 'application/json', headers: { 'X-Buddy-Source': 'brain', 'X-Buddy-Reason': 'validated' }, body: typeof result === 'string' ? result : JSON.stringify(result) }).catch(() => {});
  });
  await p.addInitScript(({ data, tts }) => {
    if (data) localStorage.setItem('block-world-save-v1', JSON.stringify(data));
    window.spoken = [];
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: tts ? {
      getVoices: () => [], cancel() {}, speaking: false,
      speak(u) { spoken.push({ text: u.text, rate: +u.rate.toFixed(2), volume: u.volume, pitch: +u.pitch.toFixed(2), lang: u.lang }); window.lastUtterance = u; }
    } : undefined });
  }, { data, tts });
  if (offline) await context.setOffline(true);
  await p.goto(file ? 'file://' + path.join(__dirname, '../index.html') + '#seed=42' : origin + '/#seed=42');
  await p.click('#btn-start');
  if (await p.locator('#name-entry').isVisible()) { await p.click('#welcome-play'); await p.evaluate(() => { spoken.length = 0; }); }
  return p;
}
async function saved(p) { return p.evaluate(() => { BW.saveNow(); return JSON.parse(localStorage.getItem('block-world-save-v1')); }); }
async function done(p) { assert.deepEqual(p.errors, []); assert.equal(await p.evaluate(() => BW.error()), ''); await p.context().close(); }
const report = s => console.log('PASS', s);
(async () => {
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox'] });
  let p = await page();
  assert(await p.locator('#welcome').isVisible());
  let data = await saved(p);
  assert.equal(data.child_name, ''); assert.equal(data.last_greeting.id, 0);
  assert.match(data.last_greeting.text, /^Hi friend\. I'm so happy you're here\./);
  assert.equal(await p.evaluate(() => BW.card()), '');
  assert.deepEqual(await p.evaluate(() => spoken), [{ text: data.last_greeting.text, rate: 0.82, volume: 0.75, pitch: 1.03, lang: 'en-GB' }]);
  assert.equal(await p.evaluate(() => BW.adventure().active), null);
  assert(!/[\u4e00-\u9fff]/.test(await p.locator('#welcome').innerText()));
  samples.push(data.last_greeting.text);
  await p.screenshot({ path: path.join(__dirname, '../screens/unnamed-greeting.png') });
  await p.evaluate(() => lastUtterance.onend()); await p.clock.fastForward(901);
  assert(await p.locator('#welcome').isVisible(),'welcome remains readable for at least four seconds');
  await p.clock.fastForward(3100);
  assert(await p.locator('#welcome').isHidden());
  await done(p); report('fresh unnamed welcome uses soft English TTS and dismisses after speech and its minimum reading time');

  for (let visit = 0; visit < 7; visit++) {
    p = await page({ data }); const next = await saved(p);
    assert.equal(next.child_name, ''); assert.notEqual(next.last_greeting.text, data.last_greeting.text);
    assert.equal(next.last_greeting.id, (data.last_greeting.id + 1) % 4);
    if (visit < 2) samples.push(next.last_greeting.text);
    await p.locator('#welcome-play').focus(); await p.keyboard.press('Enter');
    assert(await p.locator('#welcome').isHidden()); data = next; await done(p);
  }
  report('save/resume cycles rotate persisted greeting IDs/text without consecutive repeats; keyboard continue works');

  for (const child_name of [undefined, '', '  ', '小明']) {
    p = await page({ data: { ...data, child_name, last_greeting: { id: 999, text: 'bad' } } });
    assert.equal((await saved(p)).child_name, ''); assert.match(await p.locator('#welcome-line').innerText(), /friend/);
    await p.click('#btn-zh'); assert.equal(await p.inputValue('#parent-name'), '');
    await p.fill('#parent-name', 'Luca James'); await p.click('#parent-close');
    const edited = await saved(p); assert.equal(edited.child_name, 'Luca James'); await done(p);
    p = await page({ data: edited }); assert.match(await p.locator('#welcome-line').innerText(), /Luca James/); await done(p);
  }
  report('missing/empty/invalid legacy names remain unnamed; parent edits persist and appear in welcomes');

  p = await page({ tts: false });
  const before = await p.evaluate(() => BW.player().x);
  await p.keyboard.down('ArrowRight'); await p.waitForTimeout(350); await p.keyboard.up('ArrowRight');
  assert(await p.locator('#welcome').isHidden()); assert((await p.evaluate(() => BW.player().x)) > before); await done(p);
  p = await page({ tts: false }); await p.clock.fastForward(14001); assert(await p.locator('#welcome').isHidden()); await done(p);
  p = await page({ data: {...data,name_asked:true}, file: true, offline: true, tts: false });
  assert.match(await p.locator('#welcome-line').innerText(), /friend/);
  await p.click('#welcome-play'); assert(await p.locator('#welcome').isHidden()); await done(p);
  report('no speech, offline file, fixed dismissal deadline, movement and one-tap continue all stay playable');

  const endpoint = origin + '/mock-buddy';
  for (const bad of [q => ({ ...template(normalize(q)), say: 'Hello Alex. Say wood!' }), q => ({ ...template(normalize(q)), say: '你好 friend' }), () => '{broken', q => ({ ...template(normalize(q)), done: false })]) {
    p = await page({ endpoint, response: bad });
    await p.waitForFunction(() => spoken.length === 1);
    assert.match(await p.locator('#welcome-line').innerText(), /friend/);
    assert.equal((await p.evaluate(() => BW.adventure().brain)).reasons['client-validation'] || (await p.evaluate(() => BW.adventure().brain)).reasons.network, 1);
    assert.equal(p.calls[0].time_of_day, 'morning'); assert.equal(p.calls[0].returning, false); await done(p);
  }
  // A valid but repeated brain response must still fall back to a different line.
  const request = { event: 'greet', returning: true, time_of_day: 'morning', greeting_id: 0 };
  const repeated = template(normalize(request));
  p = await page({ data: { ...data, last_greeting: { id: 0, text: repeated.say } }, endpoint, response: () => repeated });
  await p.waitForFunction(() => spoken.length === 1); assert.notEqual((await saved(p)).last_greeting.text, repeated.say); await done(p);
  report('client rejects malformed, Chinese, wrong-name, exercise and repeated replies before speech');

  p = await page({ endpoint, response: 'hang', timeout: 100 });
  await p.clock.fastForward(101); await p.waitForFunction(() => spoken.length === 1);
  assert.equal((await p.evaluate(() => BW.adventure().brain)).reasons.timeout, 1); await done(p);
  p = await page({ endpoint, response: 'hang', timeout: 100 });
  await p.click('#welcome-play'); await p.clock.fastForward(500);
  assert(await p.locator('#welcome').isHidden()); assert.equal(await p.evaluate(() => spoken.length), 0); await done(p);
  report('brain timeout speaks fallback; dismissing a pending request prevents late speech or reopening');

  let upstreamCalls = 0;
  upstream = http.createServer(async (req, res) => {
    let raw = ''; for await (const chunk of req) raw += chunk;
    const sent = JSON.parse(JSON.parse(raw).messages[1].content); upstreamCalls++;
    assert.equal(sent.returning, true); assert.equal(sent.child_name, undefined);
    const say = greetingLines(sent).find(line => line.startsWith('Good morning, friend.') && line !== sent.last_greeting);
    res.end(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ say, options: [], answer: null, done: true }) } }] }));
  });
  const upstreamUrl = await listen(upstream);
  brain = createServer({ key: 'mock-only', url: upstreamUrl, model: 'mock', timeoutMs: 1000, origins: [origin] });
  const brainUrl = await listen(brain);
  p = await page({ data, endpoint: brainUrl + '/buddy' });
  await p.waitForFunction(() => spoken.length === 1);
  assert.equal((await p.evaluate(() => BW.adventure().brain)).brain, 1);
  assert.match(await p.locator('#welcome-line').innerText(), /^Good morning, friend\./);
  assert.equal(upstreamCalls, 1); await done(p);
  report('browser -> HTTP brain -> mock provider produces a validated contextual named greeting');

  p = await page({ data, viewport: { width: 390, height: 844 } });
  const box = await p.locator('#welcome').boundingBox(); assert(box.x >= 0 && box.x + box.width <= 390);
  await p.click('#welcome-play'); await done(p);
  report('portrait welcome and continue fit the viewport');
  console.log('ACTUAL TEMPLATE SAMPLES', JSON.stringify(samples));
})().catch(e => { console.error(e); process.exitCode = 1; }).finally(async () => { await browser?.close(); await close(brain); await close(upstream); });
