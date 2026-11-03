'use strict';
// Synthetic child only. Baseline probes the deployed module over SSH and records
// actual accepted provider JSON, never credentials. After uses public HTTPS + provenance.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs');
const { spawn } = require('node:child_process');
const { createInterface } = require('node:readline');
const assert = require('node:assert/strict');
const before = process.argv.includes('--before');
const html = fs.readFileSync(process.env.BW_HTML || require('node:path').resolve(__dirname,'../index.html'),'utf8');
const origin = 'https://tesla.yydriver.cn';
let ssh, browser, pending;
const records=[];
async function main() {
  if (before) {
    const code = `process.loadEnvFile('/opt/yangyang-brain/.env');
      const m=require('/opt/yangyang-brain/server.cjs'), fetchOriginal=global.fetch;
      let accepted=false, current;
      global.fetch=async(...args)=>{const r=await fetchOriginal(...args);try{const v=JSON.parse((await r.clone().json()).choices[0].message.content);if(m.validOutput(v,current))accepted=true;}catch{}return r;};
      const rl=require('node:readline').createInterface({input:process.stdin});
      rl.on('line',async line=>{try{current=m.normalize(JSON.parse(line));accepted=false;const start=Date.now();const reply=await m.buddy(current,m.config());console.log(JSON.stringify({reply,source:accepted?'brain':'template',ms:Date.now()-start}));}catch{console.log(JSON.stringify({error:'probe failed'}));}});`;
    ssh=spawn('ssh',['-i','/home/box/secure/ssh/settlement_ed25519','-o','IdentitiesOnly=yes','root@134.175.152.39','node -e '+"'"+code.replace(/'/g,"'\\''")+"'"]);
    ssh.stderr.on('data',()=>{});
    createInterface({input:ssh.stdout}).on('line',line=>{const fn=pending;pending=null;fn?.(JSON.parse(line));});
  }
  browser=await chromium.launch({executablePath:process.env.CHROMIUM||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});
  let fixture;
  for (let i=0;i<5;i++) {
    const ctx=await browser.newContext({viewport:{width:1180,height:720}}), p=await ctx.newPage();
    await p.route(origin+'/',r=>r.fulfill({contentType:'text/html',body:html}));
    await p.route('https://brain.yydriver.cn/buddy', async r=>{
      const payload=r.request().postDataJSON();
      let result;
      if(before) result=await new Promise(resolve=>{pending=resolve;ssh.stdin.write(JSON.stringify(payload)+'\n');});
      else {
        const start=Date.now(), res=await fetch(r.request().url(),{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify(payload)});
        assert.equal(res.status,200);
        result={reply:await res.json(),source:res.headers.get('x-buddy-source'),ms:Date.now()-start};
      }
      assert(['brain','template'].includes(result.source));
      records.push({encounter:i,tier:payload.tier,feedback:payload.feedback,source:result.source,ms:result.ms,say:result.reply.say});
      await r.fulfill({contentType:'application/json',headers:{'X-Buddy-Source':result.source,'Access-Control-Expose-Headers':'X-Buddy-Source'},body:JSON.stringify(result.reply)});
    });
    await p.addInitScript(data=>{
      if(data)localStorage.setItem('block-world-save-v1',JSON.stringify(data));
      Object.defineProperty(window,'speechSynthesis',{value:{getVoices:()=>[],cancel(){},speak(){},speaking:false}});
      window.SpeechRecognition=class {start(){window.recognizer=this;}abort(){this.onend?.();}};
    },fixture);
    await p.goto(origin+'/#seed=42'); await p.click('#btn-start');
    if(i===0) {
      fixture=await p.evaluate(()=>{BW.saveNow();return JSON.parse(localStorage.getItem('block-world-save-v1'));});
      fixture.words=['tree','wood'];if(!before)fixture.child_name='Alex';fixture.adventure={found:{},reviews:{},turns:0,scenes:{},levels:{},speaking:[]};
      fixture.progress.tree=0;fixture.mods=[];fixture.animals.forEach(a=>a[1]=7000);
    } else {
      await p.evaluate(()=>BW.hideCard());
      const pos=await p.evaluate(()=>BW.worldToScreen(87.5*32,15.5*32));await p.mouse.click(pos.x,pos.y);await p.evaluate(()=>BW.hideCard());
      await p.waitForFunction(()=>BW.adventure().active&&!BW.adventure().active.pending,null,{timeout:30000});
      if(!before&&i===4)await p.screenshot({path:'screens/ai-live-line.png'});
      await p.click('#chat-mic');
      await p.evaluate(()=>window.recognizer.onresult({resultIndex:0,results:[[{transcript:'tree'}]]}));
      await p.waitForFunction(()=>BW.adventure().active?.answered&&!BW.adventure().active.pending,null,{timeout:30000});
      if(!before){const stats=await p.evaluate(()=>BW.adventure().brain);const batch=records.filter(r=>r.encounter===i);assert.equal(stats.brain,batch.filter(r=>r.source==='brain').length);assert.equal(stats.template,batch.filter(r=>r.source==='template').length);}
      fixture.adventure.levels.tree={t1:2,t2:i>=2?2:0,t3:0};
    }
    await ctx.close();
  }
  const brain=records.filter(r=>r.source==='brain').length, template=records.length-brain;
  const summary={mode:before?'before':'after',encounters:4,brain,template,ratio:`${brain}/${records.length}`,brainPercent:100*brain/records.length,records};
  fs.mkdirSync('screens',{recursive:true});fs.writeFileSync(`screens/brain-ratio-${summary.mode}.json`,JSON.stringify(summary,null,2)+'\n');
  console.log(JSON.stringify(summary,null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{ssh?.stdin.end();ssh?.kill();await browser?.close();});
