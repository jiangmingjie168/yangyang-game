'use strict';
// Run 2 headless integration. No DeepSeek, no real microphone; synthetic WebAudio is instrumented.
// Serve the repo locally. PLAYWRIGHT_MODULE=/tmp/node_modules/playwright node tests/world-v2.cjs
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const URL = process.env.BW_URL || 'http://127.0.0.1:19273';
const NOW = Date.parse('2026-11-04T20:00:00Z');
const MONDAY = Date.parse('2026-11-02T08:00:00Z'); // Monday midnight in Los Angeles (after DST).
const source = fs.readFileSync(path.resolve(__dirname,'../index.html'), 'utf8').replace(/^const BRAIN_URL = '[^']*';$/m, "const BRAIN_URL = '';");
// Read-only probes exist only in the test response; production adds no testing controls.
const html = source.replace('ready: true,', `ready: true,
  testEffects: () => JSON.parse(JSON.stringify(parts)),
  testIcon: (key, phase) => { const c = document.createElement('canvas'); c.width=c.height=128; paintIcon(c,key,phase); return c.toDataURL(); },
  testWords: () => Object.keys(WORD),
  testGround: (x,y) => [base[idx(x,y)], base[idx(x,y-1)]],`);
let browser, fixture, serial=0;
const report = message => console.log('PASS', message);
async function snapshot(p) { return p.evaluate(() => { BW.saveNow(); return JSON.parse(localStorage.getItem('block-world-save-v1')); }); }
async function check(p) { assert.deepEqual(p.errors, []); assert.equal(await p.evaluate(()=>BW.error()),''); }
async function page(data, options={}) {
  const context = await browser.newContext({ viewport: options.viewport || {width:1180,height:720}, timezoneId:'America/Los_Angeles', hasTouch:!!options.touch, reducedMotion:options.reduced?'reduce':'no-preference' });
  const p = await context.newPage(); p.errors=[]; p.external=[];
  p.on('pageerror',e=>p.errors.push(String(e)));
  p.on('console',m=>{if(m.type()==='error')p.errors.push(m.text());});
  await p.route('**/*',r=>{
    if (/\/audio\/build-v1\.1\/[a-z-]+\.ogg$/.test(r.request().url())) return r.fulfill({contentType:'audio/ogg',body:fs.readFileSync(path.join(__dirname,'../audio/build-v1.1',r.request().url().split('/').pop()))});
    if (r.request().url()===URL+'/') return r.fulfill({contentType:'text/html',body:html});
    p.external.push(r.request().url()); return r.abort();
  });
  await p.addInitScript(({data,NOW,audioOff})=>{
    if(data&&!sessionStorage.getItem('seeded')) { localStorage.setItem('block-world-save-v1',JSON.stringify(data)); sessionStorage.setItem('seeded','1'); }
    const D=Date; window.Date=class extends D { constructor(...args) { super(...(args.length?args:[NOW])); } static now(){return NOW;} };
    window.audioNotes=[];
    const AC=window.AudioContext;
    if(audioOff) { window.AudioContext=undefined; window.webkitAudioContext=undefined; }
    else if(AC) window.AudioContext=class extends AC {
      createOscillator() {const o=super.createOscillator(), start=o.start.bind(o), stop=o.stop.bind(o), set=o.frequency.setValueAtTime.bind(o.frequency);let freq=o.frequency.value;o.frequency.setValueAtTime=(f,t)=>{freq=f;return set(f,t);};o.start=(time)=>{audioNotes.push({freq,time});return start(time);};o.stop=(time)=>{audioNotes.at(-1).stop=time;return stop(time);};return o;}
    };
    Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{getVoices:()=>[],cancel(){},speak(){},speaking:false}});
    window.SpeechRecognition=class { start(){window.recognizer=this;} abort(){this.onend?.();} };
    window.voiceResult=text=>{const r=window.recognizer;r.onresult?.({resultIndex:0,results:[[{transcript:text}]]});r.onend?.();};
  },{data,NOW,audioOff:options.audioOff});
  await p.goto(URL+'/#seed=42');
  await p.click('#btn-start'); if(await p.locator('#name-entry').isVisible())await p.click('#welcome-play'); await p.waitForTimeout(120);
  return p;
}
async function openLog(p) { await p.evaluate(()=>BW.hideCard()); await p.click('#btn-zh'); await p.click('#parent-log-tab'); }
async function relocate(p,x,y) {
  const d=await snapshot(p);d.px=x;d.py=y;
  const mark='checkpoint-'+serial++;
  await p.addInitScript(({d,mark})=>{if(!sessionStorage.getItem(mark)){localStorage.setItem('block-world-save-v1',JSON.stringify(d));sessionStorage.setItem(mark,'yes');}},{d,mark});
  await p.reload(); await p.click('#btn-start'); if(await p.locator('#name-entry').isVisible())await p.click('#welcome-play');
  await p.evaluate(()=>BW.hideCard());
}
async function collect(p, id) {
  const before=await p.evaluate(()=>BW.adventure()), spot=before.spots.find(s=>s.id===id);
  // Travel checkpoints only. The actual ground landing earns the gift, never a found flag.
  await relocate(p,spot.x,spot.y-50);
  try { await p.waitForFunction(({id,round})=>{const t=BW.adventure().trail;return t.rounds>round||!!t.found[id];},{id,round:before.trail.rounds},{timeout:5000}); } catch(e) { console.error('GIFT',id,spot,await p.evaluate(()=>({player:BW.player(),adventure:BW.adventure(),error:BW.error()})));throw e; }
  const fx=await p.evaluate(()=>BW.testEffects());assert(fx.some(e=>e.star));assert(fx.some(e=>e.confetti));assert(fx.length<=90);
}
(async()=>{
  browser=await chromium.launch({executablePath:process.env.CHROMIUM||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});
  let p=await page();fixture=await snapshot(p);await check(p);await p.context().close();
  const record=(word,scene,time=NOW-1000,extra={})=>({word,scene,time,spoke:true,spoken_word:word,tier:2,...extra});
  const log=structuredClone(fixture);log.adventure.speaking=[
    ...['task','fish','pet','boat','scene'].map(scene=>record('tree',scene)),
    record('fish','fish',MONDAY),record('fish','boat'),record('wood','task',NOW-1000,{word:'tree'}),
    record('tree','task',MONDAY-1), record('tree','task',NOW+1),
    record('tree','task',NOW-1000,{spoke:false}),record('tree','task',NOW-1000,{spoken_word:null})
  ];
  p=await page(log);await openLog(p);
  assert.match(await p.locator('#speaking-week').innerText(),/11\/2 — 11\/4/);
  assert.deepEqual(await p.locator('#speaking-rows tr').allTextContents(),['Tree5任务（1）、钓鱼（1）、宠物（1）、乘船（1）、新场景（1）','Fish2钓鱼（1）、乘船（1）','Wood1任务（1）']);
  assert.equal(await p.locator('#parent-info').isVisible(),false);
  assert.equal(await p.locator('#parent-log-tab').getAttribute('aria-selected'),'true');
  await p.locator('#parent-log-tab').focus();await p.keyboard.press('ArrowLeft');assert(await p.locator('#parent-info').isVisible());
  await p.keyboard.press('End');assert(await p.locator('#parent-log').isVisible());
  await p.screenshot({path:'/tmp/bw-v2-parent-log.png'});
  const saved=await snapshot(p);assert.deepEqual(saved.adventure.speaking,log.adventure.speaking);
  await p.reload();await p.click('#btn-start'); if(await p.locator('#name-entry').isVisible())await p.click('#welcome-play');await openLog(p);assert.equal(await p.locator('#speaking-rows tr').count(),3);
  await p.click('#parent-close');assert(!/[\u3400-\u9fff]/u.test(await p.locator('body').innerText()));await check(p);await p.context().close();
  report('parent page: local Monday/DST boundary, all five scenes, exact counts, excludes taps/unmatched/old/future events, saves unchanged, keyboard tabs');
  const legacy=structuredClone(fixture);delete legacy.adventure.speaking;
  p=await page(legacy,{viewport:{width:390,height:844}});await openLog(p);assert(await p.locator('#speaking-empty').isVisible());assert(!(await p.locator('#speaking-table').isVisible()));
  const panel=await p.locator('#parent-help').boundingBox();assert(panel.x>=0&&panel.x+panel.width<=390);await p.click('#parent-close');await check(p);await p.context().close();
  report('legacy empty speaking log and portrait parent panel');
  // Real mocked speech goes through the game's existing match-and-save path, then the parent UI.
  const voice=structuredClone(fixture);voice.words=['tree','wood'];voice.progress.tree=0;voice.mods=[];voice.animals.forEach(a=>a[1]=7000);
  p=await page(voice);await p.evaluate(()=>BW.hideCard());const pos=await p.evaluate(()=>BW.worldToScreen(87.5*32,15.5*32));await p.mouse.click(pos.x,pos.y);await p.evaluate(()=>BW.hideCard());
  await p.waitForFunction(()=>BW.adventure().active&&!BW.adventure().active.pending);
  await p.click('#chat-mic');await p.evaluate(()=>voiceResult('three'));await openLog(p);
  assert.match(await p.locator('#speaking-rows').innerText(),/Tree\s+1\s+新场景/);await check(p);await p.context().close();
  report('mock recognition near-sound answer → saved event → parent speaking count');
  // Collect two complete sets through normal gravity/landing at travel checkpoints.
  const gifts=structuredClone(fixture);gifts.words=['tree','wood','stone','water'];gifts.animals.forEach(a=>a[1]=7000);
  p=await page(gifts);let first=await p.evaluate(()=>BW.adventure().spots);
  for(const spot of first){const ground=await p.evaluate(s=>BW.testGround(Math.floor(s.x/32),Math.round((s.y+15)/32)),spot);assert([1,2,3,6].includes(ground[0]));assert(![1,2,3,4,5,6,7,9,12,13,14,15,16].includes(ground[1]));}
  for(const {id} of first) await collect(p,id);
  let after=await snapshot(p);assert.equal(after.adventure.rounds,1);assert.deepEqual(after.adventure.found,{});assert.equal(Object.keys(after.adventure.lastRound).length,7);
  let second=await p.evaluate(()=>BW.adventure().spots);assert.equal(second.length,7);assert(second.every(s=>!first.some(old=>old.x===s.x)));
  await p.evaluate(()=>BW.hideCard());await p.click('#btn-words');assert.equal(await p.locator('#trail-album button').count(),7);assert.equal(await p.locator('#album-last button').count(),7);
  assert.equal(await p.locator('#album-completion').innerText(),'✓ 1 round complete!');assert.match(await p.locator('#album-round').innerText(),/Round 2/);assert.equal(await p.locator('#trail-album canvas').count(),0);
  await p.screenshot({path:'/tmp/bw-v2-album.png'});await p.click('#book-back');
  await p.reload();await p.click('#btn-start'); if(await p.locator('#name-entry').isVisible())await p.click('#welcome-play');assert.deepEqual(await p.evaluate(()=>BW.adventure().spots),second);assert.equal((await snapshot(p)).adventure.rounds,1);
  for(const {id} of second) await collect(p,id);
  after=await snapshot(p);assert.equal(after.adventure.rounds,2);assert.equal(Object.keys(after.adventure.lastRound).length,7);
  let third=await p.evaluate(()=>BW.adventure().spots);assert(third.every(s=>!second.some(old=>old.x===s.x)));
  await collect(p,'0');after=await snapshot(p);assert.equal(after.adventure.rounds,2);assert.equal(Object.keys(after.adventure.found).length,1);
  const notes=await p.evaluate(()=>audioNotes);assert(notes.some(n=>Math.round(n.freq)===523));assert(notes.every(n=>n.stop>=(n.time||0)));
  const progress=after.progress;await p.reload();await p.click('#btn-start'); if(await p.locator('#name-entry').isVisible())await p.click('#welcome-play');assert.deepEqual((await snapshot(p)).adventure.found,after.adventure.found);assert.deepEqual((await snapshot(p)).progress,progress);
  await check(p);await p.context().close();
  report('two full seven-gift rounds earned by landings, seven distinct dry hideouts, different next locations, preserved completed album/stamp, partial-round save restore, synthetic chime calls');
  // Old saves with all seven found migrate once, including boolean-only pre-picture discoveries.
  const full=structuredClone(fixture);full.adventure.found=Object.fromEntries(first.map((s,i)=>[s.id,i%2?'wood':true]));
  delete full.adventure.rounds;delete full.adventure.lastRound;
  p=await page(full);assert.equal((await snapshot(p)).adventure.rounds,1);await p.reload();await p.click('#btn-start'); if(await p.locator('#name-entry').isVisible())await p.click('#welcome-play');assert.equal((await snapshot(p)).adventure.rounds,1);await check(p);await p.context().close();
  const partial=structuredClone(fixture);partial.adventure.found={'0':'wood','4':true};
  p=await page(partial);assert.deepEqual((await snapshot(p)).adventure.found,partial.adventure.found);assert.equal((await snapshot(p)).adventure.rounds,0);await p.context().close();
  const malformed=structuredClone(fixture);malformed.adventure.rounds=99;malformed.adventure.lastRound={'0':'wood'};
  p=await page(malformed);assert.equal((await snapshot(p)).adventure.rounds,0);await check(p);await p.context().close();
  report('legacy complete/partial albums migrate without losing discoveries or duplicating a completion; malformed optional stamps ignored');
  // Visual atlas exercises all existing words and idle frames. Inspect /tmp/bw-v2-art.png for style.
  p=await page();const words=await p.evaluate(()=>BW.testWords());assert.equal(words.length,49);
  const art=await p.evaluate(async()=>{
    const words=BW.testWords(), atlas=document.createElement('canvas');atlas.width=7*144;atlas.height=Math.ceil(words.length/7)*164;const g=atlas.getContext('2d');g.fillStyle='#fff8ee';g.fillRect(0,0,atlas.width,atlas.height);
    const counts=[];
    for(let i=0;i<words.length;i++){const img=new Image();img.src=BW.testIcon(words[i],1);await img.decode();g.drawImage(img,(i%7)*144,Math.floor(i/7)*164,128,128);g.fillStyle='#51493c';g.font='16px sans-serif';g.fillText(words[i],(i%7)*144+12,Math.floor(i/7)*164+148);
      const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d');ctx.drawImage(img,0,0);const px=ctx.getImageData(0,0,128,128).data;let ink=0,filled=0;for(let n=0;n<px.length;n+=4){if(px[n+3]>100){filled++;if(px[n]<110&&px[n+1]<110&&px[n+2]<110)ink++;}}counts.push({word:words[i],filled,ink});}
    return {url:atlas.toDataURL(),counts};
  });
  art.counts.forEach(c=>{assert(c.filled>100,c.word);assert(c.ink>20,c.word);});fs.writeFileSync('/tmp/bw-v2-art.png',Buffer.from(art.url.split(',')[1],'base64'));
  for(const key of ['dog','cat','cow','horse','chicken','duck','fish'])assert.notEqual(await p.evaluate(k=>BW.testIcon(k,1),key),await p.evaluate(k=>BW.testIcon(k,3),key),key);
  for(const key of ['pig','sheep','rabbit'])assert.notEqual(await p.evaluate(k=>BW.testIcon(k,1),key),await p.evaluate(k=>BW.testIcon(k,24.5),key),key);
  await check(p);assert.deepEqual(p.external,[]);await p.context().close();
  report('49 nonempty outlined word pictures, visible tail/wing/blink idle frame changes, no external requests');
  // New feedback is emitted through a real quiz success; inspect particle lifetime/bounds and audio schedules.
  const quizData={...gifts,words:['wood'],px:87*32-16,py:511.9};
  p=await page(quizData);await p.evaluate(()=>BW.hideCard());await p.click('#btn-words');await p.click('#btn-quiz');
  await p.waitForFunction(()=>BW.stars().includes('wood'));
  let effects=await p.evaluate(()=>BW.testEffects());assert(effects.some(e=>e.star));assert(effects.some(e=>e.confetti));assert(effects.length<=90);
  assert((await p.evaluate(()=>audioNotes)).some(n=>Math.round(n.freq)===784));await p.waitForTimeout(1600);assert(!(await p.evaluate(()=>BW.testEffects())).some(e=>e.star||e.confetti));await check(p);await p.context().close();
  p=await page(quizData,{reduced:true,audioOff:true});assert.equal(await p.evaluate(()=>BW.testIcon('dog',1)),await p.evaluate(()=>BW.testIcon('dog',3)));
  await p.evaluate(()=>BW.hideCard());await p.click('#btn-words');await p.click('#btn-quiz');await p.waitForFunction(()=>BW.stars().includes('wood'));
  effects=await p.evaluate(()=>BW.testEffects());assert(effects.filter(e=>e.star||e.confetti).length<=5);assert(effects.filter(e=>e.star||e.confetti).every(e=>e.still));await check(p);await p.context().close();
  report('quiz success emits bounded, expiring stars/confetti and WebAudio notes; reduced-motion/no-AudioContext fallback still succeeds');
  const many=structuredClone(fixture);many.adventure.speaking=words.map(word=>record(word,'task'));
  p=await page(many,{viewport:{width:844,height:390},touch:true});await openLog(p);assert.equal(await p.locator('#speaking-rows tr').count(),49);
  const box=await p.locator('#parent-help').boundingBox(), client=await p.context().newCDPSession(p);
  const x=box.x+box.width/2, y=box.y+box.height-45;
  await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
  for(let n=1;n<=8;n++){await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-n*24}]});await p.waitForTimeout(20);}
  await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await p.waitForFunction(()=>document.getElementById('parent-help').scrollTop>30);await p.click('#parent-close');assert(!(await p.locator('#parent-help').isVisible()));await check(p);await p.context().close();
  report('49-row speaking log scrolls via Chromium touch emulation in short landscape; return button remains reachable (not a device test)');
  const offline=await browser.newContext({offline:true,viewport:{width:844,height:390}}), f=await offline.newPage();
  const offData=structuredClone(full);offData.adventure.speaking=[{time:Date.now(),word:'tree',spoken_word:'tree',scene:'task',spoke:true,tier:2}];
  await f.addInitScript(data=>{localStorage.setItem('block-world-save-v1',JSON.stringify(data));Object.defineProperty(window,'speechSynthesis',{value:undefined});window.SpeechRecognition=undefined;window.webkitSpeechRecognition=undefined;},offData);
  await f.goto('file://'+path.resolve(__dirname,'../index.html'));await f.click('#btn-start'); if(await f.locator('#name-entry').isVisible())await f.click('#welcome-play');await f.evaluate(()=>BW.hideCard());await openLog(f);
  assert.match(await f.locator('#speaking-rows').innerText(),/Tree\s+1\s+任务/);await f.click('#parent-close');await f.click('#btn-words');assert.equal(await f.locator('#album-completion').innerText(),'✓ 1 round complete!');assert.equal(await f.locator('#album-last button').count(),7);await offline.close();
  report('actual file:// offline: saved speaking log, legacy gift-round migration, completed album, no speech service');

})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{await browser?.close();});
