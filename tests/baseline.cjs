// Test-side routing renders the original revision without changing branches or index.html.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict');
(async()=>{
const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1180,height:720}});
await page.route('http://127.0.0.1:19273/', r=>r.fulfill({contentType:'text/html',body:require('node:child_process').execFileSync('git',['show','e953c91:index.html'],{encoding:'utf8',cwd:require('node:path').resolve(__dirname,'..')})}));
const errors=[];page.on('pageerror',e=>errors.push(String(e)));
await page.goto('http://127.0.0.1:19273/#seed=42');await page.click('#btn-start');await page.waitForTimeout(350);
async function state(){return page.evaluate(()=>({p:BW.player(),ch:BW.ch3(),inv:BW.inv(),err:BW.error()}));}
async function worldClick(x,y){const s=await page.evaluate(([x,y])=>BW.worldToScreen(x,y),[x,y]);await page.mouse.click(s.x,s.y);}
for(let i=0;i<3;i++){let a=await page.evaluate(()=>BW.animals().find(a=>a.type==='dog'));await worldClick(a.x,a.y-16);await page.waitForTimeout(150);}
assert.deepEqual((await state()).ch.pet,['dog']);
let startDog=await page.evaluate(()=>BW.animals().find(a=>a.type==='dog').x);
await page.keyboard.down('ArrowRight');await page.waitForTimeout(1600);await page.keyboard.up('ArrowRight');await page.waitForTimeout(700);
assert((await page.evaluate(()=>BW.animals().find(a=>a.type==='dog').x))>startDog+80);
await page.screenshot({path:require('node:path').resolve(__dirname,'../screens/baseline-pet.png')});
// Seed a saved checkpoint beside the original pond, with tools; exercise chains by input.
const fixture=await page.evaluate(()=>{BW.saveNow();let d=JSON.parse(localStorage.getItem('block-world-save-v1'));d.px=120*32-35;d.py=512;d.inv.rod=1;d.inv.boat=1;d.hotbar.push('rod','boat');return d;});
await page.addInitScript(d=>localStorage.setItem('block-world-save-v1',JSON.stringify(d)),fixture);
await page.reload();await page.click('#btn-start');await page.waitForTimeout(350);await page.evaluate(()=>{BW.hideCard();BW.select('rod')});await worldClick(120*32+16,528);await page.waitForTimeout(100);assert((await state()).ch.fishing);
await page.waitForTimeout(2900);assert.equal((await state()).ch.fish,1);assert.equal((await state()).inv.fish,1);await page.screenshot({path:require('node:path').resolve(__dirname,'../screens/baseline-fishing.png')});
await page.evaluate(()=>BW.select('boat'));await worldClick(120*32+16,528);assert((await state()).ch.boat);await page.waitForTimeout(100);let b=(await state()).ch.boat;await worldClick(b.x,b.y-8);assert((await state()).ch.riding);
await page.keyboard.down('ArrowRight');await page.waitForTimeout(2600);await page.keyboard.up('ArrowRight');let crossed=await state();console.log('boat crossed',crossed);assert(crossed.ch.boat.x>132*32);await page.keyboard.press('Space');await page.waitForTimeout(850);console.log('landed',await state());assert(!(await state()).ch.riding);assert((await state()).p.x>133*32);await page.screenshot({path:require('node:path').resolve(__dirname,'../screens/baseline-boat.png')});
assert.equal((await state()).err,'');assert.deepEqual(errors,[]);console.log('BASELINE PASS: real pointer tame/follow, cast/wait catch, place/board/steer/disembark; seeded pond position and tools.');await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
