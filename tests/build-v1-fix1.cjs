'use strict';
// Parent retest: original HTML, empty browser storage, mobile 844x390.
// All gameplay uses pointer input. No BW probes, init scripts, storage fixtures,
// forced clicks, clock manipulation, or blanket overlay dismissal.
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const evidenceRoot = process.env.BW_EVIDENCE_ROOT || root;
fs.mkdirSync(path.join(evidenceRoot,'screens'),{recursive:true});

async function run(browser) {
  const source = fs.readFileSync(process.env.BW_SOURCE || path.join(root, 'index.html'));
  const context = await browser.newContext({viewport:{width:844,height:390},isMobile:true,hasTouch:true});
  const frames = [], results = [], errors = [];
  let p;
  async function snap(seq, n) {
    const file = `screens/build-v1-fix1-${seq}-${String(n).padStart(2,'0')}.png`;
    await p.screenshot({path:path.join(evidenceRoot,file)}); frames.push(file);
  }
  async function noModal() {
    for (const id of ['dialogue','chat-shade','wordcard']) assert.equal(await p.locator('#'+id).isVisible(),false,id);
  }
  async function stock(n) { assert.equal(await p.locator('[data-build="planks"] small').innerText(),String(n)); }
  async function feedback(text) {
    // Check the same pointer action's result, not a bubble arriving after idle.
    await p.locator('#buddy-chat:not([hidden]) #buddy-line').filter({hasText:text}).waitFor({timeout:500});
    assert.equal(await p.locator('#buddy-line').innerText(),text);
    await noModal();
    assert.equal(await p.locator('#buddy-mic').isVisible(),false);
    assert.equal(await p.locator('#buddy-options button').count(),0);
    assert.equal(await p.locator('#buddy-chat').evaluate(e=>getComputedStyle(e).pointerEvents),'none');
    const box=await p.locator('#buddy-chat').boundingBox();
    assert(box.y+box.height<=164,'feedback stays in the HUD, above the placement rows');
  }
  async function fresh() {
    p=await context.newPage();
    p.on('pageerror',e=>errors.push(e.message));
    // A new origin gives each sequence genuinely empty storage.
    await p.goto('http://fix1-'+context.pages().length+'.test');
    await p.locator('#btn-start').click();
    await p.locator('#welcome-play').click();
  }
  try {
    await context.route(/http:\/\/fix1-\d+\.test\/?$/,r=>r.fulfill({contentType:'text/html; charset=utf-8',body:source}));
    await context.route('https://brain.yydriver.cn/**',r=>r.fulfill({contentType:'application/json',body:'{}'}));
    await fresh(); await snap('A',1);
    // The fresh-world right tree, then an actual recipe, never preloaded stock.
    await p.mouse.click(658,262);
    await p.locator('#hotbar button[aria-label="Wood"]').waitFor({timeout:12000});
    await snap('A',2);
    await p.locator('#btn-craft').click();
    await p.locator('#recipes .recipe').filter({has:p.locator('.out b',{hasText:/^Planks ×4$/})}).locator('.craftbtn').click();
    await snap('A',3);
    await p.locator('#craft-back').click();
    await p.locator('#btn-build').click();
    await p.locator('[data-build="planks"]').click(); await stock(4);
    // Deliberately let the natural plan appear. The next tap must replace it
    // despite its 25s bubble, 45s question and 8s silence timers.
    await p.locator('#buddy-options [data-word="house"]').waitFor({state:'visible',timeout:10000});
    await snap('A',4); await noModal();
    await p.mouse.click(126,224); await stock(3);
    await feedback('Nice start!'); await snap('A',5);
    results.push({case:'A: first placement immediately replaces a natural plan',status:'PASS'});

    await snap('B',1);
    for(const [i,x] of [164,202,240].entries()) {
      await noModal(); await p.mouse.click(x,224); await stock(2-i);
      assert.equal(await p.locator('#buddy-chat').isVisible(),false,'next placement folds the bubble away');
      await snap('B',i+2);
    }
    await p.mouse.click(278,224); await stock(0);
    await feedback('No more planks!'); await snap('B',5);
    await p.mouse.click(278,224); await feedback('No more planks!'); await snap('B',6);
    results.push({case:'B: depletion and repeated empty taps immediately explain the result',status:'PASS'});

    await fresh(); await snap('C',1);
    await p.mouse.click(658,262);
    await p.locator('#hotbar button[aria-label="Wood"] em').filter({hasText:/^1$/}).waitFor(); await p.waitForTimeout(700);
    await p.mouse.click(459,224);
    await p.locator('#hotbar button[aria-label="Wood"] em').filter({hasText:/^2$/}).waitFor(); await p.waitForTimeout(250);
    await p.mouse.click(459,262);
    await p.locator('#hotbar button[aria-label="Wood"] em').filter({hasText:/^3$/}).waitFor();
    await p.locator('#btn-craft').click();
    async function craft(label,times) {
      const button=p.locator('#recipes .recipe').filter({has:p.locator('.out b',{hasText:label})}).locator('.craftbtn');
      for(let i=0;i<times;i++) { assert(await button.evaluate(b=>b.classList.contains('ready'))); await button.click(); }
    }
    await craft(/^Planks ×4$/,3); await craft(/^Stick ×4$/,1); await craft(/^Fence ×2$/,4);
    await snap('C',2); await p.locator('#craft-back').click();
    await p.locator('#btn-build').click(); await p.locator('[data-build="fence"]').click();
    for(const [i,[x,y]] of [[164,224],[164,262],[164,300],[202,224],[240,224],[278,224],[278,262],[278,300]].entries()) {
      await p.mouse.click(x,y); await noModal();
      assert.equal(await p.locator('[data-build="fence"] small').innerText(),String(7-i),'fence '+i);
      if(i===2)await snap('C',3);
      if(i===6)await snap('C',4);
    }
    await snap('C',5);
    await p.locator('#buddy-line').filter({hasText:"Wow! It's all closed!"}).waitFor({timeout:7000}); await feedback("Wow! It's all closed!"); await snap('C',6);
    await p.getByRole('button',{name:'Show my building'}).waitFor({timeout:55000}); await snap('C',7);
    await p.getByRole('button',{name:'Show my building'}).click();
    assert.equal(await p.locator('#buddy-line').innerText(),'What is this?');
    assert.deepEqual(await p.locator('#buddy-options button').allTextContents(),['House','Fence']);
    await snap('C',8); await p.locator('#buddy-options [data-word="fence"]').click();
    for(const level of [2,3]) {
      await p.locator('#btn-zh').click();
      await p.locator('[data-build-level="'+level+'"]').click(); await snap('C',level===2?9:12);
      await p.locator('#parent-close').click();
      await p.locator('[data-build="fence"]').click(); await p.locator('#btn-buddy').click();
      await p.getByRole('button',{name:'Show my building'}).click();
      assert.equal(await p.locator('#buddy-line').innerText(),level===2?"What's this?":'I made a fence. Say it!');
      assert(await p.locator('#buddy-picture').isVisible()); await noModal();
      await snap('C',level===2?10:13);
      await p.locator('#buddy-options [data-word="fence"]').waitFor({timeout:10000});
      await p.locator('#buddy-options [data-word="fence"]').click(); await snap('C',level===2?11:14);
    }
    await p.locator('[data-build="fence"]').click(); await p.mouse.click(316,224);
    await feedback('No more fence!'); await stock(2); await snap('C',15);
    results.push({case:'C: harvested and crafted enclosure, cheer, Show and parent-selected levels 1/2/3',status:'PASS'});

    await fresh(); await snap('D',1);
    await p.mouse.click(658,262); await snap('D',2);
    await p.locator('#hotbar button[aria-label="Wood"]').waitFor({timeout:12000}); await snap('D',3);
    await p.locator('#dialogue:not([hidden]) #chat-question').waitFor({timeout:15000});
    assert.equal(await p.locator('#chat-question').innerText(),'What is this?');
    assert(await p.locator('#chat-picture').isVisible());
    const options=await p.locator('#chat-options button').allTextContents();
    assert.equal(options.length,2); assert(options.every(t=>t.trim()));
    await snap('D',4);
    results.push({case:'D: natural level-one encounter question',status:'PASS',prompt:'What is this?',options});

    await fresh(); await snap('E',1);
    assert.equal(await p.locator('#btn-zh').innerText(),'⚙');
    assert.equal(await p.locator('#btn-zh').getAttribute('aria-label'),'Parent settings');
    assert(!/\p{Script=Han}/u.test(await p.locator('body').innerText()));
    await p.locator('#btn-zh').click(); await snap('E',2);
    await p.locator('#parent-close').click(); await snap('E',3);
    assert(!/\p{Script=Han}/u.test(await p.locator('body').innerText()));
    results.push({case:'E: icon-only gear, Chinese confined to the parent panel',status:'PASS'});
    // Separate fresh saves for Build and ordinary placement reach, with real
    // crafting and visible stock checks. No inventory or cooldown setup.
    for(const mode of ['build','ordinary']) {
      await fresh(); await p.mouse.click(658,262);
      await p.locator('#hotbar button[aria-label="Wood"]').waitFor({timeout:12000});
      await p.waitForTimeout(700); await p.locator('#btn-craft').click();
      await craft(/^Planks ×4$/,1); await p.locator('#craft-back').click();
      if(mode==='build') {await p.locator('#btn-build').click();await p.locator('[data-build="planks"]').click();}
      else await p.locator('#hotbar button[aria-label="Planks"]').click();
      async function remaining(n) {await p.locator('#hotbar button[aria-label="Planks"] em').filter({hasText:new RegExp('^'+n+'$')}).waitFor({timeout:500});assert.equal(await p.locator('#hotbar button[aria-label="Planks"] em').innerText(),String(n));}
      await p.mouse.click(mode==='build'?78:240,186); await remaining(3);
      await snap('R',mode==='build'?1:5);
      await p.mouse.click(mode==='build'?40:202,186); await remaining(3);
      await p.mouse.click(278,224); await remaining(2);
      await p.mouse.click(240,224); await remaining(2);
      await p.locator('#toast').filter({hasText:'Move around the wall!'}).waitFor({timeout:500});
      await snap('R',mode==='build'?2:6);
      if(mode==='build') {
        await p.locator('[data-build="remove"]').click();await p.mouse.click(278,224);await remaining(3);
        await p.locator('[data-build="planks"]').click();await p.mouse.click(240,224);await remaining(2);
        assert.equal(await p.locator('#toast').isVisible(),false,'successful placement clears the previous wall warning');
        await snap('R',3);
        // An occupied square never consumes a second block.
        await p.mouse.click(240,224);await remaining(2);await snap('R',4);
      }
      results.push({case:'R: '+mode+' radius +1, outer limit, wall occlusion and stock safety',status:'PASS'});
    }
    assert.deepEqual(errors,[], 'no page errors');
    return {results,frames};
  } catch(error) {
    if(p)await p.screenshot({path:path.join(evidenceRoot,'screens/build-v1-fix1-failure.png')}).catch(()=>{});
    results.push({case:'run',status:'FAIL',error:String(error)}); throw error;
  } finally {
    await context.close();
    fs.writeFileSync(path.join(evidenceRoot,'screens/build-v1-fix1-results.json'),JSON.stringify({results,frames,errors},null,2)+'\n');
  }
}
module.exports=run;
if(require.main===module)(async()=>{
  const browser=await chromium.launch({executablePath:process.env.CHROME||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});
  try {console.log(JSON.stringify(await run(browser),null,2));} finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
