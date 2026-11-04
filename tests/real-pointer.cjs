'use strict';
// Real canvas pointerdown, joystick capture and keyboard. Test-only additions are
// read-only observations and the explicitly allowed exercise-opening hook.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(process.env.BW_SOURCE || path.join(root,'index.html'),'utf8')
  .replace(/^const BRAIN_URL = '[^']*';$/m, "const BRAIN_URL = '';")
  .replace('ready: true,', `ready: true,
    pointerState: () => ({seek:seek && {kind:seek.kind,left:seek.left}, joyId:joyId, joyX:joyX, tapped:Object.assign({},progress.tapped), animals:animals.map(a=>({type:a.type,x:a.x,y:a.y,pet:a.pet,love:a.love})), blocked:chatBlocked()}),
    pointerCells: () => { var out=[]; for(var ty=0;ty<H;ty++)for(var tx=0;tx<W;tx++)if(get(tx,ty)===WOOD)out.push({tx,ty,reach:inReach(tx,ty),screen:worldToScreen((tx+.5)*TILE,(ty+.5)*TILE)});return out; },
    pointerCell: (tx,ty) => get(tx,ty),
    pointerLeads: () => chatContextLeads(dialogue),
    pointerOpen: (target='dog') => { learn('dog');learn('tree');rememberEvent('met','dog');openChat({anchor:'pet',key:target}); },`);
