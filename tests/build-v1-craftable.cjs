'use strict';
// Original HTML bytes, desktop + landscape mobile. Only initial raw materials
// are supplied via BW.give (explicitly authorized). Craft/place/Show/answer/remove
// all use trusted mouse events. Evaluations otherwise READ coordinates/save only;
// no dialogue, kind, clocks, quota, placement or inventory-output injection.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),source=fs.readFileSync(path.join(root,'index.html'));
const out=path.resolve(process.env.BW_EVIDENCE_ROOT||path.join(root,'screens/build-v1-craftable-final'));fs.mkdirSync(out,{recursive:true});
const results=[],frames=[],clicks=[];
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROME||'/usr/bin/google-chrome',args:['--no-sandbox','--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows']});
try{for(const mobile of (process.env.BW_MOBILE==='0'?[false]:process.env.BW_MOBILE==='1'?[true]:[false,true]))for(const test of (process.env.BW_CASE||'C,P,F,Q,R,I,V,T2,T3,N').split(',')){
 const tag=test+'-'+(mobile?'mobile':'desktop'),start=Date.now(),errors=[];
 const context=await browser.newContext({viewport:mobile?{width:844,height:390}:{width:1366,height:768},isMobile:mobile,hasTouch:mobile});
 await context.route('http://craft.test/**',r=>r.fulfill({contentType:'text/html; charset=utf-8',body:source}));
 await context.route('https://brain.yydriver.cn/**',r=>r.fulfill({contentType:'application/json',body:'{}'}));
 const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));p.setDefaultTimeout(12000);
 const wait=ms=>p.waitForTimeout(ms);
 async function button(selector,purpose){const l=typeof selector==='string'?p.locator(selector):selector;await l.scrollIntoViewIfNeeded();const b=await l.boundingBox();assert(b,'visible '+purpose);await click(b.x+b.width/2,b.y+b.height/2,purpose);}
 async function click(x,y,purpose){clicks.push({case:tag,ms:Date.now()-start,x,y,purpose});await p.mouse.click(x,y);await wait(100);}
 async function world(x,y,purpose){const pos=await p.evaluate(([x,y])=>BW.worldToScreen((x+.5)*32,(y+.5)*32),[x,y]);await click(pos.x,pos.y,purpose);}
 async function snap(label){const file=`build-v1-craftable-${tag}-${label}.png`;const png=await p.screenshot({path:path.join(out,file),style:'#build-debug{visibility:hidden!important}'});let pixels;if(/celebration|finale-confetti/.test(label)){pixels=Number(require('node:child_process').execFileSync('python3',[path.join(__dirname,'build-v1-fix4-pixels.py')],{input:png}));assert(pixels>=35,'Visible confetti: '+pixels);}frames.push({case:tag,file,label,ms:Date.now()-start,confettiPixels:pixels,line:await p.locator('#buddy-line').innerText(),options:await p.locator('#buddy-options button').allInnerTexts(),debug:await p.locator('#build-debug').innerText()});}
 async function text(sel,re,timeout=12000){const end=Date.now()+timeout;while(Date.now()<end){if(await p.locator(sel).isVisible()&&re.test(await p.locator(sel).innerText()))return;await wait(100);}throw Error(sel+' expected '+re+' got '+await p.locator(sel).innerText());}
 async function count(n){await text('#build-debug',new RegExp('shows '+n+'/4'));}
 async function stock(item,n){assert.equal(await p.locator(`[data-build="${item}"] small`).innerText(),String(n));}
 async function dismiss(){if(await p.locator('#wordcard').isVisible())await button('#wordcard','Dismiss word card');}
 async function save(){return p.evaluate(()=>JSON.parse(localStorage.getItem('block-world-save-v1')));}
 async function craft(item,times=1){const label=item==='houseKit'?'House':'Pen';const recipe=p.locator('.recipe').filter({has:p.locator('.out b',{hasText:new RegExp('^'+label+'$')})});for(let i=0;i<times;i++){assert.match(await recipe.locator('.craftbtn').getAttribute('class'),/ready/);await button(recipe.locator('.craftbtn'),'Craft '+label);await dismiss();}}
 const show=p.getByRole('button',{name:'Show my building'});
 async function invite(){await show.waitFor({state:'visible'});}
 async function openShow(){await button('#build-show','Open Show invitation');await invite();}
 async function accept(kind,n,label){await button(show,'Accept Show (only quota increment)');if(kind==='free'){await text('#buddy-line',/You made this!.*Good job!/);assert.equal(await p.locator('#buddy-options button').count(),0);}else{await text('#buddy-line',test==='T2'?/^What's this\?$/:test==='T3'?/^I made a fence\. Say it!$/:/^What is this\?$/);if(test==='T2'||test==='T3'){assert.equal(await p.locator('#buddy-options button').count(),0);await snap(label+'-spoken-question');await p.locator('#buddy-options button').first().waitFor({state:'visible',timeout:10000});}assert.equal(await p.locator('#buddy-options button').count(),2);await snap(label+'-question-options');await button('#buddy-options [data-word="'+(kind==='house'?'house':'fence')+'"]','Answer '+kind);await text('#buddy-line',new RegExp('You built a '+(kind==='house'?'house':'fence')+'!'));}await count(n);await snap(label+'-finale-confetti');}
 async function close(){if(await p.locator('#buddy-chat').isVisible())await button('#buddy-close','Keep playing / close feedback');}
 async function ready(){await p.locator('#build-show[data-state="ready"]').waitFor({state:'visible'});}
 async function extra(i){await button('[data-build="planks"]','Select one extra Planks');await world(77+i,12,'Place exactly one new block beside whole House');await stock('planks',35-i);await wait(2800);await ready();await snap('rearmed-'+i);}
 async function enter(){await button('#btn-start','Start');await button('#welcome-play','Play');await wait(500);}
 try{
 await p.goto('http://craft.test/?buildlog=1#seed=42');await enter();
 if(test==='T2'||test==='T3'){await button('#btn-zh','Open parent difficulty');await button('[data-build-level="'+test.slice(1)+'"]','Set build difficulty');await button('#parent-close','Return from parent settings');}
 assert.equal(await p.locator('#build-version').innerText(),'build fdec124+craft');assert(await p.locator('#build-version').isVisible());
 if(test==='V'){await snap('version');}
 else{
  // Raw materials only; crafting itself must create the instance and count.
  await p.evaluate(()=>{BW.give('planks',40);BW.give('stone',5);BW.give('fence',20);});
  const item=(test==='P'||test==='T3')?'pen':'houseKit',kind=item==='pen'?'pen':'house',initial=test==='N'?2:1;
  if(item==='pen'){await button('#btn-break','Harvest the flower ahead to clear 4-wide ground');await wait(500);await dismiss();}
  if(test!=='F'){
   await button('#btn-craft','Open Craft');await craft(item,initial);const inventory=await p.evaluate(()=>BW.inv());assert.equal(inventory[item],initial);assert.equal(inventory.planks,40-(item==='houseKit'?4*initial:0));assert.equal(inventory.stone,5-(item==='houseKit'?initial:0));assert.equal(inventory.fence,20-(item==='pen'?4*initial:0));await snap('recipe');await button('#craft-back','Close Craft');
   await button('#btn-build','Open Build');await button(`[data-build="${item}"]`,'Select whole '+kind);
   await stock(item,initial);
   // In midair and at the existing tree: reject without spending the item.
   await world(77,14,'Reject unsupported placement');await stock(item,initial);await text('#toast-en',/Choose flat ground!/);
   await world(84,15,'Reject terrain/tree obstruction');await stock(item,initial);await text('#toast-en',/Find a clear|Move a little closer/);await snap('invalid-no-charge');
   await world(77,15,'Place entire '+kind+' with one mouse click');await stock(item,initial-1);await text('#buddy-line',/Wow! It's all closed!/);await snap('placed-celebration');
   const placed=await save();assert.equal(placed.build_objects.length,1);const object=placed.build_objects[0];assert.equal(object.kind,kind);assert.equal(object.level,1);assert.equal(object.w,kind==='house'?3:4);assert.equal(object.h,kind==='house'?3:2);assert(object.parts.yard.material);assert(object.parts[kind==='house'?'wall':'fence'].tier===1);assert.equal(placed.crafted_objects.length,initial-1);
   if(test==='N'){await world(77,15,'Reject overlapping whole building');await stock(item,1);await text('#toast-en',/Find a clear 3 by 3 space!/);assert.equal((await save()).build_objects.length,1);await snap('overlap-no-charge');}
   await openShow();await count(0);await snap('opening-invite');
   // Toolbar repetitions do not charge or restart an invitation.
   await button('#build-show','Repeat toolbar Show');await count(0);
   if(test==='C'||test==='P'||test==='T2'||test==='T3'){
    await accept(kind,1,kind);await close();assert.equal(await p.locator('#build-show').getAttribute('data-state'),'done');
    await button(`[data-build="${item}"]`,'Select empty whole inventory');await world(77,15,'No stock cannot duplicate whole building');await stock(item,0);
    await button('[data-build="remove"]','Select Remove');await world(78,14,'Remove by clicking any occupied cell');await stock(item,1);
    const recovered=await save();assert.equal(recovered.build_objects.length,0);assert.equal(recovered.crafted_objects.length,1);assert.deepEqual(recovered.crafted_objects[0].parts,object.parts);await snap('recovered-instance');
    await p.reload();await enter();await button('#btn-build','Open saved Build');await stock(item,1);await count(1);
    await button(`[data-build="${item}"]`,'Select recovered saved building');await world(77,15,'Re-place recovered whole building');await stock(item,0);await snap('replaced-after-reload');
    await p.reload();await enter();await button('#btn-build','Open restored placed building');const restored=await save();assert.equal(restored.build_objects.length,1);assert.deepEqual(restored.build_objects[0].parts,object.parts);await snap('placed-persists');
   }else if(test==='N'){
    await accept('house',1,'first-object');await close();assert.equal(await p.locator('#build-show').getAttribute('data-state'),'done');
    await button('#btn-build','Leave Build to test backpack placement');await button('#hotbar button[aria-label="House"]','Select next whole House from backpack');await world(81,15,'Place exactly one additional whole House from backpack');await button('#btn-build','Return to Build');await stock('houseKit',0);await ready();await snap('one-piece-rearmed');await openShow();await accept('house',2,'new-object');
    const data=await save();assert.equal(data.build_objects.length,2);await wait(2800);assert((await save()).build_objects.find(b=>b.x===81).shown,'Show targets the newly placed instance');
   }else if(test==='Q'){
    for(let n=1;n<=4;n++){if(n>1){await extra(n-2);await openShow();}await accept('house',n,'quota-'+n);await close();assert.equal(await p.locator('#build-show').getAttribute('data-state'),n===4?'spent':'done');if(n===2){await button('#build-show','Completed is distinct from spent');await text('#toast-en',/Add 1 building or block/);}}
    await button('#build-show','Fifth Show blocked');await text('#toast-en',/No more shows today!/);await count(4);await snap('fifth-blocked');await wait(2800);
    await p.reload();await enter();await button('#btn-build','Open saved quota');await count(4);assert.equal(await p.locator('#build-show').getAttribute('data-state'),'spent');await snap('quota-persists');
    await p.reload();await button('#btn-new','New world');await text('#btn-new',/Tap again/);await button('#btn-new','Confirm New world');await enter();await button('#btn-build','Open new Build');await count(0);assert.equal(await p.locator('#build-show').getAttribute('data-state'),'few');assert.equal((await save()).build_objects.length,0);await snap('new-world-zero');
   }else if(test==='R'){
    const since=Date.now();await show.waitFor({state:'hidden',timeout:39000});assert(Date.now()-since>=33000);await count(0);await snap('expiry-no-slot');await extra(0);await openShow();await accept('house',1,'after-expiry');await close();await extra(1);await openShow();await accept('house',2,'after-completion');
   }else if(test==='I'){
    const since=Date.now();await wait(10000);await button('[data-build="planks"]','Select during invite');await world(77,12,'Place during invite');await stock('planks',35);await button('#build-show','Repeat Show during invite');
    const joy=await p.locator('#joy').boundingBox();await p.mouse.move(joy.x+joy.width/2,joy.y+joy.height/2);await p.mouse.down();await p.mouse.move(joy.x+joy.width*.7,joy.y+joy.height/2);await wait(150);await p.mouse.up();
    await wait(Math.max(0,29000-(Date.now()-since)));assert(await show.isVisible());await count(0);await snap('invite-29s');await accept('house',1,'waited');results.push({case:tag,status:'PASS',invite_ms:Date.now()-since});
   }
  }else{
   await button('#btn-build','Open free Build');await button('[data-build="fence"]','Select loose Fence');
   for(const [i,x] of [77,78].entries()){for(let retry=0;retry<20;retry++){await world(x,15,'Place loose Fence');if(await p.locator('[data-build="fence"] small').innerText()===String(19-i))break;await wait(300);}await stock('fence',19-i);}
   await text('#buddy-line',/You made this!/);await snap('free-celebration');await openShow();await count(0);await accept('free',1,'free');await close();
   // Legacy closed geometry is covered separately; these tiles persist unchanged.
   await wait(2800);const old=await save();await p.reload();await enter();const now=await save();assert.deepEqual(now.mods,old.mods);assert.equal(now.build_objects.length,0);await snap('loose-save-retained');
  }
 }
 assert(!/\p{Script=Han}/u.test(await p.locator('body').innerText()),'No child-facing Chinese');assert.deepEqual(errors,[]);
 if(results.at(-1)?.case!==tag)results.push({case:tag,status:'PASS'});
 }catch(e){await snap('FAIL');results.push({case:tag,status:'FAIL',error:String(e),errors});}
 finally{await context.close();console.log(JSON.stringify(results.at(-1)));fs.writeFileSync(path.join(out,'build-v1-craftable-results.json'),JSON.stringify({sha256:crypto.createHash('sha256').update(source).digest('hex'),results,frames},null,2));fs.writeFileSync(path.join(out,'build-v1-craftable-clicks.json'),JSON.stringify(clicks,null,2));}
 }
}finally{await browser.close();}if(results.some(r=>r.status==='FAIL'))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
