'use strict';
// Original HTML, real mouse for every game action. evaluate probes are read-only.
// Declared initial saves model collected materials / terrain / learned vocabulary.
// SpeechRecognition and speechSynthesis are browser-boundary fixtures only, installed
// before load. They report failures/success automatically after real Speak clicks.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),source=fs.readFileSync(process.env.BW_SOURCE||path.join(root,'index.html'));
const out=path.resolve(process.env.BW_EVIDENCE_ROOT||'screens/build-v1.1-qa-feel/targeted');fs.mkdirSync(out,{recursive:true});
const results=[],clicks=[],frames=[];
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROME||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-background-timer-throttling','--disable-renderer-backgrounding']});
try{for(const mobile of (process.env.BW_MOBILE==='0'?[false]:process.env.BW_MOBILE==='1'?[true]:[false,true]))for(const test of (process.env.BW_CASE||'house,speak,recognized,explore,quota,physical,proportion').split(',')){
 const tag=test+'-'+(mobile?'mobile':'desktop'),errors=[],start=Date.now();
 const fixture={v:1,seed:42,px:79.5*32,py:511.99,inv:{planks:12,stone:3,flower:2,sand:2},words:['planks','stone','flower','sand','dog','cat','cow','sheep','pig'],mods:[],build_level:test==='speak'||test==='recognized'?3:1};
 if(test==='house')fixture.mods=[16*240+78,0,16*240+79,0,15*240+77,8]; // flower + two unsupported columns
 if(['explore','quota','physical','proportion'].includes(test))fixture.animals=[['dog',78*32,511.99,1,0,0],['cat',76*32,511.99,1,0,0],['cow',81*32,511.99,1,0,0],['sheep',74*32,511.99,1,0,0],['pig',82*32,511.99,1,0,0]];
 if(test==='explore')fixture.adventure={levels:{dog:{t1:2,t2:2,t3:0}}};
 if(test==='physical'){fixture.words=['dog'];fixture.inv={};fixture.animals=[['dog',75*32,511.99,1,0,0]];}
 const viewport=mobile?{width:844,height:390}:{width:1366,height:768};
 const c=await browser.newContext({viewport,isMobile:mobile,hasTouch:mobile,timezoneId:'UTC',storageState:{cookies:[],origins:[{origin:'http://qa.test',localStorage:[{name:'block-world-save-v1',value:JSON.stringify(fixture)}]}]}});
 await c.route('http://qa.test/**',r=>{const pathname=new URL(r.request().url()).pathname;if(/^\/audio\/build-v1\.1\/[a-z-]+\.ogg$/.test(pathname))return r.fulfill({contentType:'audio/ogg',body:fs.readFileSync(path.join(root,pathname))});return r.fulfill({contentType:'text/html; charset=utf-8',body:source});});
 await c.route('https://brain.yydriver.cn/**',r=>r.fulfill({contentType:'application/json',body:'{}'}));
 await c.addInitScript(({test})=>{
  window.qaSpeech=[];Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{getVoices:()=>[],speaking:false,cancel(){},speak(u){window.qaSpeech.push(u.text);setTimeout(()=>u.onend?.(),25);}}});
  const responses=test==='recognized'?['house']:test==='speak'?['error','unmatched','house']:['error','unmatched'];let n=0;
  window.SpeechRecognition=class {start(){this.onstart?.();setTimeout(()=>{const word=responses[n++]||'error';if(word==='error')this.onerror?.({error:'no-speech'});else this.onresult?.({resultIndex:0,results:[[{transcript:word}]]});this.onend?.();},70);}abort(){}};
 },{test});
 const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));p.setDefaultTimeout(12000);
 const wait=ms=>p.waitForTimeout(ms),state=()=>p.evaluate(()=>BW.buildState()),inv=()=>p.evaluate(()=>BW.inv()),saved=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('block-world-save-v1')));
 async function click(x,y,purpose){clicks.push({case:tag,ms:Date.now()-start,x,y,purpose});await p.mouse.click(x,y);await wait(110);}
 async function button(sel,purpose){const l=typeof sel==='string'?p.locator(sel):sel;await l.waitFor({state:'visible'});let b=await l.boundingBox();if(b.y<0||b.y+b.height>viewport.height){await l.scrollIntoViewIfNeeded();b=await l.boundingBox();}assert(b);await click(b.x+b.width/2,b.y+b.height/2,purpose||sel);}
 async function world(x,y,purpose){const pos=await p.evaluate(([x,y])=>BW.worldToScreen(x*32,y*32),[x+.5,y+.5]);await click(pos.x,pos.y,purpose);}
 async function text(sel,re,timeout=12000){const end=Date.now()+timeout;while(Date.now()<end){if(await p.locator(sel).isVisible()&&re.test(await p.locator(sel).innerText()))return;await wait(100);}throw Error(sel+' expected '+re+' got '+await p.locator(sel).innerText());}
 async function snap(label){const file=tag+'-'+label+'.png';await p.screenshot({path:path.join(out,file),style:'#build-debug{visibility:hidden!important}'});frames.push({case:tag,file,label,state:await state(),adventure:await p.evaluate(()=>BW.adventure()),speech:await p.evaluate(()=>window.qaSpeech)});}
 async function dismiss(){if(await p.locator('#wordcard').isVisible())await button('#wordcard');if(await p.locator('#buddy-close').isVisible())await button('#buddy-close');}
 async function enter(){await button('#btn-start');await button('#welcome-play');await wait(300);}
 async function craft(name,n=1){const recipe=p.locator('.recipe').filter({has:p.locator('.out b',{hasText:new RegExp('^'+name+'(?: ×[0-9]+)?$')})});for(let i=0;i<n;i++){await button(recipe.locator('.craftbtn'),'Craft '+name);await dismiss();}}
 async function makeHouse(){await button('#btn-craft');await craft('House');await button('#craft-back');await button('#btn-build');await button('[data-build="houseKit"]');}
 async function show(){await button('#build-show');await button(p.getByRole('button',{name:'Show my building'}));}
 async function pet(type){
  // Animals wander between questions. Bring a covered/offscreen animal into view
  // with the joystick before tapping, rather than accidentally pressing Jump.
  for(let i=0;i<15;i++){
   const point=await p.evaluate(t=>BW.screenAnimal(t),type);assert(point);
   const clear=await p.evaluate(({x,y})=>document.elementFromPoint(x,y)?.id==='view',point);
   if(clear&&point.x>24&&point.x<viewport.width-24&&point.y>24&&point.y<viewport.height-24){await click(point.x,point.y,'Tap '+type);await text('#card-en',new RegExp('^'+type+'$','i'));return;}
   const dir=await p.evaluate(t=>Math.sign(BW.animals().find(a=>a.type===t).x-BW.player().x)||1,type),b=await p.locator('#joy').boundingBox();
   clicks.push({case:tag,ms:Date.now()-start,purpose:'Joystick to uncover '+type,dir});await p.mouse.move(b.x+b.width/2,b.y+b.height/2);await p.mouse.down();await p.mouse.move(b.x+b.width*(dir<0?.15:.85),b.y+b.height/2);await wait(400);await p.mouse.up();await wait(250);
   if(await p.locator('#wordcard').isVisible()&&(await p.locator('#card-en').innerText()).toLowerCase()===type)return;
  }
  throw Error('Animal remains covered: '+type);
 }
 async function plain(selector){assert.equal(await p.locator(selector+' canvas, '+selector+' img, '+selector+' svg').count(),0);const words=await p.locator(selector).allInnerTexts();assert(words.every(w=>/^[a-z ]+$/i.test(w)),words.join(','));}
 try{
 await p.goto('http://qa.test/?buildlog=1#seed=42');await enter();assert.equal(await p.locator('#build-version').innerText(),process.env.BW_BASELINE?'build a0b0871+v11':'build a0b0871+v11qa');
 if(test==='house'){
  await makeHouse();await world(77,16,'Click ground through flowers, with only one supporting column');assert.equal((await state()).objects.length,1);assert.equal((await state()).objects[0].y,13);assert.equal((await inv()).houseKit||0,0);await snap('relaxed-ground-snap');await dismiss();await show();await plain('#buddy-options button');await snap('text-only-house');await button('#buddy-options [data-word="fence"]','Wrong choice');assert.equal(await p.locator('#buddy-confirm').isVisible(),false);await button('#buddy-options [data-word="house"]');await text('#buddy-close',/^Continue$/);assert.equal(await p.locator('#buddy-mic').isVisible(),false);await snap('reward-continue');assert.equal((await p.evaluate(()=>qaSpeech)).filter(w=>w==='House').length,2); // craft name + one reward word
  await button('#buddy-close');assert.equal(await p.locator('#buddy-chat').isVisible(),false);
 }else if(test==='speak'||test==='recognized'){
  await makeHouse();await world(77,16,'Place on clear spawn pad');await dismiss();await show();assert.equal(await p.locator('#buddy-close').isVisible(),false);assert.equal(await p.locator('#buddy-confirm').isVisible(),false);const mic=await p.locator('#buddy-mic').boundingBox(),box=await p.locator('#buddy-chat').boundingBox();assert(mic.y+mic.height<=box.y+box.height,'Speak fully inside card');await snap('speak-default');
  const before=await p.evaluate(()=>BW.stars());await button('#buddy-mic');
  if(test==='speak'){
   assert.equal(await p.locator('#buddy-confirm').isVisible(),false);await button('#buddy-mic');assert(await p.locator('#buddy-confirm').isVisible());await snap('two-failures');await button('#buddy-confirm');assert.deepEqual(await p.evaluate(()=>BW.stars()),before);assert.equal((await p.evaluate(()=>BW.adventure().trail.speaking)).filter(r=>r.self_claim).length,1);await dismiss();await button('#btn-build');await button('#btn-words');await button('[aria-label="Practice House"]','Voluntary atlas practice');await button('#buddy-mic');await text('#buddy-close',/^Continue$/);await dismiss();
  }else{await text('#buddy-close',/^Continue$/);assert((await p.evaluate(()=>BW.stars())).includes('house'));await snap('recognized-reward');await dismiss();}
  await button('#btn-zh');await button('#parent-log-tab');const row=p.locator('#speaking-rows tr').filter({hasText:'House'});assert.equal(await row.locator('td').nth(1).innerText(),'1');assert.equal(await row.locator('td').nth(2).innerText(),test==='speak'?'1':'0');await snap('parent-real-vs-claim');await button('#parent-close');await wait(2700);await p.reload();await enter();await button('#btn-zh');await button('#parent-log-tab');assert.equal(await p.locator('#speaking-rows tr').filter({hasText:'House'}).locator('td').nth(2).innerText(),test==='speak'?'1':'0');await button('#parent-close');
 }else if(test==='explore'){
  await pet('dog');await text('#buddy-line',/^Look! A dog!$/);await snap('animal-name-hearts-bubble');const pos=(await p.evaluate(()=>BW.animals())).find(a=>a.type==='dog');await wait(700);assert.equal((await p.evaluate(()=>BW.animals())).find(a=>a.type==='dog').x,pos.x);assert((await p.evaluate(()=>BW.adventure())).trail.discoveries.dog);await p.locator('#dialogue').waitFor({state:'visible'});assert.equal(await p.locator('#chat-close').isVisible(),false);assert.equal(await p.locator('#chat-confirm').isVisible(),false);await button('#chat-mic');assert.equal(await p.locator('#chat-confirm').isVisible(),false);await button('#chat-mic');assert(await p.locator('#chat-confirm').isVisible());await plain('#chat-options button');await snap('explore-fallback');const stars=await p.evaluate(()=>BW.stars());await button('#chat-confirm');assert.deepEqual(await p.evaluate(()=>BW.stars()),stars);assert.equal(await p.locator('#chat-mic').isVisible(),false);assert.equal(await p.locator('#chat-listen').isVisible(),false);assert(!/★/.test(await p.locator('#chat-status').innerText()));await button('#chat-continue');assert.equal(await p.locator('#dialogue').isVisible(),false);
 }else if(test==='quota'){
  for(const type of ['dog','cat','cow','sheep','pig']){
   await pet(type);await p.locator('#dialogue').waitFor({state:'visible',timeout:22000});const active=await p.evaluate(()=>BW.adventure().active);assert.equal(active.key,type);assert.equal(await p.locator('#chat-picture').getAttribute('aria-label'),type[0].toUpperCase()+type.slice(1));await plain('#chat-options button');if(type==='dog')await snap('explore-text-only');const reads=(await p.evaluate(()=>qaSpeech)).length;await button('#chat-options [data-word="'+type+'"]');await p.locator('#chat-continue').waitFor({state:'visible'});assert.equal(await p.locator('#chat-mic').isVisible(),false);assert.equal(await p.locator('#chat-listen').isVisible(),false);const spoken=(await p.evaluate(()=>qaSpeech)).slice(reads);assert.equal(spoken.filter(w=>w.toLowerCase()===type).length,2,'Choice audio plus exactly one reward read');if(type==='dog')await snap('explore-reward-continue');await button('#chat-continue');
  }
  assert.equal((await state()).exploreQuizzes,5);assert.equal((await state()).shows,0);await button('#btn-craft');await craft('Wheel',2);await craft('Car');await button('#craft-back');await button('#btn-build');await button('[data-build="car"]');const x=Math.floor((await p.evaluate(()=>BW.player())).x/32)-2;await world(x,16,'Place Car after five explore quizzes');assert.equal((await state()).objects.length,1);await dismiss();await show();await plain('#buddy-options button');await button('#buddy-options [data-word="car"]');assert.equal((await state()).shows,1);await snap('car-show-after-five-explore');await dismiss();
 }else if(test==='physical'){
  await button('#btn-words');await button('#btn-quiz');assert.equal(await p.evaluate(()=>BW.quiz()),'dog');assert.equal(await p.locator('#dialogue').isVisible(),false);await snap('find-dog-world-answer');await pet('dog');await p.waitForFunction(()=>BW.stars().includes('dog'));assert.equal(await p.evaluate(()=>BW.quiz()),'');await snap('physical-answer-complete');
 }else if(test==='proportion'){
  await snap('world-scale');await button('#btn-words');for(const name of ['Dog','Cat','Cow'])assert(await p.locator('[aria-label="'+(process.env.BW_BASELINE?'Speak ':'Listen to ')+name+'"]').isVisible());await snap('atlas-binding');await button('#book-back');
 }
 assert(!/\p{Script=Han}/u.test(await p.locator('body').innerText()));assert.deepEqual(errors,[]);assert.equal(await p.evaluate(()=>BW.error()),'');results.push({case:tag,status:'PASS',seconds:Math.round((Date.now()-start)/100)/10});
 }catch(e){await snap('FAIL');results.push({case:tag,status:'FAIL',error:String(e.stack),errors});}
 finally{await c.close();console.log(JSON.stringify(results.at(-1)));fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({sha256:crypto.createHash('sha256').update(source).digest('hex'),results,frames},null,2));fs.writeFileSync(path.join(out,'clicks.json'),JSON.stringify(clicks,null,2));}
 }
}finally{await browser.close();}if(results.some(r=>r.status==='FAIL'))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