let server,browser,base; const results=[];
function pass(name,details={}) {results.push({name,status:'PASS',...details});console.log('PASS',name,JSON.stringify(details));}
async function fresh(viewport={width:1440,height:900}) {
  const c=await browser.newContext({viewport}),p=await c.newPage();p.errors=[];p.on('pageerror',e=>p.errors.push(String(e)));
  await p.addInitScript(()=>{window.spoken=[];Object.defineProperty(window,'speechSynthesis',{value:{getVoices:()=>[],cancel(){},speak(u){spoken.push(u.text)},speaking:false}})});
  await p.goto(base+'/#seed=42');await p.click('#btn-start');return p;
}
async function photo(p,name){await p.screenshot({path:path.join(root,'screens',name+'.png')});}
async function move(p,code='KeyD') {
  const x=await p.evaluate(()=>BW.player().x);await p.keyboard.down(code);await p.waitForTimeout(420);
  const dx=(await p.evaluate(()=>BW.player().x))-x;await p.keyboard.up(code);assert(dx>15,code+' dx='+dx);return dx;
}
async function joy(p) {
  const r=await p.locator('#joy').boundingBox(),x=await p.evaluate(()=>BW.player().x);
  await p.mouse.move(r.x+r.width/2,r.y+r.height/2);await p.mouse.down();
  await p.mouse.move(r.x+r.width*.12,r.y+r.height/2,{steps:8});await p.waitForTimeout(450);
  const dx=(await p.evaluate(()=>BW.player().x))-x;await photo(p,'real-pointer-mid-move');await p.mouse.up();assert(Math.abs(dx)>20,'joystick dx='+dx);
  assert.equal((await p.evaluate(()=>BW.pointerState())).joyId,null);return dx;
}
async function gather(p,far=false) {
  if(far) { await p.keyboard.down('KeyA');await p.waitForTimeout(800);await p.keyboard.up('KeyA');await p.waitForTimeout(200); }
  // Select a visible wood pixel actually hit by the canvas (not a HUD or animal).
  const cells=await p.evaluate(()=>BW.pointerCells().filter(c=>c.screen.x>20&&c.screen.x<innerWidth-20&&c.screen.y>100&&c.screen.y<innerHeight-175&&document.elementFromPoint(c.screen.x,c.screen.y)?.id==='view'&&!BW.pointerState().animals.some(a=>{const s=BW.worldToScreen(a.x,a.y-16);return Math.hypot(s.x-c.screen.x,s.y-c.screen.y)<64})).sort((a,b)=>b.ty-a.ty||a.screen.x-b.screen.x));
  const cell=cells.find(c=>far?!c.reach:c.reach)||(!far&&cells[0]); if(cell)far=!cell.reach;assert(cell,JSON.stringify({far,cells,debug:await p.evaluate(()=>({player:BW.player(),cells:BW.pointerCells().filter(c=>c.tx>60&&c.tx<100).map(c=>({...c,hit:document.elementFromPoint(c.screen.x,c.screen.y)?.id}))}))}));
  const before=await p.evaluate(()=>BW.inv().wood||0),x=await p.evaluate(()=>BW.player().x);
  await p.mouse.click(cell.screen.x,cell.screen.y);
  if(far) {assert.equal((await p.evaluate(()=>BW.pointerState())).seek?.kind,'mine');assert.notEqual(await p.evaluate(c=>BW.pointerCell(c.tx,c.ty),cell),0);}
  await p.waitForFunction(({cell,before})=>BW.pointerCell(cell.tx,cell.ty)===0&&(BW.inv().wood||0)>before,{cell,before},{timeout:7000});
  const dx=(await p.evaluate(()=>BW.player().x))-x;if(far)assert(Math.abs(dx)>1,'far gather must walk');
  return {far,dx,wood:await p.evaluate(()=>BW.inv().wood)};
}
async function animal(p) {
  const target=await p.evaluate(()=>BW.pointerState().animals.find(a=>{const s=BW.worldToScreen(a.x,a.y-16);return Math.abs(a.x-BW.player().x)>100&&s.x>40&&s.x<innerWidth-40&&s.y>120&&s.y<innerHeight-180&&document.elementFromPoint(s.x,s.y)?.id==='view'}));assert(target,'visible distant animal');
  const s=await p.evaluate(a=>BW.worldToScreen(a.x,a.y-16),target),x=await p.evaluate(()=>BW.player().x);
  await p.mouse.click(s.x,s.y);assert.equal((await p.evaluate(()=>BW.pointerState())).seek?.kind,'pet');
  await p.waitForFunction(type=>BW.pointerState().tapped[type]===1,target.type,{timeout:7000});
  assert(Math.abs((await p.evaluate(()=>BW.player().x))-x)>10);
  assert((await p.evaluate(type=>BW.pointerState().animals.find(a=>a.type===type).pet,target.type))>0,'pet hearts feedback timer');return target.type;
}
async function finish(p){assert.deepEqual(p.errors,[]);assert.equal(await p.evaluate(()=>BW.error()),'');await p.context().close();}
(async()=>{
  server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end(source)});await new Promise(r=>server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+server.address().port;
  browser=await chromium.launch({executablePath:process.env.CHROMIUM||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});
  let p=await fresh();const at=Date.now();
  assert(await p.locator('#name-entry').isVisible());const nameDx=await move(p);assert(await p.locator('#name-entry').isVisible());
  await p.click('#welcome-play');assert(await p.locator('#welcome').isHidden());
  const dx=await move(p,'ArrowRight'),entryMs=Date.now()-at;assert(entryMs<10000);assert.equal(await p.evaluate(()=>BW.weatherChat()),false);
  assert(!(await p.evaluate(()=>spoken)).some(s=>/\bMario\b/.test(s)));await photo(p,'unnamed-greeting');
  pass('entry <10s, name entry nonblocking, skip unnamed, no early weather',{nameDx,dx,entryMs});await finish(p);
  p=await fresh();await p.click('#welcome-play');pass('real joystick drag',{dx:await joy(p)});await finish(p);
  p=await fresh();await p.click('#welcome-play');pass('far wood click seeks and gathers',await gather(p,true));await finish(p);
  p=await fresh();await p.click('#welcome-play');pass('wood click uses actual approach distance',await gather(p));await finish(p);
  p=await fresh();await p.click('#welcome-play');pass('animal click walks and pets',{animal:await animal(p)});await finish(p);
  p=await fresh();await p.click('#welcome-play');
  // Hold the joystick through the exercise opening: capture and velocity must release.
  let r=await p.locator('#joy').boundingBox();await p.mouse.move(r.x+r.width*.8,r.y+r.height/2);await p.mouse.down();
  await p.evaluate(()=>BW.pointerOpen());assert.equal((await p.evaluate(()=>BW.pointerState())).joyId,null);assert.equal((await p.evaluate(()=>BW.pointerState())).seek,null);await p.mouse.up();
  const active=await p.evaluate(()=>BW.adventure().active);assert.equal(active.key,'dog');
  assert(await p.locator('#chat-picture').isHidden());assert(await p.locator('#chat-options').isVisible());await photo(p,'l1-no-answer-picture');
  const locked=await p.evaluate(()=>BW.player().x);await p.keyboard.down('KeyD');await p.waitForTimeout(300);await p.keyboard.up('KeyD');assert.equal(await p.evaluate(()=>BW.player().x),locked);
  await p.locator('[data-word="dog"]').click();await p.click('#chat-close');
  pass('exercise locks only its lifetime; immediate keyboard, gather, joystick and pet recovery',{movementDx:await move(p),...await gather(p),joyDx:await joy(p),animal:await animal(p)});
  await p.evaluate(()=>{BW.saveNow()});await p.reload();await p.click('#btn-start');assert(await p.locator('#name-entry').isHidden());assert(!/\bMario\b/.test(await p.locator('#welcome-line').innerText()));assert.match(await p.locator('#welcome-line').innerText(),/friend/);await photo(p,'unnamed-greeting');await finish(p);
  p=await fresh();await p.click('#welcome-play');await p.evaluate(()=>BW.pointerOpen('tree'));
  assert.deepEqual(await p.evaluate(()=>BW.pointerLeads()),[]);
  await p.click('#btn-zh');await p.click('#parent-skip');
  pass('mismatched dog lead omitted; parent skip immediately restores all inputs',{movementDx:await move(p),...await gather(p),joyDx:await joy(p),animal:await animal(p)});await finish(p);
  p=await fresh({width:768,height:1024});assert(await p.locator('#rotate').isVisible());await p.click('#welcome-play');pass('portrait soft hint permits keyboard without rotate OK',{dx:await move(p)});await finish(p);
  fs.writeFileSync(path.join(root,'screens/real-pointer-results.json'),JSON.stringify(results,null,2)+'\n');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{await browser?.close();server?.closeAllConnections();server?.close()});
