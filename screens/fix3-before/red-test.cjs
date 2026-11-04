'use strict';
// Unmodified HTML, fresh origins. Gameplay uses only trusted mouse events.
// DOM geometry locates controls; assertions read rendered text/attributes only.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),out=path.resolve(process.env.BW_EVIDENCE_ROOT||path.join(root,'screens'));
const source=fs.readFileSync(process.env.BW_SOURCE||path.join(root,'index.html'));
fs.mkdirSync(out,{recursive:true});
async function run(){
 const browser=await chromium.launch({executablePath:process.env.CHROME||'/usr/bin/google-chrome',args:['--no-sandbox']});
 const results=[],clicks=[],frames=[];let serial=0;
 try{for(const mobile of (process.env.BW_MOBILE==='1'?[true]:process.env.BW_MOBILE==='0'?[false]:[false,true]))for(const debug of (process.env.BW_DEBUG==='0'?[false]:process.env.BW_DEBUG==='1'?[true]:[true,false]))for(const name of (process.env.BW_CASE||'J,S').split(',')){
 const tag=`${name}-${mobile?'mobile':'desktop'}-${debug?'log':'clean'}`;
 const context=await browser.newContext({viewport:mobile?{width:844,height:390}:{width:1366,height:768},isMobile:mobile,hasTouch:mobile,recordVideo:{dir:path.join(out,'build-v1-fix3-video'),size:mobile?{width:844,height:390}:{width:1366,height:768}}});
 await context.route(/http:\/\/fix3-\d+\.test\/.*/,r=>r.fulfill({contentType:'text/html; charset=utf-8',body:source}));
 await context.route('https://brain.yydriver.cn/**',r=>r.fulfill({contentType:'application/json',body:'{}'}));
 const p=await context.newPage(),start=Date.now(),errors=[];p.on('pageerror',e=>errors.push(e.message));p.setDefaultTimeout(12000);
 const wait=ms=>p.waitForTimeout(ms);
 async function click(x,y,purpose){clicks.push({case:tag,t_ms:Date.now()-start,x,y,purpose});await p.mouse.click(x,y);await wait(90);}
 async function button(selector,purpose){const l=typeof selector==='string'?p.locator(selector):selector;let b=await l.boundingBox();if(b&&b.y+b.height> (mobile?390:768)){await l.scrollIntoViewIfNeeded();b=await l.boundingBox();}assert(b,'Visible control: '+purpose);await click(b.x+b.width/2,b.y+b.height/2,purpose);}
 async function snap(label){const file=`build-v1-fix3-${tag}-${Date.now()-start}-${label}.png`;await p.screenshot({path:path.join(out,file)});frames.push({case:tag,t_ms:Date.now()-start,file,label});}
 async function stock(k,n){assert.equal(await p.locator(`[data-build="${k}"] small`).innerText(),String(n));}
 async function waitText(selector,re,ms=12000){const end=Date.now()+ms;do{if(await p.locator(selector).isVisible()&&re.test(await p.locator(selector).innerText()))return;await wait(80);}while(Date.now()<end);throw Error(`Text not visible ${selector} ${re}: `+await p.locator(selector).innerText());}
 async function craft(label,times){const b=p.locator('#recipes .recipe').filter({has:p.locator('.out b',{hasText:new RegExp('^'+label+'$')})}).locator('.craftbtn');for(let i=0;i<times;i++){assert.match(await b.getAttribute('class'),/ready/);await button(b,'Craft '+label);if(await p.locator('#wordcard').isVisible())await button('#wordcard','Dismiss material card');}}
 async function prep(fence=true){
 await click(658,262,'Harvest first Wood');await waitText('#hotbar button[aria-label="Wood"] em',/^1$/);await wait(700);
 await click(459,224,'Harvest second Wood');await waitText('#hotbar button[aria-label="Wood"] em',/^2$/);await wait(250);
 await click(459,262,'Harvest third Wood');await waitText('#hotbar button[aria-label="Wood"] em',/^3$/);
 if(await p.locator('#wordcard').isVisible())await button('#wordcard','Dismiss Wood card');await button('#btn-craft','Open Craft');await craft('Planks ×4',3);if(fence){await craft('Stick ×4',1);await craft('Fence ×2',4);}await snap('crafted');await button('#craft-back','Close Craft');await button('#btn-build','Open Build');await button(`[data-build="${fence?'fence':'planks'}"]`,'Select material');
 }
 async function move(dir,ms){const b=await p.locator('#joy').boundingBox();const x=b.x+b.width/2,y=b.y+b.height/2;clicks.push({case:tag,t_ms:Date.now()-start,x,y,purpose:`Joystick ${dir} ${ms}ms`});await p.mouse.move(x,y);await p.mouse.down();await p.mouse.move(x+dir*b.width*.4,y);await wait(ms);await p.mouse.up();await wait(350);}
 try{
 await p.goto(`http://fix3-${++serial}.test/${debug?'?buildlog=1':''}`);await button('#btn-start','Start');await button('#welcome-play','Play');await wait(500);await snap('fresh');
 if(name==='inspect'){await wait(100);}
 else if(name==='J'){
 await prep();await click(164,300,'First Fence');await stock('fence',7);await click(278,300,'Second Fence');await stock('fence',6);
 await button('#btn-jump','Jump on ground');await wait(140);await button('#btn-jump','Jump in air');await wait(100);await button('#btn-jump','Jump in air again');
 const idle=Date.now();let cheer=null,show=null;for(let i=0;i<=150;i++){const line=await p.locator('#buddy-line').innerText();if(/You made this!/.test(line)&&await p.locator('#buddy-chat').isVisible()&&cheer===null)cheer=Date.now()-idle;if(await p.getByRole('button',{name:'Show my building'}).isVisible()&&show===null)show=Date.now()-idle;if(i%50===0)await snap('idle-'+i/10+'s');await wait(100);}assert(cheer!==null,'Jump buffer: completion within 15s');assert(show!==null,'Jump buffer: Show within 15s');results.push({case:tag,status:'PASS',cheer_ms:cheer,show_ms:show});
 }else if(name==='S'){
 await prep(false);await move(-1,1300);await click(450,262,'Wall base beside child');await stock('planks',11);await move(-1,160);await snap('against-wall');
 // Camera settles with the child against the right side of this base.
 await click(450,224,'Second layer from beside wall');await snap('second-layer');await stock('planks',10);results.push({case:tag,status:'PASS'});
 }
 assert.deepEqual(errors,[]);if(name==='inspect')results.push({case:tag,status:'PASS'});
 }catch(e){await snap('FAIL');results.push({case:tag,status:'FAIL',error:String(e),errors});}finally{await p.close();await context.close();console.log(JSON.stringify(results.at(-1)));fs.writeFileSync(path.join(out,'build-v1-fix3-clicks.json'),JSON.stringify(clicks,null,2));fs.writeFileSync(path.join(out,'build-v1-fix3-results.json'),JSON.stringify({source_sha256:require('node:crypto').createHash('sha256').update(source).digest('hex'),results,frames},null,2));}
 }
 }finally{await browser.close();}if(results.some(r=>r.status==='FAIL'))process.exitCode=1;
}
run().catch(e=>{console.error(e);process.exitCode=1;});
