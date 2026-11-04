'use strict';
// Byte-for-byte HTML, no response rewriting or injected runtime hooks.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),http=require('node:http'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'..'),source=fs.readFileSync(process.env.BW_SOURCE||path.join(root,'index.html'));
let browser,server;const results=[];
(async()=>{
server=http.createServer((q,r)=>{r.setHeader('Content-Type','text/html');r.end(source)});await new Promise(r=>server.listen(0,'127.0.0.1',r));
browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});
const url='http://127.0.0.1:'+server.address().port;
async function page(save){const c=await browser.newContext({viewport:{width:1440,height:900},...(save?{storageState:{cookies:[],origins:[{origin:url,localStorage:[{name:'block-world-save-v1',value:JSON.stringify(save)}]}]}}:{})});const p=await c.newPage();await p.goto(url+'/#seed=42');await p.click('#btn-start');await p.click('#welcome-play');return p;}
async function saved(p){return p.evaluate(()=>{BW.saveNow();return JSON.parse(localStorage.getItem('block-world-save-v1'))})}
async function snap(p,name){await p.screenshot({path:path.join(root,'screens',name+'.png')})}
let p=await page();let fixture=await saved(p);await p.context().close();
for(const type of ['cow','dog','sheep','rabbit']){
const s=structuredClone(fixture);s.px=2500;s.py=512;s.animals=[[type,2288,511.99,1,0]];s.name_asked=true;
p=await page(s);const before=await p.evaluate(()=>BW.player().x);
// Foot-cell edge deliberately outside the former radius; also test the drawn body.
const point=await p.evaluate(t=>{const a=BW.animals().find(a=>a.type===t);return BW.worldToScreen(a.x+31,a.y+6)},type);await p.mouse.click(point.x,point.y);
await p.waitForFunction(x=>Math.abs(BW.player().x-x)>20,before,{timeout:3000}).catch(async e=>{console.log('miss',type,point,await p.evaluate(()=>({player:BW.player(),animals:BW.animals(),card:BW.card()})));await snap(p,process.env.BW_SOURCE?'v4-baseline-foot-cell-failure':'v4-pointer-failure');throw e});
await p.waitForFunction(t=>BW.card().toLowerCase()===t,type,{timeout:10000}).catch(async e=>{console.log(type,await saved(p),await p.evaluate(()=>BW.adventure()));await snap(p,'v4-failure');throw e});
let state=await saved(p);assert.equal(state.progress.tapped[type],1);
await snap(p,'v4-'+type+'-hearts');
if(type==='dog'){
for(let i=0;i<2;i++){const a=await p.evaluate(()=>{const a=BW.animals().find(a=>a.type==='dog');return BW.worldToScreen(a.x,a.y-24)});await p.mouse.click(a.x,a.y);await p.waitForTimeout(150);}
assert((await p.evaluate(()=>BW.ch3().pet)).includes('dog'));
const x=await p.evaluate(()=>BW.animals().find(a=>a.type==='dog').x);await p.keyboard.down('KeyD');await p.waitForTimeout(700);await p.keyboard.up('KeyD');await p.waitForTimeout(700);assert(Math.abs(await p.evaluate(()=>BW.animals().find(a=>a.type==='dog').x)-x)>20);await snap(p,'v4-dog-follow');
}
results.push({type,status:'PASS',walk:state.px-before});await p.context().close();}
for(const [id,key] of [[4,'wood'],[3,'stone'],[19,'wheat']]){
const s=structuredClone(fixture);s.mods=[15*240+87,id];
p=await page(s);const target=await p.evaluate(()=>({screen:BW.worldToScreen(2800,496)}));const x=await p.evaluate(()=>BW.player().x),before=(await p.evaluate(k=>BW.inv()[k],key))||0;
await p.mouse.click(target.screen.x,target.screen.y);assert.equal((await p.evaluate(k=>BW.inv()[k],key))||0,before,'no remote harvest');await p.waitForFunction(({key,before})=>(BW.inv()[key]||0)>before,{key,before},{timeout:14000});assert(Math.abs(await p.evaluate(()=>BW.player().x)-x)>20);await snap(p,'v4-walk-harvest-'+key);results.push({harvest:key,status:'PASS'});await p.context().close();}
// Ten naturally queued gift questions, randomized learned-word order. No openChat hook.
for(let i=0;i<10;i++){
const s=structuredClone(fixture);s.px=2128;s.py=512;s.adventure=null;s.words=['tree','sheep','wood','wool','dog','flower'].sort(()=>Math.random()-.5);s.name_asked=true;
p=await page(s);await p.waitForFunction(()=>BW.adventure().active&&!BW.adventure().active.pending,null,{timeout:20000});const d=await p.evaluate(()=>BW.adventure().active);assert.equal(d.tier,1);const text=await p.locator('#chat-question').innerText();assert.equal(text,'What is this?');assert(await p.locator('#chat-picture').isVisible());assert.equal(await p.locator('#chat-options button').count(),2);assert(!new RegExp('\\b'+d.key+'\\b','i').test(text),text);results.push({question:i,target:d.key,text,status:'PASS'});if(i===0)await snap(p,'v4-level1');await p.context().close();}
fs.writeFileSync(path.join(root,'screens/raw-pointer-v4-results.json'),JSON.stringify(results,null,2));console.log(results);
})().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{await browser?.close();server?.close()});
