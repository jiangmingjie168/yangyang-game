'use strict';
// Headless tests only. Recognition/TTS and DeepSeek are mocks; never real audio/API.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const { createServer, template, normalize } = require('../brain/server.cjs');
const URL = process.env.BW_URL || 'http://127.0.0.1:19273';
const html = fs.readFileSync(require('node:path').join(__dirname, '../index.html'), 'utf8');
let browser, brain, upstream, upstreamCalls = [], fixture;
async function listen(s) { await new Promise(r => s.listen(0, '127.0.0.1', r)); return 'http://127.0.0.1:' + s.address().port; }
async function close(s) { if (s) { s.closeAllConnections(); await new Promise(r => s.close(r)); } }
async function snapshot(p) { return p.evaluate(() => { BW.saveNow(); return JSON.parse(localStorage.getItem('block-world-save-v1')); }); }
async function page(data, { endpoint = '', reply, voice = true, timeout = 6500, delay = 0 } = {}) {
  const context = await browser.newContext({ viewport: { width: 1180, height: 720 } });
  await context.grantPermissions(['local-network-access']); // Chromium's loopback permission, for local mock servers only.
  const p = await context.newPage(); p.errors = []; p.calls = [];
  p.on('pageerror', e => p.errors.push(String(e)));
  p.network = []; p.on('console',m=>{if(m.type()==='error')p.network.push({console:m.text()});}); p.on('requestfailed', r => { if (r.url().includes('buddy')) p.network.push({url:r.url(),error:r.failure()}); });
  p.on('response', r => { if (r.url().includes('buddy')) p.network.push({url:r.url(),status:r.status(),body:r.request().postData()}); });
  await p.route(URL + '/', r => r.fulfill({ contentType: 'text/html', body: html.replace(/^const BRAIN_URL = '[^']*';$/m, 'const BRAIN_URL = ' + JSON.stringify(endpoint) + ';').replace('const BRAIN_TIMEOUT_MS = 6500;', 'const BRAIN_TIMEOUT_MS = ' + timeout + ';') }));
  if (reply) await p.route('**/mock-buddy', async r => {
    const payload = r.request().postDataJSON(); p.calls.push(payload);
    await new Promise(r => setTimeout(r, delay));
    const value = typeof reply === 'function' ? reply(payload) : reply;
    await r.fulfill({ contentType: 'application/json', body: typeof value === 'string' ? value : JSON.stringify(value) }).catch(() => {});
  });
  await p.addInitScript(({ data, voice }) => {
    if (data) localStorage.setItem('block-world-save-v1', JSON.stringify(data));
    window.spoken = [];
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
      getVoices: () => [], cancel() {}, speak(u) { spoken.push(u.text); }, speaking: false
    }});
    if (voice) window.SpeechRecognition = class { start() { window.recognizer = this; } abort() { this.onend?.(); } };
    else { window.SpeechRecognition = undefined; window.webkitSpeechRecognition = undefined; }
    window.voiceResult = text => { const r = window.recognizer; r.onresult?.({ resultIndex: 0, results: [[{ transcript: text }]] }); r.onend?.(); };
  }, { data, voice });
  await p.goto(URL + '/#seed=42'); await p.click('#btn-start'); await p.waitForTimeout(180);
  return p;
}
function next(data) {
  data = structuredClone(data); data.progress.tree = 0; data.mods = []; data.adventure.turns = 0; data.adventure.reviews = {}; data.adventure.speaking ||= []; data.animals.forEach(a => { a[1] = 7000; });
  return data;
}
async function chat(p) {
  await p.evaluate(() => BW.hideCard());
  const pos = await p.evaluate(() => BW.worldToScreen(87.5*32, 15.5*32));
  await p.mouse.click(pos.x,pos.y);
  await p.evaluate(() => BW.hideCard()); // Focus on dialogue, independent of tutorial-card animation time.
  try { await p.waitForFunction(() => BW.adventure().active && !BW.adventure().active.pending, null, {timeout:30000}); } catch (e) { console.error('CHAT STATE', await p.evaluate(() => ({adventure:BW.adventure(),player:BW.player(),error:BW.error(),hidden:document.hidden,quest:BW.quest(),card:BW.card(),text:document.body.innerText}))); throw e; }
  assert(await p.locator('#dialogue').isVisible());
  return p.evaluate(() => BW.adventure().active);
}
async function voice(p, text) { await p.click('#chat-mic'); await p.evaluate(text => voiceResult(text), text); await p.waitForFunction(() => !BW.adventure().active?.pending); }
async function checkClose(p) { assert.deepEqual(p.errors, []); assert.equal(await p.evaluate(() => BW.error()), ''); await p.context().close(); }
function report(text) { console.log('PASS', text); }
(async () => {
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox'] });
  let p = await page(); fixture = await snapshot(p); fixture.words = ['tree','wood']; fixture.adventure = { found: {}, reviews: {}, turns: 0, scenes: {}, levels: {}, speaking: [] }; await checkClose(p);
  // Earn both tier-one credits with inputs. Reset only the world trigger/selection metadata between encounters.
  let data = next(fixture);
  for (let n=1;n<=2;n++) {
    p = await page(next(data)); const d = await chat(p); assert.equal(d.key,'tree'); assert.equal(d.tier,1);
    await p.locator('[data-word="tree"]').click(); data = await snapshot(p);
    assert.equal(data.adventure.levels.tree.t1,n); assert.equal(data.adventure.levels.tree.t2,0);
    assert.equal(data.adventure.speaking.at(-1).spoke,false); await checkClose(p);
  }
  report('two tier-one successes unlock tier two; taps record no speech');
  const unlocked2 = structuredClone(data);
  for (const said of ['trees','I see a three']) {
    p = await page(next(data)); const d = await chat(p); assert.equal(d.tier,2);
    assert.equal(await p.locator('#chat-question').innerText(),"What's this?"); assert(!(await p.locator('#chat-options').isVisible()));
    await voice(p,said); data = await snapshot(p); assert(data.adventure.levels.tree.t2>=1);
    assert((await p.locator('#chat-status').innerText()).includes('★ ★ ★')); assert(data.adventure.speaking.at(-1).spoke);
    assert.equal(data.adventure.speaking.at(-1).spoken_word,'tree'); await checkClose(p);
  }
  assert.equal(data.adventure.levels.tree.t2,2); report('picture naming accepts plural/near-sound and unlocks tier three after two spoken successes');
  for (const said of ['tree','I see a tree','tre']) {
    p = await page(next(data)); assert.equal((await chat(p)).tier,3);
    assert.equal(await p.locator('#chat-question').innerText(),'I see a tree. Say it!');
    await voice(p,said); const saved = await snapshot(p); assert.equal(saved.adventure.levels.tree.t3,1); await checkClose(p);
  }
  report('tier three accepts the missing word, whole sentence, or small spelling difference');
  p = await page(next(unlocked2), { voice: false }); await chat(p); await p.click('#chat-mic');
  assert(await p.locator('#chat-options').isVisible()); await p.locator('[data-word="tree"]').click();
  assert.equal((await snapshot(p)).adventure.levels.tree.t2,0); await checkClose(p);
  p = await page(next(unlocked2)); await chat(p); await voice(p,'something unrelated');
  assert(await p.locator('#chat-options').isVisible()); await p.locator('[data-word="tree"]').click();
  const downgraded = await snapshot(p); assert.equal(downgraded.adventure.levels.tree.t2,0); assert.equal(downgraded.adventure.speaking.at(-2).spoke,true); await checkClose(p);
  report('unavailable mic/unrecognized speech gives tap fallback without tier-two credit');
  p = await page(next(fixture)); await chat(p); const before = (await snapshot(p)).progress;
  for(let n=0;n<3;n++) await p.locator('[data-word="wood"]').click();
  assert((await p.evaluate(() => BW.adventure().active)).answered); assert.equal(await p.locator('#chat-options button:visible').count(),0);
  assert.deepEqual((await snapshot(p)).progress,before); await p.waitForFunction(() => !BW.adventure().active); await checkClose(p);
  report('three displayed questions maximum, mandatory friendly close; no mission penalties');
  // Actual browser -> buddy service -> mock DeepSeek. Inject one invalid answer then a valid repair.
  upstream = http.createServer(async (req,res) => {
    let raw=''; for await (const b of req) raw+=b; const call=JSON.parse(raw); upstreamCalls.push(call);
    const expected = JSON.parse(call.messages[1].content).expected;
    const value = upstreamCalls.length===1 ? {...expected, say:'你好'} : {...expected, say: expected.done ? 'Nice! Keep exploring!' : 'Nice! ' + expected.say};
    res.end(JSON.stringify({ choices:[{message:{content:JSON.stringify(value)}}] }));
  });
  const upstreamURL=await listen(upstream);
  brain=createServer({ key:'mock-only-not-a-real-key', model:'mock', url:upstreamURL, timeoutMs:6000, origins:[URL] });
  const brainURL=await listen(brain);
  for (const tier of [1,2,3]) {
    const seed=next(fixture); seed.adventure.levels.tree={t1:tier>=2?2:0,t2:tier===3?2:0,t3:0};
    p=await page(seed,{endpoint:brainURL+'/buddy'}); const d=await chat(p); assert.equal(d.tier,tier);
    assert((await p.locator('#chat-question').innerText()).startsWith('Nice!'), JSON.stringify({tier, say: await p.locator('#chat-question').innerText(), calls: upstreamCalls.slice(-2),network:p.network,endpoint:await p.evaluate(()=>BRAIN_URL)}));
    assert((await p.evaluate(()=>spoken)).some(s=>s.startsWith('Nice!')));
    await voice(p,'tree'); assert.equal((await snapshot(p)).adventure.levels.tree['t'+tier],1); await checkClose(p);
  }
  assert.match(upstreamCalls[1].messages.at(-1).content,/Correction/);
  report('all tiers browser -> HTTP buddy -> mock DeepSeek, corrective retry, validated bubble and TTS');
  const invalid = [p=>({...template(normalize(p)),say:'你好'}), p=>({...template(normalize(p)),options:['tree','cat']}), p=>({...template(normalize(p)),answer:'wood'}), p=>({...template(normalize(p)),done:true}), p=>({...template(normalize(p)),say:'Tree or wood? rocket'}), p=>({...template(normalize(p)),reward:100}), '{bad json'];
  for(const reply of invalid) { p=await page(next(fixture),{endpoint:URL+'/mock-buddy',reply}); await chat(p); assert.equal(await p.locator('#chat-question').innerText(),'Tree or wood?'); await checkClose(p); }
  p=await page(next(fixture),{endpoint:'http://127.0.0.1:1/buddy'}); await chat(p); assert.equal(await p.locator('#chat-question').innerText(),'Tree or wood?'); await checkClose(p);
  p=await page(next(fixture),{endpoint:URL+'/mock-buddy',reply:q=>template(normalize(q)),delay:350,timeout:100}); await chat(p);
  assert.equal(await p.locator('#chat-question').innerText(),'Tree or wood?'); await checkClose(p);
  report('client rejects unsafe/stale rule fields and falls back on malformed JSON/network error/timeout');
  for (const [tier, say] of [[1, 'Tree or wood? What is wood?'], [2, "What's this? What can you say?"], [3, 'I see a tree. Say wood!']]) {
    const seed = next(fixture); seed.adventure.levels.tree = { t1: tier >= 2 ? 2 : 0, t2: tier === 3 ? 2 : 0, t3: 0 };
    p = await page(seed, { endpoint: URL + '/mock-buddy', reply: q => ({ ...template(normalize(q)), say: q.feedback === 'success' ? 'Great! Say wood!' : say }) });
    await chat(p);
    assert.equal(await p.locator('#chat-question').innerText(), template(normalize(p.calls[0])).say);
    await voice(p, 'tree');
    assert.equal(await p.locator('#chat-question').innerText(), 'Great! Keep exploring!');
    assert(!(await p.evaluate(() => spoken)).includes(say));
    await checkClose(p);
  }
  report('client rejects added questions, redirected sentence practice, and exercises after closing');
  p=await page(next(fixture),{endpoint:URL+'/mock-buddy',reply:q=>template(normalize(q)),delay:350});
  await p.evaluate(()=>BW.hideCard()); const pos=await p.evaluate(()=>BW.worldToScreen(87.5*32,15.5*32)); await p.mouse.click(pos.x,pos.y);
  await p.waitForFunction(()=>BW.adventure().active?.pending); await p.keyboard.press('ArrowLeft');
  await p.waitForTimeout(500); assert(!(await p.locator('#dialogue').isVisible())); assert.equal(await p.evaluate(()=>BW.adventure().active),null); await checkClose(p);
  report('movement cancels pending dialogue; late response cannot reopen it');
  // Legacy v1 adventure has no levels/speaking. Malformed optional fields must remain harmless.
  const legacy=next(fixture); delete legacy.adventure.levels; delete legacy.adventure.speaking;
  p=await page(legacy); assert.equal((await chat(p)).tier,1); const saved=await snapshot(p); assert(saved.adventure.levels); assert(Array.isArray(saved.adventure.speaking)); await checkClose(p);
  const malformed=next(fixture); malformed.adventure.levels={tree:{t1:-10,t2:'invalid'}}; malformed.adventure.speaking=[null,{time:'bad'}, {time:Date.now(),word:'cat',scene:'invalid',spoke:true}];
  p=await page(malformed); assert.equal((await chat(p)).tier,1); assert.equal((await snapshot(p)).adventure.speaking.length,1); await checkClose(p);
  p=await page(next(data)); const restored=await snapshot(p); assert.deepEqual(restored.adventure.levels,data.adventure.levels); assert.deepEqual(restored.adventure.speaking,data.adventure.speaking); await checkClose(p);
  report('legacy/malformed optional data and new mastery/speaking records save compatibility');
  // File URL + offline context proves the configured brain still has local fallback.
  const offline=await browser.newContext({offline:true,viewport:{width:1180,height:720}}); const f=await offline.newPage();
  await f.addInitScript(data=>localStorage.setItem('block-world-save-v1',JSON.stringify(data)),next(fixture));
  await f.goto('file://'+require('node:path').resolve(__dirname,'../index.html')); await f.click('#btn-start'); assert(await f.evaluate(()=>BW.layout().started)); await chat(f); assert.equal(await f.locator('#chat-question').innerText(),'Tree or wood?'); await offline.close();
  report('configured BRAIN_URL starts and falls back to template dialogue offline from file://');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{await browser?.close();await close(brain);await close(upstream);});
