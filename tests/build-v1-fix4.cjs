'use strict';
// Unmodified HTML, fresh origins. Gameplay uses only trusted mouse events.
// DOM geometry locates controls; assertions read rendered text/attributes only.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),out=path.resolve(process.env.BW_EVIDENCE_ROOT||path.join(root,'screens'));
const source=fs.readFileSync(process.env.BW_SOURCE||path.join(root,'index.html'));
fs.mkdirSync(out,{recursive:true});
async function run(){
 const browser=await chromium.launch({executablePath:process.env.CHROME||'/usr/bin/google-chrome',args:['--no-sandbox','--enable-blink-features=MiddleClickAutoscroll'],ignoreDefaultArgs:['--hide-scrollbars']});
 const results=[],clicks=[],frames=[];let serial=0;
 try{for(const mobile of (process.env.BW_MOBILE==='1'?[true]:process.env.BW_MOBILE==='0'?[false]:[false,true]))for(const debug of (process.env.BW_DEBUG==='0'?[false]:process.env.BW_DEBUG==='1'?[true]:[false]))for(const name of (process.env.BW_CASE||'F,M,C,R,N,S,V').split(',')){
 const tag=`${name}-${mobile?'mobile':'desktop'}-${debug?'log':'clean'}`;
 const context=await browser.newContext({viewport:mobile?{width:844,height:390}:{width:1366,height:768},isMobile:mobile,hasTouch:mobile,recordVideo:{dir:path.join(out,'build-v1-fix4-video'),size:mobile?{width:844,height:390}:{width:1366,height:768}}});
 await context.route(/http:\/\/fix4-\d+\.test\/.*/,r=>r.fulfill({contentType:'text/html; charset=utf-8',body:source}));
 await context.route('https://brain.yydriver.cn/**',r=>r.fulfill({contentType:'application/json',body:'{}'}));
 const p=await context.newPage(),start=Date.now(),errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error'&&/Error|at .*http/.test(m.text())&&!/Failed to load|net::/.test(m.text()))errors.push(m.text());});p.setDefaultTimeout(12000);
 let lastInputAt=start;
 const wait=ms=>p.waitForTimeout(ms);
 async function click(x,y,purpose){clicks.push({case:tag,t_ms:Date.now()-start,x,y,purpose});await p.mouse.click(x,y);lastInputAt=Date.now();await wait(90);}
 async function button(selector,purpose){const l=typeof selector==='string'?p.locator(selector):selector;let b=await l.boundingBox();if(b&&b.y+b.height> (mobile?390:768)){const sx=(mobile?844:1366)/2;clicks.push({case:tag,t_ms:Date.now()-start,x:sx,y:180,purpose:'Native middle-button autoscroll recipe panel'});await p.mouse.click(sx,180,{button:'middle'});await p.mouse.move(sx,300);await wait(900);await click(sx,300,'Stop native recipe autoscroll');await wait(150);b=await l.boundingBox();}assert(b,'Visible control: '+purpose);await click(b.x+b.width/2,b.y+b.height/2,purpose);}
 async function snap(label){const file=`build-v1-fix4-${tag}-${Date.now()-start}-${label}.png`;const png=await p.screenshot({path:path.join(out,file),timeout:20000});let confettiPixels;if(label.endsWith('-confetti')&&!debug){confettiPixels=Number(require('node:child_process').execFileSync('python3',[path.join(__dirname,'build-v1-fix4-pixels.py')],{input:png}));assert(confettiPixels>=35,'Visible pink/purple celebration pixels: '+confettiPixels);}frames.push({case:tag,t_ms:Date.now()-start,file,label,confettiPixels});}
 async function place(x,y,k,n,purpose){for(let retry=0;retry<30;retry++){await world(x,y,purpose);if(await p.locator(`[data-build="${k}"] small`).innerText()===String(n))return;if(!/Choose empty squares/.test(await p.locator('#toast-en').innerText()))break;await wait(350);}await stock(k,n);}

 async function stock(k,n){assert.equal(await p.locator(`[data-build="${k}"] small`).innerText(),String(n));}
 async function waitText(selector,re,ms=12000){const end=Date.now()+ms;do{if(await p.locator(selector).isVisible()&&re.test(await p.locator(selector).innerText()))return;await wait(80);}while(Date.now()<end);throw Error(`Text not visible ${selector} ${re}: `+await p.locator(selector).innerText());}
 async function craft(label,times){const b=p.locator('#recipes .recipe').filter({has:p.locator('.out b',{hasText:new RegExp('^'+label+'$')})}).locator('.craftbtn');for(let i=0;i<times;i++){assert.match(await b.getAttribute('class'),/ready/);await button(b,'Craft '+label);if(await p.locator('#wordcard').isVisible())await button('#wordcard','Dismiss material card');}}
 let facing=1;
 async function world(x,y,purpose){const ax=facing<0?.58:.42;if(!mobile){x=(x-844*ax)*50/38+1366*ax;y=(y-390*.72)*50/38+768*.72;}await click(x,y,purpose);}
 async function settleEncounter(){
 for(let i=0;i<8&&await p.locator('#dialogue').isVisible();i++){
   await wait(500);const hint=p.locator('#chat-options .hint-answer').first(),choice=await hint.isVisible()?hint:p.locator('#chat-options button').first();
   if(await choice.isVisible() && await choice.getAttribute('disabled')===null)await button(choice,'Answer visible encounter picture choice');
   await wait(1300);
 }
 assert.equal(await p.locator('#dialogue').isVisible(),false,'Encounter answered through visible buttons');
 }
 async function harvest(x,y,label){
 await settleEncounter();const item=p.locator('#hotbar button[aria-label="Wood"] em');const before=await item.isVisible()?Number(await item.innerText()):0;
 for(let n=0;n<8;n++){
   await settleEncounter();
   if(await p.locator('#wordcard').isVisible())await button('#wordcard','Dismiss blocking card before harvest');
   await world(x,y,label);const end=Date.now()+3500;
   do{
     if(await item.isVisible()&&Number(await item.innerText())>before)return;
     if(await p.locator('#dialogue').isVisible())break;
     if(await p.locator('#wordcard').isVisible()){await button('#wordcard','Dismiss Wood card during harvest wait');}
     await wait(100);
   }while(Date.now()<end);
 }
 throw Error('Wood harvest did not increase visible inventory');
 }
 async function prep(fence=true){
 await harvest(658,262,'Harvest first Wood');await wait(700);if(await p.locator('#wordcard').isVisible())await button('#wordcard','Dismiss Wood card');
 await harvest(459,224,'Harvest second Wood');await wait(250);if(await p.locator('#wordcard').isVisible())await button('#wordcard','Dismiss Wood card');
 await harvest(459,262,'Harvest third Wood');await settleEncounter();
 if(await p.locator('#wordcard').isVisible())await button('#wordcard','Dismiss Wood card');await button('#btn-craft','Open Craft');await craft('Planks ×4',3);if(fence){await craft('Stick ×4',1);await craft('Fence ×2',4);}await snap('crafted');await button('#craft-back','Close Craft');await button('#btn-build','Open Build');await button(`[data-build="${fence?'fence':'planks'}"]`,'Select material');
 }
 async function move(dir,ms){facing=dir;const b=await p.locator('#joy').boundingBox();const x=b.x+b.width/2,y=b.y+b.height/2;clicks.push({case:tag,t_ms:Date.now()-start,x,y,purpose:`Joystick ${dir} ${ms}ms`});await p.mouse.move(x,y);await p.mouse.down();await p.mouse.move(x+dir*b.width*.4,y);await wait(ms);await p.mouse.up();lastInputAt=Date.now();clicks.push({case:tag,t_ms:lastInputAt-start,x:x+dir*b.width*.4,y,purpose:'Release joystick; hands off'});await wait(350);}
 try{
 await p.goto(`http://fix4-${++serial}.test/${debug?'?buildlog=1':''}`);await button('#btn-start','Start');await button('#welcome-play','Play');await wait(500);await snap('fresh');
 assert(['F','M','C','R','N','S','V'].includes(name),'Implemented case: '+name);
 if(name==='V'){
 assert.equal(await p.locator('#build-version').innerText(),'build c331096+fix4');assert(await p.locator('#build-version').isVisible());await snap('V-visible-version');
 }else if(name==='S'){
 await prep(false);await move(-1,1300);await place(450,262,'planks',11,'Wall base beside child');await move(-1,160);await snap('S-against-wall');
 await world(450,224,'Tap empty square directly above base');if(await p.locator('[data-build="planks"] small').innerText()==='11')await world(450,224,'Confirm same upper empty square');await stock('planks',10);await snap('S-second-layer');
 await world(450,186,'Tap upper empty square for third layer');if(await p.locator('[data-build="planks"] small').innerText()==='10')await world(450,186,'Confirm third-layer square');await stock('planks',9);await snap('S-third-layer');
 }else{
 await prep();
 const show=p.getByRole('button',{name:'Show my building'});
 async function cheer(label,closed=false){await waitText('#buddy-line',closed?/It's all closed!/:/You made this!/);await wait(300);if(debug)await waitText('#build-debug',/celebrate particles=[1-9]\d*/);await snap(label+'-confetti');}
 async function invite(){await show.waitFor({state:'visible'});}
 async function freeShow(label){await button(show,'Child accepts Show invitation');await waitText('#buddy-line',/You made this!.*Good job!/);assert.equal(await p.locator('#buddy-options button').count(),0);await wait(300);if(debug)await waitText('#build-debug',/celebrate particles=[1-9]\d*/);await snap(label+'-free-confetti');}
 async function expired(){await p.locator('#buddy-chat').waitFor({state:'hidden',timeout:31000});}
 if(name==='C'){
  for(const [i,[x,y]] of [[164,224],[164,262],[164,300],[202,224],[240,224],[278,224],[278,262],[278,300]].entries())await place(x,y,'fence',7-i,'Close pen cell '+i);
  await cheer('C-closed',true);await button('#build-show','Manual closed pen Show');await invite();await wait(5000);assert(await show.isVisible(),'Closed invitation survives ordinary reading time');await snap('C-invite-5s');await button(show,'Accept closed pen invitation');await waitText('#buddy-line',/^What is this\?$/);assert.equal(await p.locator('#buddy-options button').count(),2);await snap('C-question-one');await button('#buddy-options [data-word="fence"]','Answer Fence');await waitText('#buddy-line',/You built a fence!/);await snap('C-answer-finale');
  // Third manual use must still ask a real closed question (old >=3 fallback).
  for(let i=2;i<=3;i++){await button('#buddy-close','Close answered Show');await button('#build-show','Manual pen Show '+i);await invite();await button(show,'Accept pen Show '+i);await waitText('#buddy-line',/^What is this\?$/);await button('#buddy-options [data-word="fence"]','Answer pen Show '+i);await waitText('#buddy-line',/You built a fence!/);}
  await snap('C-third-manual-finale');
 }else{
  const coords=name==='N'?[[88,224],[126,224]]:[[164,300],[278,300]];
  for(const [i,[x,y]] of coords.entries())await place(x,y,'fence',7-i,'Initial free Fence '+i);
  if(name==='M'){
   await button('#build-show','Manual free Show');await invite();const since=Date.now();await snap('M-invite-start');await wait(5000);assert(await show.isVisible(),'Manual invitation survives 5 seconds');await button('#build-show','Repeat toolbar tap must not replace invitation');await wait(5500);assert(await show.isVisible(),'Manual invitation survives 10.5 seconds');await snap('M-invite-10s');await freeShow('M');results.push({case:tag,status:'PASS',invite_ms:Date.now()-since});
  }else{
   await cheer(name+'-idle');await invite();
   if(name==='F'){await freeShow('F');}
   else if(name==='N'){
    await freeShow('N-first');await expired();
    await place(354,186,'fence',5,'New distant cluster first Fence');await place(354,224,'fence',4,'New distant cluster second Fence');await cheer('N-new-cluster');assert.equal(await p.locator('#build-show').getAttribute('aria-disabled'),'false');await invite();await freeShow('N-second');
   }else if(name==='R'){
    // Let the untouched invitation AND fallback praise expire on real wall time.
    await expired();await snap('R-expired-unanswered');
    await place(164,262,'fence',5,'Continue same cluster first new block');await wait(2900);assert.equal(await show.isVisible(),false,'One new block does not auto-reinvite');
    await place(278,262,'fence',4,'Continue same cluster second new block');assert.equal(await p.locator('#build-show').getAttribute('aria-disabled'),'false');await cheer('R-rearmed');await invite();await freeShow('R-second');await expired();
    await place(164,224,'fence',3,'Third cycle first new block');await place(278,224,'fence',2,'Third cycle second new block');await cheer('R-third-completion');await button('#build-show','Manual Show after auto quota');await invite();await freeShow('R-third');
    await button('#buddy-close','Close third Show');await button('#build-show','Fourth combined Show');await invite();await freeShow('R-fourth');await button('#buddy-close','Close fourth Show');assert.equal(await p.locator('#build-show').getAttribute('data-state'),'spent');await button('#build-show','Try fifth combined Show');await waitText('#toast-en',/No more shows today!/);await snap('R-daily-cap');await p.reload();await button('#btn-start','Reload saved world');await button('#welcome-play','Play saved world');await button('#btn-build','Open saved Build tools');assert.equal(await p.locator('#build-show').getAttribute('data-state'),'spent');await snap('R-cap-persists');
   }
  }
 }
 }
 if(results.at(-1)?.case!==tag)results.push({case:tag,status:'PASS'});
 assert.deepEqual(errors,[]);
 }catch(e){await snap('FAIL');results.push({case:tag,status:'FAIL',error:String(e),errors});}finally{const video=p.video();await p.close();await context.close();results.at(-1).video=path.relative(out,await video.path());console.log(JSON.stringify(results.at(-1)));fs.writeFileSync(path.join(out,'build-v1-fix4-clicks.json'),JSON.stringify(clicks,null,2));fs.writeFileSync(path.join(out,'build-v1-fix4-results.json'),JSON.stringify({source_sha256:require('node:crypto').createHash('sha256').update(source).digest('hex'),results,frames},null,2));}
 }
 }finally{await browser.close();}if(results.some(r=>r.status==='FAIL'))process.exitCode=1;
}
run().catch(e=>{console.error(e);process.exitCode=1;});
