'use strict';
// Natural new worlds, original HTML bytes, visible screen clicks only.
// No seed, storageState, addInitScript, BW calls, HTML rewriting or coordinate probes.
// Coordinates were chosen by viewing fresh-world screenshots at these viewports.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),http=require('node:http'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),results=[],errors=[];
let browser,server;
(async()=>{
  const source=fs.readFileSync(process.env.BW_SOURCE||path.join(root,'index.html'));
  server=http.createServer((q,r)=>{r.setHeader('Content-Type','text/html; charset=utf-8');r.end(source)});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  browser=await chromium.launch({executablePath:process.env.CHROME||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});
  const url=process.env.BW_URL||'http://127.0.0.1:'+server.address().port;
  async function fresh(width=1000,height=360,dpr=1){
    const c=await browser.newContext({viewport:{width,height},deviceScaleFactor:dpr});
    const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));
    await p.goto(url);await p.locator('#btn-start').click();await p.locator('#welcome-play').click();return p;
  }
  async function snap(p,name){await p.screenshot({path:path.join(root,'screens',(process.env.BW_EXPECT_FAILURE?'baseline-':'')+name+'.png')});}
  async function visibleText(p,selector,text){await p.locator(selector).filter({hasText:text}).waitFor({state:'visible',timeout:12000});}
  async function levelOne(p,name){
    await visibleText(p,'#dialogue #chat-question','Listen and choose!');
    assert.equal(await p.locator('#chat-question').innerText(),'Listen and choose!');
    const labels=await p.locator('#chat-options button').allInnerTexts();
    assert.equal(labels.length,2);assert(labels.every(s=>s.trim()===''),'picture-only options');
    const text=await p.locator('#dialogue').innerText();
    assert(!/\b(tree|wood)\b/i.test(text),text);
    await snap(p,name);results.push({case:name,status:'PASS',text});
  }
  let p=await fresh();
  await snap(p,'v4r-dog-start');
  await p.mouse.click(150,254); // Dog's feet, ~270 CSS pixels left of the child.
  await snap(p,'v4r-dog-1-click');
  await p.waitForTimeout(500);await snap(p,'v4r-dog-2-walking');
  if(process.env.BW_EXPECT_FAILURE){
    await p.waitForTimeout(1400);await snap(p,'v4r-baseline-dog-still');
    assert.equal(await p.locator('#wordcard').isVisible(),false);
    await p.context().close();p=await fresh();await p.mouse.click(700,251);
    await p.waitForTimeout(2000);await snap(p,'v4r-baseline-tree-still');
    assert.equal(await p.locator('#hotbar button[aria-label="Wood"]').count(),0);
    console.log('EXPECTED baseline failures reproduced: dog foot and tree do nothing.');return;
  }
  await visibleText(p,'#toast:not([hidden])','Dog: 1/3 hearts');
  await p.waitForTimeout(180);await snap(p,'v4r-dog-3-heart');
  // Screen position seen on the arrival frame; no world-coordinate conversion.
  await p.mouse.click(505,235);await visibleText(p,'#toast:not([hidden])','Dog: 2/3 hearts');
  await snap(p,'v4r-dog-4-second');
  await p.mouse.click(505,235);await visibleText(p,'#toast:not([hidden])','Your pet follows you!');
  await snap(p,'v4r-dog-5-tamed');
  await p.keyboard.down('KeyD');await p.waitForTimeout(700);await snap(p,'v4r-dog-6-follow');
  await p.waitForTimeout(500);await p.keyboard.up('KeyD');await snap(p,'v4r-dog-7-follow');
  results.push({case:'natural dog feet, three pats, visible follow',status:'PASS',point:[150,254],distanceCSS:270});
  await p.context().close();
  p=await fresh();await snap(p,'v4r-tree-start');
  await p.mouse.click(700,251);await snap(p,'v4r-tree-1-click');
  assert.equal(await p.locator('#hotbar button[aria-label="Wood"]').count(),0,'no remote wood');
  await p.waitForTimeout(500);await snap(p,'v4r-tree-2-walking');
  await p.locator('#hotbar button[aria-label="Wood"]').waitFor({state:'visible',timeout:8000});
  assert.equal(await p.locator('#hotbar button[aria-label="Wood"] em').innerText(),'1');
  await snap(p,'v4r-tree-3-wood');
  results.push({case:'natural far tree, walk then Wood +1',status:'PASS',point:[700,251],distanceCSS:280});
  await levelOne(p,'v4r-level1-short');await p.context().close();
  p=await fresh(1440,900);await snap(p,'v4r-rabbit-start');
  await p.mouse.click(1100,640);await snap(p,'v4r-rabbit-1-click');
  await p.waitForTimeout(700);await snap(p,'v4r-rabbit-2-walking');
  await p.waitForTimeout(2200);await snap(p,'v4r-rabbit-3-jumping');
  await visibleText(p,'#wordcard:not([hidden]) #card-en','Rabbit');
  assert.equal(await p.locator('#hotbar button').count(),0,'crossing tree must not harvest it');
  await snap(p,'v4r-rabbit-4-heart');
  results.push({case:'natural rabbit feet across intact tree',status:'PASS',point:[1100,640],distanceCSS:495});
  await p.context().close();
  // Higher display density retains CSS-pixel hit testing and the same natural path.
  p=await fresh(1000,360,2);await p.mouse.click(700,251);
  await p.locator('#hotbar button[aria-label="Wood"]').waitFor({state:'visible',timeout:8000});
  await snap(p,'v4r-tree-dpr2');await levelOne(p,'v4r-level1-dpr2');await p.context().close();
  assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(root,'screens/natural-pointer-v4r-results.json'),JSON.stringify(results,null,2));
  console.log(JSON.stringify(results,null,2));
})().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{await browser?.close();server?.close()});
