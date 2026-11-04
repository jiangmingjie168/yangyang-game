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
 try{for(const mobile of (process.env.BW_MOBILE==='1'?[true]:process.env.BW_MOBILE==='0'?[false]:[false,true]))for(const debug of (process.env.BW_DEBUG==='0'?[false]:process.env.BW_DEBUG==='1'?[true]:[true,false]))for(const name of (process.env.BW_CASE||'A,A2,J,S,B,M,P,G').split(',')){
 const tag=`${name}-${mobile?'mobile':'desktop'}-${debug?'log':'clean'}`;
 const context=await browser.newContext({viewport:mobile?{width:844,height:390}:{width:1366,height:768},isMobile:mobile,hasTouch:mobile,recordVideo:{dir:path.join(out,'build-v1-fix3-video'),size:mobile?{width:844,height:390}:{width:1366,height:768}}});
 await context.route(/http:\/\/fix3-\d+\.test\/.*/,r=>r.fulfill({contentType:'text/html; charset=utf-8',body:source}));
 await context.route('https://brain.yydriver.cn/**',r=>r.fulfill({contentType:'application/json',body:'{}'}));
 const p=await context.newPage(),start=Date.now(),errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error'&&/Error|at .*http/.test(m.text())&&!/Failed to load|net::/.test(m.text()))errors.push(m.text());});p.setDefaultTimeout(12000);
 let lastInputAt=start;
 const wait=ms=>p.waitForTimeout(ms);
 async function click(x,y,purpose){clicks.push({case:tag,t_ms:Date.now()-start,x,y,purpose});await p.mouse.click(x,y);lastInputAt=Date.now();await wait(90);}
 async function button(selector,purpose){const l=typeof selector==='string'?p.locator(selector):selector;let b=await l.boundingBox();if(b&&b.y+b.height> (mobile?390:768)){const sx=(mobile?844:1366)/2;clicks.push({case:tag,t_ms:Date.now()-start,x:sx,y:180,purpose:'Native middle-button autoscroll recipe panel'});await p.mouse.click(sx,180,{button:'middle'});await p.mouse.move(sx,300);await wait(900);await click(sx,300,'Stop native recipe autoscroll');await wait(150);b=await l.boundingBox();}assert(b,'Visible control: '+purpose);await click(b.x+b.width/2,b.y+b.height/2,purpose);}
 async function snap(label){const file=`build-v1-fix3-${tag}-${Date.now()-start}-${label}.png`;await p.screenshot({path:path.join(out,file),timeout:20000});frames.push({case:tag,t_ms:Date.now()-start,file,label});}
 async function place(x,y,k,n,purpose){for(let retry=0;retry<30;retry++){await world(x,y,purpose);if(await p.locator(`[data-build="${k}"] small`).innerText()===String(n))return;if(!/Choose empty squares/.test(await p.locator('#toast-en').innerText()))break;await wait(350);}await stock(k,n);}
 async function vision(mode,x){return JSON.parse(require('node:child_process').execFileSync('python3',[path.join(__dirname,'build-v1-fix3-vision.py'),mode,String(x),String(mobile?38:50)],{input:await p.screenshot()}));}
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
 await p.goto(`http://fix3-${++serial}.test/${debug?'?buildlog=1':''}`);await button('#btn-start','Start');await button('#welcome-play','Play');await wait(500);await snap('fresh');
 if(name==='inspect'){await prep(false);await snap('after-prep');}
 else if(name==='J'){
 await prep();await place(164,300,'fence',7,'First Fence');await place(278,300,'fence',6,'Second Fence');
 await button('#btn-jump','Jump on ground');await wait(140);await button('#btn-jump','Jump in air');await wait(100);await button('#btn-jump','Jump in air again');
 const idle=lastInputAt;let cheer=null,show=null,next=0;while(Date.now()-idle<15500){const elapsed=Date.now()-idle;const line=await p.locator('#buddy-line').innerText();if(/You made this!/.test(line)&&await p.locator('#buddy-chat').isVisible()&&cheer===null){cheer=elapsed;await snap('J-cheer');}if(await p.getByRole('button',{name:'Show my building'}).isVisible()&&show===null)show=elapsed;if(elapsed>=next){await snap('idle-'+next/1000+'s');next+=5000;}await wait(80);}assert(cheer!==null,'Jump buffer: completion within 15s');assert(show!==null,'Jump buffer: Show within 15s');results.push({case:tag,status:'PASS',idle_start_ms:idle-start,cheer_ms:cheer,show_ms:show});
 }else if(name==='S'||name==='B'){
 // Fixed human-path coordinates from the passing main matrix (no evaluate / vision injection).
 await prep(false);await move(-1,1300);
 const wallX=name==='S'?450:395;
 if(name==='B'){await move(1,80);await wait(500);}
 await place(wallX,262,'planks',11,'Wall base beside child');
 await move(name==='S'?-1:1,160);await snap('against-wall');
 const targetX=name==='S'?450:373;
 await world(targetX,224,'Second layer from beside wall');await snap('second-layer');await stock('planks',10);
 if(name==='B'){
  await world(targetX,213,'Tap second layer top surface for third layer');await stock('planks',9);await snap('B-third-layer');
  await button('#btn-build','Leave Build');await button('#hotbar button[aria-label="Planks"]','Select Planks hotbar');if(await p.locator('#wordcard').isVisible())await button('#wordcard','Dismiss Planks card');
  await button('#btn-place','Normal Place matches preview');await waitText('#hotbar button[aria-label="Planks"] em',/^8$/);await snap('B-normal-place');
  if(await p.locator('#wordcard').isVisible())await button('#wordcard','Dismiss Planks card');
  await world(targetX,196,'Normal lower surface mines third layer');await waitText('#hotbar button[aria-label="Planks"] em',/^9$/);
  if(await p.locator('#wordcard').isVisible())await button('#wordcard','Dismiss mined Planks card');
  await world(targetX,213,'Normal upper surface stacks above second layer');await waitText('#hotbar button[aria-label="Planks"] em',/^8$/);await snap('B-normal-top-stack');
 }
 results.push({case:tag,status:'PASS'});
 }else if(name==='W'){
 // Optional adjacent two-column stack using the same fixed human path as B.
 await prep(false);await move(-1,1300);await move(1,80);await wait(500);
 await place(411,262,'planks',11,'Left wall base');await place(373,262,'planks',10,'Right wall base');
 await move(1,160);await snap('against-wall');
 for(const [i,[x,y]] of [[411,224],[411,186],[373,224],[373,186]].entries()){await place(x,y,'planks',9-i,'Stack wall cell '+i);await snap('B-two-column-'+i);}
 results.push({case:tag,status:'PASS'});
 }else if(name==='P'){
 await prep(false);await world(164,300,'Place visible plank');await stock('planks',11);await snap('P-pulse');await world(164,262,'Place above first plank');await stock('planks',10);assert.equal(await p.locator('#build-show').getAttribute('aria-disabled'),'false');await button('#build-show','Two arbitrary blocks qualify for manual Show');await waitText('#buddy-line',/You made this!.*Good job!/);await snap('P-two-planks-show');await world(164,300,'Occupied target with occupied top');await stock('planks',10);await waitText('#toast-en',/Choose empty squares!/);await snap('P-occupied');
 await world(25,186,'Out of reach target');await stock('planks',10);await waitText('#toast-en',/Move a little closer!/);await snap('P-reach');await button('[data-build="remove"]','Remove tool');await world(202,262,'Remove unowned air');await waitText('#toast-en',/Tap a block you built!/);await stock('planks',10);await snap('P-remove');
 if(mobile){await button('[data-build="planks"]','Planks below HUD');await world(164,142,'Place under build status');await stock('planks',9);assert.equal(await p.locator('#build-status').isVisible(),false);await snap('P-HUD-yields');}
 if(debug){await button('[data-build="planks"]','Animal occupancy check');let animal=false;
 for(const x of [88,126,164,202,240,278,316,88,126,202,240]){const before=Number(await p.locator('[data-build=planks] small').innerText());await world(x,300,'Try ground cell near roaming animals');await wait(270);const log=await p.locator('#build-debug').innerText();if(log.trim().split('\n').at(-1).includes('fail:animal')){await stock('planks',before);await waitText('#toast-en',/Choose empty squares!/);animal=true;await snap('P-animal-refused');break;}}
 assert(animal,'Read-only log confirms animal collision refusal');}
 results.push({case:tag,status:'PASS'});
 }else if(name==='G'){
 await prep();await place(164,300,'fence',7,'One Fence outline');await p.mouse.move(500,100);await snap('G-one-build');await button('#btn-build','One Fence outside Build');await snap('G-one-normal');await button('#btn-build','Return Build');await place(278,300,'fence',6,'Two Fence outline');await p.mouse.move(500,100);await wait(1250);await snap('G-two-build');await button('#btn-build','Ready outline outside Build');await snap('G-two-normal');
 await waitText('#buddy-line',/You made this!/);await move(1,700);await wait(2000);assert(await p.locator('#buddy-chat').isVisible());assert.match(await p.locator('#buddy-line').innerText(),/You made this!/);await snap('G-praise-survives-movement');results.push({case:tag,status:'PASS'});
 }
 assert.deepEqual(errors,[]);if(name==='inspect')results.push({case:tag,status:'PASS'});
 }catch(e){await snap('FAIL');results.push({case:tag,status:'FAIL',error:String(e),errors});}finally{const video=p.video();await p.close();await context.close();results.at(-1).video=path.relative(out,await video.path());console.log(JSON.stringify(results.at(-1)));fs.writeFileSync(path.join(out,'build-v1-fix3-clicks.json'),JSON.stringify(clicks,null,2));fs.writeFileSync(path.join(out,'build-v1-fix3-results.json'),JSON.stringify({source_sha256:require('node:crypto').createHash('sha256').update(source).digest('hex'),results,frames},null,2));}
 }
 }finally{await browser.close();}if(results.some(r=>r.status==='FAIL'))process.exitCode=1;
}
run().catch(e=>{console.error(e);process.exitCode=1;});
