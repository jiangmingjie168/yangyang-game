'use strict';
// Original HTML bytes. Only pointer/keyboard input drives gameplay.
// localStorage is used solely for main-format setup and read-only save assertions.
// No BW calls, world/camera probes, injected game functions or HTML rewriting.
// Speech instrumentation observes the browser API; it never supplies game answers.
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..'), source = fs.readFileSync(path.join(root,'index.html'));
const legacy = JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/build-v1-main-save.json')));
const origin = 'http://build-v1.test', key = 'block-world-save-v1', results = [], screenshots = [], errors = [];
let browser, current;
const cases = ['phone house and pen','remove returns inventory','refresh persists buildings','main save retains data','pet enters pen','no build modal','tier-one text and speech','names never use TTS'];
function pass(name, details) { results.push({case:name,status:'PASS',details}); }
async function snap(p, name) { const file='screens/build-v1-'+name+'.png'; await p.screenshot({path:path.join(root,file)});screenshots.push(file); }
async function saved(p) { return p.evaluate(k=>JSON.parse(localStorage.getItem(k)), key); }
async function dismissWelcome(p) { if(await p.locator('#welcome-play').isVisible())await p.locator('#welcome-play').click(); }
async function clearOverlay(p) {
  if(await p.locator('#wordcard').isVisible()) await p.locator('#wordcard').click({force:true}).catch(()=>{});
  if(await p.locator('#dialogue').isVisible()) await p.keyboard.press('Escape');
  await p.keyboard.press('Escape');
  await p.waitForTimeout(80);
}
async function fresh(data=legacy, viewport={width:844,height:390}) {
  const c=await browser.newContext({viewport});
  await c.route(origin+'/**',r=>r.fulfill({contentType:'text/html; charset=utf-8',body:source}));
  // An unupgraded brain rejects new words. No live service is contacted.
  await c.route('https://brain.yydriver.cn/**',r=>r.fulfill({status:r.request().url().endsWith('/audio/index.json')?200:400,contentType:'application/json',body:r.request().url().endsWith('/audio/index.json')?'{}':'{"error":"invalid vocabulary"}'}));
  await c.addInitScript(({data,key})=>{
    if(data && !sessionStorage.getItem('build-fixture-loaded')) { localStorage.setItem(key,JSON.stringify(data));sessionStorage.setItem('build-fixture-loaded','yes'); }
    window.buildSpeechObserved=[];
    if(window.speechSynthesis) {const speak=speechSynthesis.speak.bind(speechSynthesis);speechSynthesis.speak=function(u){buildSpeechObserved.push(u.text);return speak(u);};}
  },{data,key});
  const p=await c.newPage(); current=p;
  p.on('pageerror',e=>errors.push(e.message));
  p.on('console',m=>{if(m.type()==='error' && !/Failed to load resource|ERR_FAILED/.test(m.text()))errors.push(m.text());});
  await p.goto(origin);await p.locator('#btn-start').click();return p;
}
async function tool(p,word){await p.locator('[data-build="'+word+'"]').click();}
async function cell(p,x,y) { await clearOverlay(p); await p.mouse.click(x,y); await p.waitForTimeout(40); assert.equal(await p.locator('#dialogue').isVisible(),false); assert.equal(await p.locator('#wordcard').isVisible(),false); }
async function count(p,word) {return Number(await p.locator('#hotbar button[aria-label="'+word+'"] em').innerText());}
async function hold(p,code,ms){await p.keyboard.down(code);await p.waitForTimeout(ms);await p.keyboard.up(code);}
(async()=>{
  browser=await chromium.launch({executablePath:process.env.CHROME||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});
  // Fresh-save feedback is a release gate; the stocked legacy fixture below
  // only verifies compatibility and construction mechanics.
  await require('./build-v1-fix1.cjs')(browser);
  let p=await fresh();await dismissWelcome(p);await p.locator('#btn-build').click();
  await snap(p,'01-main-save');
  // An entire four-block roof must fail atomically when even its far end is
  // occluded. No block or inventory changes may escape the preflight check.
  await tool(p,'planks');await cell(p,430,224);
  const beforeBlockedRoof=await saved(p);
  await tool(p,'roof');await cell(p,468,148);
  assert.equal(await count(p,'House'),12);
  assert.deepEqual((await saved(p)).mods,beforeBlockedRoof.mods);
  assert.equal(await p.locator('#toast').innerText(),'Move around the wall!');
  await tool(p,'remove');await cell(p,430,224);assert.equal(await count(p,'Planks'),40);

  // Fixed CSS coordinates for the seed-42 main-format plot, at 844x390.
  // Home feet are at (354,281); grid spacing is 38. No runtime coordinate conversion.
  // House: columns 81..84, top row 12, floor is existing grass row 16.
  // Place the roof and far wall before closing the near wall: no through-wall clicks.
  await tool(p,'roof');await cell(p,430,148);
  await tool(p,'planks');
  for(const [x,y] of [[544,186],[544,224],[544,262],[430,186],[430,224]])await cell(p,x,y);
  await tool(p,'door');await cell(p,430,262);
  // Pen to the left, with a walk-through door on its right boundary.
  await tool(p,'fence');
  for(const [x,y] of [[164,186],[202,186],[240,186],[278,186],[164,224],[164,262],[278,224]])await cell(p,x,y);
  await tool(p,'door');await cell(p,278,262);
  await snap(p,'02-house-and-pen');
  assert.equal(await count(p,'Planks'),35);assert.equal(await count(p,'House'),8);assert.equal(await count(p,'Fence'),13);assert.equal(await count(p,'Door'),4);
  await p.waitForTimeout(5500); await clearOverlay(p);
  let data=await saved(p);assert(data.builds.some(b=>b.kind==='house'));assert(data.builds.some(b=>b.kind==='pen'));
  pass(cases[0],{viewport:'844x390',house:'5 walls + door + whole roof',pen:'7 fence blocks + door',builds:data.builds});
  const before=await count(p,'Planks');await clearOverlay(p);await tool(p,'remove');await cell(p,430,224);
  const after=await count(p,'Planks');assert.equal(after,before+1);await snap(p,'03-returned-material');
  await tool(p,'planks');await cell(p,430,224);assert.equal(await count(p,'Planks'),before);
  pass(cases[1],{before,after});
  // Craft the one new block through the real recipe UI, then insert it in the wall.
  await p.locator('#btn-craft').click();
  await p.locator('#recipes .recipe').filter({has:p.locator('.out b', {hasText:'Window'})}).locator('.craftbtn').click();
  await p.locator('#craft-back').click();
  await tool(p,'remove');await cell(p,430,224);
  await tool(p,'window');await cell(p,430,224);assert.equal(await count(p,'Window'),1);
  await snap(p,'10-window');
  // Walk through the house door. The dog chooses an interior destination.
  await hold(p,'KeyD',850);await p.waitForTimeout(4200);await snap(p,'04-house-room');
  data=await saved(p);assert(data.words.includes('room'));assert(data.words.includes('window'));assert(data.words.includes('wall'));assert(data.words.includes('roof'));
  // Walk back through the house and into the pen via its door; no teleport.
  await hold(p,'KeyA',1850);await p.waitForTimeout(5500);await snap(p,'05-pet-in-pen');
  data=await saved(p);const pen=data.builds.find(b=>b.kind==='pen'),dog=data.animals.find(a=>a[0]==='dog'&&a[4]);
  assert(pen&&dog);assert(dog[1]>=pen.x*32 && dog[1]<(pen.x+pen.w)*32 && dog[2]>(pen.y)*32 && dog[2]<=(pen.y+pen.h)*32+1, JSON.stringify({pen,dog,player:[data.px,data.py]}));
  pass(cases[4],{pen,dog});
  assert.equal(await p.locator('#dialogue').isVisible(),false);assert.equal(await p.locator('#chat-shade').isVisible(),false);pass(cases[5]);
  const persisted=await saved(p);await p.reload();await p.locator('#btn-start').click();await dismissWelcome(p);await p.locator('#btn-build').click();await p.waitForTimeout(5500);
  const restored=await saved(p);assert.deepEqual(restored.mods,persisted.mods);assert.deepEqual(restored.inv,persisted.inv);assert.equal(restored.builds.length,2);await snap(p,'06-restored');pass(cases[2]);
  for(const word of legacy.words)assert(restored.words.includes(word),word);
  assert.deepEqual(restored.stars,legacy.stars);assert.equal(restored.seed,legacy.seed);assert.deepEqual(restored.adventure.reviews,legacy.adventure.reviews);assert.deepEqual(restored.adventure.levels,legacy.adventure.levels);assert.deepEqual(restored.prefs,legacy.prefs);assert.deepEqual(restored.intros,legacy.intros);assert.equal(restored.progress.mined.wood,1);assert.equal(restored.progress.pet,1);
  await p.locator('#btn-words').click();assert.match(await p.locator('#book-count').innerText(),/47/);await snap(p,'11-word-book');await p.locator('#book-back').click();
  pass(cases[3],{fixture:'tests/fixtures/build-v1-main-save.json',originalFormat:true});await snap(p,'07-legacy-retained');await p.context().close();
  // Fresh world, natural far tree path; no vocabulary/setup probes.
  p=await fresh(null,{width:1000,height:360});await dismissWelcome(p);await p.mouse.click(700,251);
  await p.locator('#hotbar button[aria-label="Wood"]').waitFor({state:'visible',timeout:12000});
  await p.locator('#dialogue:not([hidden]) #chat-question').waitFor({state:'visible',timeout:15000});
  await p.waitForTimeout(800);assert.equal(await p.locator('#chat-question').innerText(),'What is this?');assert(await p.locator('#chat-picture').isVisible());
  const options=await p.locator('#chat-options button').allTextContents();assert.equal(options.length,2);assert(options.every(t=>t.trim()));
  const spoken=await p.evaluate(()=>buildSpeechObserved.slice());const prompt=spoken.lastIndexOf('What is this?');assert(prompt>=0);assert(!spoken.slice(prompt).some(t=>/\bor\b|\b(tree|wood)\b/i.test(t)));
  await snap(p,'08-safe-tier-one');
  const first=p.locator('#chat-options button').first(),label=await first.getAttribute('aria-label');await first.click();await p.waitForTimeout(250);assert((await p.evaluate(()=>buildSpeechObserved)).includes(label));pass(cases[6],{prompt:'What is this?',options,spoken});await p.context().close();
  // Named greeting, absent preset audio and a name outside the preset set.
  for(const name of ['', 'Mario', 'Zyxora']){
    const d=structuredClone(legacy);d.child_name=name;
    p=await fresh(d);await p.waitForTimeout(1200);
    assert(await p.locator('#welcome').isVisible(),'silent greeting stays readable');
    const text=await p.locator('#welcome-line').innerText(),utterances=await p.evaluate(()=>buildSpeechObserved.slice());
    if(name){assert(text.includes(name));assert.deepEqual(utterances,[],name+' must never use browser TTS');}
    else assert(!/Mario|Zyxora/.test(text));
    await snap(p,'09-name-'+(name||'empty'));await p.context().close();
  }
  pass(cases[7],{audio:'missing; Jenny-only named paths remain silent',names:['','Mario','Zyxora']});
  assert.deepEqual(errors,[]);
})().catch(async e=>{
  const blocked=/browserType.launch|listen EPERM|setsockopt/.test(String(e));
  if(browser&&current&&!current.isClosed())await snap(current,'failure').catch(()=>{});
  results.push({case:'run',status:blocked?'BLOCKED':'FAIL',error:String(e)});
  for(const name of cases)if(!results.some(r=>r.case===name))results.push({case:name,status:blocked?'BLOCKED':'NOT RUN'});
  console.error(e);process.exitCode=1;
}).finally(async()=>{
  await browser?.close();
  fs.writeFileSync(path.join(root,'screens/build-v1-results.json'),JSON.stringify({results,screenshots,errors},null,2)+'\n');
  console.log(JSON.stringify({results,screenshots},null,2));
});
