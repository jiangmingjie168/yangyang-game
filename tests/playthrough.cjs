/* Shell-only browser checks. No test dependency is loaded by index.html.
   Run: PLAYWRIGHT_MODULE=/tmp/node_modules/playwright node tests/playthrough.cjs
   Serve this folder separately; BW_URL defaults to http://127.0.0.1:19273. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const URL = process.env.BW_URL || 'http://127.0.0.1:19273';
const SCREEN = path.resolve(__dirname, '../screens');
const results = []; let serial = 0, browser;
const report = (name, details) => { results.push({ name, status: 'passed', details }); console.log('PASS', name, details || ''); };
const sleep = (p, ms) => p.waitForTimeout(ms);
async function snapshot(p) { return p.evaluate(() => { BW.saveNow(); return JSON.parse(localStorage.getItem('block-world-save-v1')); }); }
async function fresh(data, { viewport = { width: 1180, height: 720 }, speech = true, fakeRecognition = false } = {}) {
  const context = await browser.newContext({ viewport });
  await context.route('**/*', r => {
    if (r.request().url() === URL + '/') return r.fulfill({contentType:'text/html',body:fs.readFileSync(path.resolve(__dirname,'../index.html'),'utf8').replace(/^const BRAIN_URL = '[^']*';$/m, "const BRAIN_URL = '';")});
    return new global.URL(r.request().url()).origin === new global.URL(URL).origin ? r.continue() : r.abort();
  });
  const p = await context.newPage(); p.errors = [];
  p.on('pageerror', e => p.errors.push(String(e)));
  await p.addInitScript(({ data, speech, fakeRecognition }) => {
    if (data && !sessionStorage.getItem('fixture')) { localStorage.setItem('block-world-save-v1', JSON.stringify(data)); sessionStorage.setItem('fixture', 'yes'); }
    window.spoken = [];
    if (speech && window.speechSynthesis) { const original = speechSynthesis.speak.bind(speechSynthesis); speechSynthesis.speak = u => { window.spoken.push({ text: u.text, lang: u.lang }); original(u); }; }
    if (!speech) Object.defineProperty(window, 'speechSynthesis', { value: undefined });
    if (fakeRecognition) {
      window.SpeechRecognition = class {
        start() { window.testRecognizer = this; }
        abort() { this.onend?.(); }
      };
      window.voiceResult = function (text) { const r = window.testRecognizer; r.onresult?.({ resultIndex: 0, results: [[{ transcript: text }]] }); r.onend?.(); };
    } else {
      Object.defineProperty(window, 'SpeechRecognition', { value: undefined, configurable: true });
      Object.defineProperty(window, 'webkitSpeechRecognition', { value: undefined, configurable: true });
    }
  }, { data, speech, fakeRecognition });
  await p.goto(URL + '/#seed=42'); assert(!/[\u3400-\u9fff]/u.test(await p.locator('body').innerText())); if (await p.locator('#btn-portrait').isVisible()) await p.click('#btn-portrait'); await p.click('#btn-start'); if(await p.locator('#name-entry').isVisible())await p.click('#welcome-play'); await sleep(p, 250);
  assert.equal(await p.evaluate(() => BW.totalWords()), 42);
  return p;
}
async function check(p) { assert.deepEqual(p.errors, []); assert.equal(await p.evaluate(() => BW.error()), ''); }
async function photo(p, name) { await p.screenshot({ path: path.join(SCREEN, name + '.png') }); }
async function clear(p) {
  await p.keyboard.press('Escape'); await p.evaluate(() => BW.hideCard());
  const d=await p.evaluate(()=>BW.adventure().active);
  if(d) {
    if(!d.answered) { if(!d.choices)await p.click('#chat-choices');await p.locator('[data-word="'+d.key+'"]').click(); }
    await p.waitForFunction(()=>!BW.adventure().active);
  }
}
async function clickWorld(p, x, y, button = 'left') {
  await clear(p);
  const s = await p.evaluate(([x,y]) => BW.worldToScreen(x,y), [x,y]);
  assert(s.x > 0 && s.x < p.viewportSize().width && s.y > 65 && s.y < p.viewportSize().height - 110, JSON.stringify(s));
  await p.mouse.click(s.x, s.y, { button }); await sleep(p, 70);
}
async function relocate(p, x, y = 511.9, companionX) {
  const d = await snapshot(p); d.px = x; d.py = y;
  if (companionX !== undefined) d.animals.filter(a=>a[4]).forEach(a=>{a[1]=companionX;a[2]=y;});
  const mark = 'checkpoint-' + serial++;
  await p.addInitScript(({d,mark}) => { if (!sessionStorage.getItem(mark)) { localStorage.setItem('block-world-save-v1',JSON.stringify(d)); sessionStorage.setItem(mark,'1'); } }, {d,mark});
  await p.reload(); if (await p.locator('#btn-portrait').isVisible()) await p.click('#btn-portrait'); await p.click('#btn-start'); if(await p.locator('#name-entry').isVisible())await p.click('#welcome-play'); await sleep(p, 240); await clear(p);
}
async function select(p,key) { await p.evaluate(key => BW.select(key),key); }
async function mine(p,tx,ty) { await clickWorld(p,(tx+.5)*32,(ty+.5)*32); }
async function place(p,key,tx,ty) { await select(p,key); await clickWorld(p,(tx+.5)*32,(ty+.5)*32,'right'); }
async function animal(p,type,times=1) {
  let a = await p.evaluate(type => BW.animals().find(a=>a.type===type), type);
  await relocate(p,a.x-50);
  for (let i=0;i<times;i++) { a=await p.evaluate(type=>BW.animals().find(a=>a.type===type),type); await clickWorld(p,a.x,a.y-16); }
}
async function craft(p,key,n=1) {
  const keys=['planks','stick','table','door','torch','bed','house','fence','rod','boat'];
  await clear(p); await p.click('#btn-craft');
  for(let i=0;i<n;i++) { await p.evaluate(()=>BW.hideCard()); await p.locator('.recipe').nth(keys.indexOf(key)).locator('.craftbtn').click(); }
  await p.click('#craft-back');
}
async function waitChat(p,anchor) {
  await p.waitForFunction(anchor => BW.adventure().active?.anchor===anchor,anchor,{timeout:7500});
  const d = await p.evaluate(()=>BW.adventure().active);
  const words = await p.evaluate(()=>BW.words()); d.options.forEach(k=>assert(words.includes(k)));
  assert.equal(await p.locator('#dialogue').isVisible(),true); return d;
}
async function assertQi(p,n) { assert.equal(await p.evaluate(()=>BW.questIndex()),n); }
async function heldMove(p,dir,ms) { await p.keyboard.down(dir); await sleep(p,ms); await p.keyboard.up(dir); }
(async()=>{
  fs.mkdirSync(SCREEN,{recursive:true});
  browser = await chromium.launch({executablePath:process.env.CHROMIUM || '/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});
  // A complete mission regression: resources and travel checkpoints are test fixtures;
  // all 24 task conditions are earned through pointer/keyboard game actions.
  const p = await fresh();
  await mine(p,87,15); await assertQi(p,1);
  let d = await waitChat(p,'task'); await photo(p,'dialogue-task');
  const progressBefore = (await snapshot(p)).progress;
  await p.locator(`#chat-options [data-word="${d.options.find(k=>k!==d.key)}"]`).click();
  assert.equal(await p.locator('.hint-answer').count(),1); assert.deepEqual((await snapshot(p)).progress,progressBefore);
  await p.locator(`#chat-options [data-word="${d.key}"]`).click();
  assert.equal((await p.evaluate(()=>BW.adventure())).trail.turns,1);
  report('Task completion dialogue and gentle retry',d.question);
  await mine(p,84,15); await assertQi(p,2);
  await relocate(p,3805); await mine(p,120,16); await assertQi(p,3);
  await animal(p,'sheep'); await assertQi(p,4);
  await p.evaluate(()=>{ BW.give('wood',30);BW.give('wool',10);BW.give('stone',10); });
  await craft(p,'planks',12); await assertQi(p,5);
  await craft(p,'door'); await assertQi(p,6);
  await craft(p,'stick'); await craft(p,'torch');
  await relocate(p,2544); await place(p,'torch',77,15); await assertQi(p,7);
  await craft(p,'bed'); await assertQi(p,8); assert(await p.evaluate(()=>BW.hasHat()));
  report('Chapter 1: all 8 tasks and hat earned');
  await craft(p,'table'); await assertQi(p,9);
  await animal(p,'cow'); await assertQi(p,10);
  await animal(p,'chicken'); await assertQi(p,11);
  await relocate(p,2544); await place(p,'door',78,15); await assertQi(p,12);
  await craft(p,'house'); await assertQi(p,13);
  await craft(p,'fence'); await place(p,'fence',82,15); await assertQi(p,14);
  await p.evaluate(()=>BW.setTime(.8)); await place(p,'torch',83,15); await assertQi(p,15);
  await animal(p,'duck'); await assertQi(p,16);
  report('Chapter 2: all 8 tasks, including night torch');
  await craft(p,'rod'); await assertQi(p,17);
  // Keep chapter-three checkpoint for independent anchor and fallback checks.
  const chapter3 = await snapshot(p);
  await relocate(p,3830); await select(p,'rod'); await mine(p,121,16);
  assert(await p.evaluate(()=>BW.ch3().fishing));
  await sleep(p,500); assert.equal(await p.locator('#dialogue').isVisible(),false);
  await p.waitForFunction(()=>BW.ch3().fish===1); await assertQi(p,18);
  await waitChat(p,'fish'); await photo(p,'dialogue-fish');
  assert.equal((await p.evaluate(()=>BW.inv())).fish,1);
  await p.click('#chat-mic'); assert.match(await p.locator('#chat-status').textContent(),/Tap an answer/);
  report('Fishing: real cast, wait, catch and fish dialogue; missing recognition tap fallback');
  await clear(p); await relocate(p,2544);
  await p.evaluate(()=>BW.give('seed',2)); await place(p,'seed',75,15); await assertQi(p,19);
  // Wait for the actual 28-second crop growth; never call BW.grow().
  const growthDeadline=Date.now()+45000;
  while(!(await p.evaluate(()=>BW.ch3().wheatRipe))) { assert(Date.now()<growthDeadline);await sleep(p,250);if(await p.evaluate(()=>BW.adventure().active))await clear(p); }
  await assertQi(p,20);
  const overlappingCrop=await snapshot(p);const overlappingSheep=overlappingCrop.animals.find(a=>a[0]==='sheep');overlappingSheep[1]=75.5*32;overlappingSheep[2]=512;
  const cropCheck=await fresh(overlappingCrop);await mine(cropCheck,75,15);await assertQi(cropCheck,21);await check(cropCheck);await cropCheck.context().close();
  await mine(p,75,15); await assertQi(p,21); assert((await p.evaluate(()=>BW.inv())).wheat>=2);
  await photo(p,'regression-farm'); report('Plant → actual growth timer → harvest');
  await craft(p,'boat'); await assertQi(p,22);
  await relocate(p,3830); await select(p,'boat'); await mine(p,121,16);
  let b=await p.evaluate(()=>BW.ch3().boat); assert(b); await clickWorld(p,b.x,b.y-8);
  assert(await p.evaluate(()=>BW.ch3().riding)); await assertQi(p,23);
  await p.keyboard.down('ArrowRight'); await sleep(p,800); assert.equal(await p.locator('#dialogue').isVisible(),false);
  await sleep(p,1750); await p.keyboard.up('ArrowRight');
  assert((await p.evaluate(()=>BW.ch3().boat)).x>132*32);
  await p.keyboard.press('Space'); await sleep(p,850);
  assert(!(await p.evaluate(()=>BW.ch3().riding))); assert((await p.evaluate(()=>BW.player())).x>133*32);
  await waitChat(p,'boat'); await photo(p,'dialogue-boat');
  report('Boat: place → board → cross → disembark → dry-land arrival dialogue');
  await animal(p,'dog',3); await assertQi(p,24); assert(await p.evaluate(()=>BW.ch3().pack));
  await clear(p);
  // Follow on a clear meadow, using the tamed dog earned above.
  await relocate(p,2400,511.9,2370); const dogBefore=await p.evaluate(()=>BW.animals().find(a=>a.type==='dog').x);
  await heldMove(p,'ArrowLeft',2000); await sleep(p,850);
  const dogAfter=await p.evaluate(()=>BW.animals().find(a=>a.type==='dog').x);
  assert(Math.abs(dogAfter-dogBefore)>80);
  await waitChat(p,'pet'); await photo(p,'dialogue-pet');
  report('Pet: actual three taps to tame, follow movement, stop and pet dialogue');
  // Old-world quiz still awards its own star without changing completed missions.
  await clear(p); const savedBeforeQuiz=await snapshot(p);
  // Seed a learned nearby animal to make the random quiz target deterministic, preserving progress.
  const quizData=structuredClone(savedBeforeQuiz);quizData.words=['sheep'];
  const sheep=quizData.animals.find(a=>a[0]==='sheep');quizData.px=sheep[1]-50;quizData.py=512;
  const q=await fresh(quizData); await clear(q); await q.click('#btn-words'); await q.click('#btn-quiz');
  assert.equal(await q.evaluate(()=>BW.quiz()),'sheep');
  await q.waitForFunction(()=>BW.stars().includes('sheep'));
  assert.deepEqual((await snapshot(q)).progress,savedBeforeQuiz.progress);await photo(q,'regression-quiz'); await check(q); await q.context().close();
  report('Treasure Quiz proximity win, star, and unchanged mission progress');
  await clear(p); const spokenBefore=await p.evaluate(()=>spoken.length); await p.click('#btn-speak');
  const speech=await p.evaluate(n=>spoken.slice(n),spokenBefore); assert(speech.some(u=>u.lang.startsWith('en')));assert(!speech.some(u=>u.lang.startsWith('zh')));
  report('Existing Say-It task narration invokes English browser TTS');
  // Save/resume all original progress, pet, inventory and optional exploration data.
  await p.evaluate(()=>BW.saveNow());const saved=await snapshot(p);await p.reload();await p.click('#btn-start'); if(await p.locator('#name-entry').isVisible())await p.click('#welcome-play');
  const resumed=await snapshot(p);assert.deepEqual(resumed.progress,saved.progress);assert.deepEqual(resumed.adventure,saved.adventure);assert.deepEqual(resumed.words,saved.words);assert.deepEqual(resumed.inv,saved.inv);
  assert.equal(await p.evaluate(()=>BW.questIndex()),24);assert((await p.evaluate(()=>BW.ch3())).pet.includes('dog'));
  report('Save/resume: all 24 tasks, backpack, pet, learned words, inventory and discovery state');
  // Swimming is exercised from a saved checkpoint inside the unmodified pond.
  await relocate(p,126*32,530);await sleep(p,500);const swimStart=await p.evaluate(()=>BW.player());
  await heldMove(p,'ArrowRight',900); const swimEnd=await p.evaluate(()=>BW.player());
  assert(swimEnd.x>swimStart.x+35); assert.equal(await p.locator('#dialogue').isVisible(),false);await photo(p,'regression-swim');
  report('Swimming: enter water, move with swimming physics, no incoming dialogue');
  await check(p); await p.context().close();
  // Isolated checkpoints exercise discovery, scene, vocabulary and voice handling.
  const e=await fresh(chapter3);
  const spot=await e.evaluate(()=>BW.adventure().spots[0]); await relocate(e,spot.x+85,spot.y+15);
  await heldMove(e,'ArrowLeft',650);await sleep(e,250);
  assert.equal((await e.evaluate(()=>BW.adventure())).trail.found['0']!==undefined,true);
  const count=(await e.evaluate(()=>BW.adventure())).trail.found;
  await photo(e,'exploration-discovery'); await e.evaluate(()=>BW.saveNow()); await e.reload();await e.click('#btn-start'); if(await e.locator('#name-entry').isVisible())await e.click('#welcome-play');
  assert.deepEqual((await e.evaluate(()=>BW.adventure())).trail.found,count);
  await e.click('#btn-words');assert.equal(await e.locator('#trail-album button').count(),7);await e.click('#book-back');
  report('Exploration: walk into hidden gift, gain picture/materials, persist album');
  await check(e); await e.context().close();
  const sceneData=structuredClone(chapter3);sceneData.px=(70+43)*32;sceneData.py=512;delete sceneData.adventure;
  const n=await fresh(sceneData);await clear(n);await heldMove(n,'ArrowRight',650);await waitChat(n,'scene');await photo(n,'dialogue-scene');await check(n);await n.context().close();
  report('New scene: cross zone boundary and stop before dialogue');
  // Early chapter fixture deliberately includes later words to verify chapter gates.
  const early=structuredClone(chapter3); early.progress={mined:{},crafted:{},placed:{},tapped:{},tree:0,water:0,nightTorch:0,fish:0,wheatRipe:0,boatRide:0,pet:0};early.mods=[];early.px=2544;early.py=512;delete early.adventure;
  const v=await fresh(early,{fakeRecognition:true});await mine(v,87,15);d=await waitChat(v,'task');
  assert(!d.options.some(k=>['fish','boat','rod','wheat','seed','pet','follow','table','cow','chicken','house','fence','duck','horse','rabbit'].includes(k)));
  await v.click('#chat-mic'); await v.evaluate(()=>{testRecognizer.onerror({error:'not-allowed'});testRecognizer.onend?.();});assert.match(await v.locator('#chat-status').textContent(),/Tap an answer/);
  await v.click('#chat-mic'); await v.evaluate(()=>voiceResult('unrelated words'));assert(!(await v.evaluate(()=>BW.adventure().active)).answered);
  // A one-character recognition error is accepted without scoring pronunciation.
  const typo=d.key==='tree'?'tre':d.key==='wood'?'wod':d.key.slice(0,-1);
  await v.click('#chat-mic');await v.evaluate(t=>voiceResult(t),typo);assert((await v.evaluate(()=>BW.adventure().active)).answered);
  report('Speech adapter: unrecognized retry + approximate answer; early chapter gates',d.options.join('/'));
  await check(v); await v.context().close();
  const silent=await fresh(early,{speech:false,viewport:{width:390,height:844}});await mine(silent,87,15).catch(async()=>{await relocate(silent,87*32-45);await mine(silent,87,15);});
  await waitChat(silent,'task');await photo(silent,'portrait-no-audio');
  const box=await silent.locator('#dialogue').boundingBox();assert(box.x>=0&&box.x+box.width<=390);
  const text=await silent.locator('body').innerText(); assert(!/[\u3400-\u9fff]/u.test(text));
  assert(!(await silent.locator('#chat-close').isVisible()));await silent.click('#btn-zh');assert(await silent.locator('#parent-help').isVisible());await silent.click('#parent-close');
  report('Portrait, no TTS/no recognition fallback; child UI English and parent settings Chinese');
  await check(silent);await silent.context().close();
  // Real offline file load: no server, no external dependency and no speech service.
  const offlineContext=await browser.newContext({offline:true,viewport:{width:844,height:390}});
  const offline=await offlineContext.newPage();offline.errors=[];offline.on('pageerror',e=>offline.errors.push(String(e)));
  await offline.goto('file://'+path.resolve(__dirname,'../index.html'));await offline.click('#btn-start'); if(await offline.locator('#name-entry').isVisible())await offline.click('#welcome-play');
  await heldMove(offline,'ArrowLeft',450);assert(await offline.evaluate(()=>BW.layout().started));
  await photo(offline,'offline-landscape');await check(offline);await offlineContext.close();
  report('Offline file:// start and movement; short landscape layout');
  // Repeated fishing must naturally retrieve an older word from the same setting.
  const repeat=await fresh(chapter3);await relocate(repeat,3830);await select(repeat,'rod');await mine(repeat,121,16);
  let first=await waitChat(repeat,'fish');assert.equal(first.key,'fish');
  await repeat.locator('#chat-options [data-word="fish"]').click();await sleep(repeat,1900);
  const reviewSave=await snapshot(repeat);assert.equal(reviewSave.adventure.reviews.fish.n,1);
  await repeat.reload();await repeat.click('#btn-start'); if(await repeat.locator('#name-entry').isVisible())await repeat.click('#welcome-play');await sleep(repeat,250);await select(repeat,'rod');await mine(repeat,121,16);
  let second=await waitChat(repeat,'fish');assert.equal(second.key,'water');
  assert(second.options.some(k=>['wood','stone','tree'].includes(k)));await check(repeat);await repeat.context().close();
  report('Spiral recurrence: fish encounter revisits earlier water/wood after save/resume');
  fs.writeFileSync(path.join(SCREEN,'test-results.json'),JSON.stringify({browser:'Headless Chromium',fixtures:'Seed 42; tools/materials and travel checkpoints supplied; mission flags earned by inputs; fake recognition explicitly marked',results},null,2)+'\n');
  console.log('ALL',results.length,'CHECKS PASSED');
})().catch(async e=>{console.error(e);for(const context of browser?.contexts()||[]){for(const p of context.pages()){await p.screenshot({path:'/tmp/bw-failure-'+serial+++'.png'}).catch(()=>{});console.error(await p.evaluate(()=>({ch:window.BW?.ch3(),adventure:window.BW?.adventure(),player:window.BW?.player()})).catch(()=>({})));}}process.exitCode=1}).finally(async()=>{await browser?.close()});
