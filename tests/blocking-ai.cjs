'use strict';
// Real input paths, synthetic recognition and HTTP replies; never real child audio.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {normalize,template,contextLeads}=require('../brain/server.cjs');
const URL=process.env.BW_URL||'http://127.0.0.1:19273';
const source=fs.readFileSync(require('node:path').resolve(__dirname,'../index.html'),'utf8');
let browser,fixture;
const report=s=>console.log('PASS',s);
async function snapshot(p){return p.evaluate(()=>{BW.saveNow();return JSON.parse(localStorage.getItem('block-world-save-v1'));});}
async function page({tier=1,voice='ok',endpoint='',reply,delay=0,timeout=6500,shortRecognition=false,viewport={width:1180,height:720}}={}){
  const ctx=await browser.newContext({viewport,hasTouch:true}),p=await ctx.newPage();p.errors=[];p.calls=[];
  p.on('pageerror',e=>p.errors.push(String(e)));
  const html=source.replace(/^const BRAIN_URL = '[^']*';$/m,'const BRAIN_URL = '+JSON.stringify(endpoint)+';')
    .replace('const BRAIN_TIMEOUT_MS = 6500;','const BRAIN_TIMEOUT_MS = '+timeout+';')
    .replace('}, 8000);','}, '+(shortRecognition?100:8000)+');');
  await p.route(URL+'/',r=>r.fulfill({contentType:'text/html',body:html}));
  if(endpoint)await p.route('**/mock-buddy',async r=>{
    const q=r.request().postDataJSON();p.calls.push(q);await new Promise(resolve=>setTimeout(resolve,delay));
    await r.fulfill({contentType:'application/json',headers:{'X-Buddy-Source':'brain','X-Buddy-Reason':'validated'},body:JSON.stringify(reply?reply(q):template(normalize(q)))}).catch(()=>{});
  });
  const data=fixture?structuredClone(fixture):null;
  if(data&&viewport.width<500)data.px=87*32-45;
  if(data)data.adventure.levels.tree={t1:tier>=2?2:0,t2:tier>=3?2:0,t3:0};
  await p.addInitScript(({data,voice})=>{
    if(data&&!sessionStorage.getItem('fixture')) {localStorage.setItem('block-world-save-v1',JSON.stringify(data));sessionStorage.setItem('fixture','1');}
    window.spoken=[];
    Object.defineProperty(window,'speechSynthesis',{value:{getVoices:()=>[],cancel(){},speak(u){spoken.push(u.text);},speaking:false}});
    if(voice==='missing'){window.SpeechRecognition=undefined;window.webkitSpeechRecognition=undefined;}
    else window.SpeechRecognition=class {start(){if(voice==='throw')throw Error('unavailable');window.recognizer=this;}abort(){this.onend?.();}};
  },{data,voice});
  await p.goto(URL+'/#seed=42');if(await p.locator('#btn-portrait').isVisible())await p.click('#btn-portrait');await p.click('#btn-start');await p.waitForTimeout(200);return p;
}
async function trigger(p,wait=true){
  await p.evaluate(()=>BW.hideCard());const pos=await p.evaluate(()=>BW.worldToScreen(87.5*32,15.5*32));await p.mouse.click(pos.x,pos.y);await p.evaluate(()=>BW.hideCard());
  try { await p.waitForFunction(()=>BW.adventure().active,null,{timeout:10000}); } catch(e) {console.error(await p.evaluate(()=>({adventure:BW.adventure(),player:BW.player(),quest:BW.quest(),card:BW.card(),error:BW.error()})));throw e;}
  if(wait)await p.waitForFunction(()=>!BW.adventure().active.pending,null,{timeout:10000});
}
async function done(p){assert.deepEqual(p.errors,[]);assert.equal(await p.evaluate(()=>BW.error()),'');await p.context().close();}
(async()=>{
  browser=await chromium.launch({executablePath:process.env.CHROMIUM||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});
  let p=await page();fixture=await snapshot(p);await done(p);
  fixture.words=['tree','wood'];fixture.progress.tree=0;fixture.mods=[];fixture.animals.forEach(a=>a[1]=7000);
  fixture.adventure={found:{},reviews:{},turns:0,scenes:{},levels:{},speaking:[]};
  p=await page({tier:3,voice:'missing'});await trigger(p);
  await p.setViewportSize({width:390,height:844});await p.waitForTimeout(400);
  await p.locator('#btn-portrait').tap();
  assert(!(await p.locator('#rotate').isVisible()),'portrait opt-in must work during unanswered dialogue');
  assert(await p.locator('#dialogue').isVisible());assert(!(await p.evaluate(()=>BW.adventure().active)).answered);
  await p.click('#chat-mic');await p.click('#chat-confirm');await done(p);
  report('rotating during a question permits portrait play without dismissing or answering it');
  p=await page({tier:3,voice:'missing',viewport:{width:740,height:240}});await trigger(p);await p.click('#chat-mic');
  const scroll=await p.locator('#dialogue').evaluate(el=>({height:el.clientHeight,total:el.scrollHeight}));
  assert(scroll.total>scroll.height,'short-screen fixture must overflow');
  const shortPlayer=await p.evaluate(()=>BW.player()),dialogBox=await p.locator('#dialogue').boundingBox();
  const clippedConfirm=await p.locator('#chat-confirm').boundingBox();
  assert(clippedConfirm.y+clippedConfirm.height>dialogBox.y+dialogBox.height,'recovery button must start clipped');
  const swipe=await p.context().newCDPSession(p),sx=dialogBox.x+dialogBox.width/2,sy=dialogBox.y+dialogBox.height-25;
  await swipe.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:sx,y:sy}]});
  for(let step=1;step<=8;step++)await swipe.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:sx,y:sy-step*12}]});
  await swipe.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await p.waitForTimeout(300);
  assert(await p.locator('#dialogue').evaluate(el=>el.scrollTop>0),'child must be able to scroll to recovery controls');
  assert.deepEqual(await p.evaluate(()=>BW.player()),shortPlayer);assert(!(await p.evaluate(()=>BW.adventure().active)).answered);
  const confirmBox=await p.locator('#chat-confirm').boundingBox();
  await p.touchscreen.tap(confirmBox.x+confirmBox.width/2,confirmBox.y+confirmBox.height/2);
  assert((await p.evaluate(()=>BW.adventure().active)).answered);await done(p);
  report('short landscape dialogue scrolls by touch to I said it while world input stays blocked');
  const blocked=await page();await trigger(blocked);const started=Date.now(),player=await blocked.evaluate(()=>BW.player()),save=await snapshot(blocked);
  await blocked.screenshot({path:'screens/blocking-dialogue.png'});
  assert(!(await blocked.locator('#chat-close').isVisible()));
  for(const key of ['Escape','ArrowRight','Space','KeyE','KeyB','KeyX','KeyC','Digit1'])await blocked.keyboard.press(key);
  for(const id of ['btn-craft','btn-words','btn-break','btn-place','btn-jump','btn-home'])await blocked.locator('#'+id).dispatchEvent('pointerdown',{button:0});
  await blocked.locator('#chat-close').dispatchEvent('click',{detail:0});
  await blocked.mouse.click(25,300);
  await blocked.mouse.move(500,400);await blocked.mouse.down();await blocked.mouse.move(900,650,{steps:8});await blocked.mouse.up();
  const touch=await blocked.context().newCDPSession(blocked);
  await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:40,y:440}]});
  await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:180,y:550}]});
  await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await blocked.waitForTimeout(500);
  assert.deepEqual(await blocked.evaluate(()=>BW.player()),player);
  assert(await blocked.locator('#dialogue').isVisible());assert(!(await blocked.locator('#craft').isVisible()));assert(!(await blocked.locator('#book').isVisible()));assert.equal(await blocked.evaluate(()=>BW.quiz()),'');
  assert.deepEqual((await snapshot(blocked)).progress,save.progress);assert.deepEqual((await snapshot(blocked)).inv,save.inv);
  report('background taps, swipe, hidden ×, Escape, move/jump/mine/place/craft/book controls cannot dismiss or play');
  p=await page();await trigger(p);await p.click('#btn-zh');assert(await p.locator('#dialogue').isVisible());assert(await p.locator('#parent-skip').isVisible());
  await p.screenshot({path:'screens/parent-skip.png'});await p.click('#parent-close');assert(await p.locator('#dialogue').isVisible());
  await p.locator('#btn-zh').focus();await p.keyboard.press('Enter');await p.locator('#parent-skip').focus();await p.keyboard.press('Enter');
  assert(!(await p.locator('#dialogue').isVisible()));assert.equal((await snapshot(p)).adventure.turns,0);
  const x=await p.evaluate(()=>BW.player().x);await p.keyboard.down('ArrowLeft');await p.waitForTimeout(300);await p.keyboard.up('ArrowLeft');assert((await p.evaluate(()=>BW.player().x))<x);await done(p);
  report('opening/closing parent settings preserves question; explicit parent skip works by keyboard without reward and restores play');
  p=await page({tier:3});await trigger(p);await p.click('#chat-choices');
  for(let n=0;n<3;n++)await p.locator('[data-word=wood]').click();
  let d=await p.evaluate(()=>BW.adventure().active);assert.equal(d.misses,3);assert(d.reveal&&!d.answered);assert(await p.locator('[data-word=wood]').isDisabled());assert(await p.locator('#chat-confirm').isVisible());
  await p.screenshot({path:'screens/blocking-reveal.png'});await p.locator('[data-word=tree]').click();assert((await p.evaluate(()=>BW.adventure().active)).answered);
  const revealed=await snapshot(p);assert.equal(revealed.adventure.levels.tree.t3,0);await p.waitForFunction(()=>!BW.adventure().active);await done(p);
  report('three misses reveal the answer and still require repeat/confirmation; praise then closes without false spoken credit');
  for(const failure of ['missing','throw','denied','empty','hanging']){
    p=await page({tier:2,voice:failure,shortRecognition:true});await trigger(p);await p.click('#chat-mic');
    if(failure==='denied')await p.evaluate(()=>recognizer.onerror({error:'not-allowed'}));
    if(failure==='empty')await p.evaluate(()=>recognizer.onend());
    await p.waitForFunction(()=>!document.getElementById('chat-confirm').hidden);
    assert(await p.locator('#chat-options').isVisible());assert(!(await p.evaluate(()=>BW.adventure().active)).answered);
    await p.click('#chat-confirm');const data=await snapshot(p);assert.equal(data.adventure.levels.tree.t2,0);assert.equal(data.adventure.speaking.at(-1).spoke,false);assert((await p.evaluate(()=>BW.adventure().active)).answered);await done(p);
  }
  report('missing/throwing/denied/empty/hanging recognition all offer taps + I said it, without recognition credit');
  p=await page({endpoint:URL+'/mock-buddy',delay:1000});await trigger(p,false);assert((await p.evaluate(()=>BW.adventure().active)).pending);assert(!(await p.evaluate(()=>spoken)).includes('Tree or wood?'));
  await p.keyboard.press('ArrowRight');assert(await p.locator('#dialogue').isVisible());await p.click('#btn-zh');await p.click('#parent-skip');await p.waitForTimeout(1200);assert.equal(await p.evaluate(()=>BW.adventure().active),null);await done(p);
  p=await page({endpoint:URL+'/mock-buddy',delay:300,timeout:80});await trigger(p);assert.equal((await p.evaluate(()=>BW.adventure().brain)).reasons.timeout,1);await p.locator('[data-word=tree]').click();await p.waitForFunction(()=>!BW.adventure().active?.pending);assert((await p.evaluate(()=>BW.adventure().active)).answered);await done(p);
  report('pending prompts already block; parent skip cancels late replies; timeout restores usable local answer buttons');
  p=await page({endpoint:URL+'/mock-buddy',reply:q=>{
    const v=template(normalize(q)),lead=q.feedback==='success'?'You said tree!':'Alex, you found wood!';return {...v,say:(v.done?'Nice! ':'')+lead+' '+v.say.replace(/^Great! /,'')};
  }});
  await p.click('#btn-zh');await p.fill('#parent-name','Alex');await p.click('#parent-close');await trigger(p);
  assert.match(await p.locator('#chat-question').innerText(),/Alex, you found wood!/);assert.equal(p.calls[0].child_name,'Alex');assert(p.calls[0].recent_events.some(e=>e.action==='found'&&e.word==='wood'));
  await p.screenshot({path:'screens/ai-context-line.png'});
  await p.click('#chat-mic');await p.evaluate(()=>recognizer.onresult({resultIndex:0,results:[[{transcript:'I see a tree'}]]}));await p.waitForFunction(()=>!BW.adventure().active.pending);
  assert.match(await p.locator('#chat-question').innerText(),/You said tree!/);assert.equal(p.calls[1].child_said,'I see a tree');assert.equal(p.calls[1].spoken_word,'tree');assert.equal(p.calls[1].recent_lines.length,1);
  const persisted=await snapshot(p);assert.equal(persisted.child_name,'Alex');assert(!JSON.stringify(persisted).includes('I see a tree'));assert.equal((await p.evaluate(()=>BW.adventure().brain)).brain,2);
  await p.reload();await p.click('#btn-start');await p.click('#btn-zh');assert.equal(await p.inputValue('#parent-name'),'Alex');await done(p);
  report('name + real mined block + recognized answer reach brain, validated contextual bubble/TTS and accurate provenance; raw transcript stays out of saves');
  // Exhaust the per-minute budget using repeated encounters in the same session.
  // Test-only opening hook is injected below; production exposes no mutation hook.
  const budgetHTML=source.replace("ready: true,","ready: true, testOpen: () => openChat({anchor:'task',key:'tree'}),");
  p=await page({endpoint:URL+'/mock-buddy'});
  await p.route(URL+'/',r=>r.fulfill({contentType:'text/html',body:budgetHTML.replace(/^const BRAIN_URL = '[^']*';$/m,'const BRAIN_URL = '+JSON.stringify(URL+'/mock-buddy')+';')}));
  await p.reload();await p.click('#btn-start');
  for(let i=0;i<5;i++){
    await p.evaluate(()=>BW.testOpen());await p.waitForFunction(()=>!BW.adventure().active.pending);
    if(i===0){await p.locator('[data-word=tree]').click();await p.waitForFunction(()=>!BW.adventure().active);}
    else {assert.equal(p.calls.at(-1).last_answer,'tree');assert(p.calls.at(-1).recent_lines.length>=2);await p.click('#btn-zh');await p.click('#parent-skip');}
  }
  // Five openings plus one success = six; two more reach the window cap.
  for(let i=0;i<2;i++){
    await p.evaluate(()=>BW.testOpen());await p.waitForFunction(()=>!BW.adventure().active.pending);
    await p.click('#btn-zh');await p.click('#parent-skip');
  }
  await p.evaluate(()=>BW.testOpen());await p.waitForFunction(()=>!BW.adventure().active.pending);
  assert.equal(p.calls.length,8);assert.equal((await p.evaluate(()=>BW.adventure().brain)).limited,1);assert(await p.locator('#chat-options').isVisible());
  await p.reload();await p.click('#btn-start');await p.evaluate(()=>BW.testOpen());assert.equal(p.calls.length,8);assert.equal((await p.evaluate(()=>BW.adventure().brain)).limited,1);
  await p.addInitScript(()=>sessionStorage.setItem('block-world-brain-session-v1',JSON.stringify({calls:60,at:0,window:0})));
  await p.reload();await p.click('#btn-start');await p.evaluate(()=>BW.testOpen());assert.equal(p.calls.length,8);assert.equal((await p.evaluate(()=>BW.adventure().brain)).limited,1);await done(p);
  report('last answer and recent lines reach the next prompt; minute/session budgets survive reload; ninth request in one minute uses an immediately answerable template; no additional provider request');
  await blocked.waitForTimeout(Math.max(0,26000-(Date.now()-started)));
  assert(await blocked.locator('#dialogue').isVisible());assert(!(await blocked.evaluate(()=>BW.adventure().active)).answered);assert.deepEqual(await blocked.evaluate(()=>BW.player()),player);
  await blocked.locator('[data-word=tree]').click();await blocked.waitForFunction(()=>!BW.adventure().active);await done(blocked);
  report('unanswered question remains blocking beyond the former 24-second timer; correct answer releases it');
  // Compact phone layout is usable and child text stays English.
  p=await page({viewport:{width:390,height:844},voice:'missing',tier:3});await trigger(p);await p.click('#chat-mic');const box=await p.locator('#dialogue').boundingBox();assert(box.x>=0&&box.x+box.width<=390&&box.y+box.height<=844);
  assert(!/[\u3400-\u9fff]/u.test(await p.locator('body').innerText()));await p.screenshot({path:'screens/blocking-phone.png'});await p.click('#chat-confirm');await done(p);report('phone blocking speech fallback fits viewport and all child-facing text remains English');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{await browser?.close();});
