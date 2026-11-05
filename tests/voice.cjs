'use strict';
// Actual Chromium MP3 decoding/playback, local HTTP brain, synthetic fallback TTS.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {createServer,template,normalize,audioHash,contextLeads}=require('../brain/server.cjs');
const root=path.resolve(__dirname,'..');let browser,front,brain,origin,endpoint;
async function listen(s){await new Promise(r=>s.listen(0,'127.0.0.1',r));return 'http://127.0.0.1:'+s.address().port;}
async function close(s){if(s){s.closeAllConnections();await new Promise(r=>s.close(r));}}
(async()=>{
  let html;
  front=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end(html)});origin=await listen(front);
  brain=createServer({key:'',origins:[origin]});endpoint=await listen(brain);
  html=fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/^const BRAIN_URL = '[^']*';$/m,'const BRAIN_URL = '+JSON.stringify(endpoint+'/buddy')+';')
    .replace('ready: true,',`ready: true, voiceSay:speakEn, voiceStop:cancelEnAudio, voiceIndex:()=>voiceIndex,
      voiceOpen:()=>{learn('dog');learn('tree');rememberEvent('met','dog');openChat({anchor:'pet',key:'dog'});},`);
  browser=await chromium.launch({executablePath:process.env.CHROMIUM||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
  const p=await browser.newPage({viewport:{width:1180,height:720}}),errors=[];p.on('pageerror',e=>errors.push(String(e)));
  await p.context().grantPermissions(['local-network-access']);
  await p.route(endpoint+'/buddy',async route=>{
    const q=normalize(route.request().postDataJSON()),reply=template(q);
    if(q.event==='pet' && contextLeads(q).length)reply.say=contextLeads(q)[0]+' '+reply.say;
    const hash=audioHash(reply.say);if(fs.existsSync(path.join(root,'brain/audio',hash+'.mp3')))reply.audio_url=endpoint+'/audio/'+hash+'.mp3';
    await route.fulfill({contentType:'application/json',body:JSON.stringify(reply)});
  });
  await p.addInitScript(()=>{window.spoken=[];Object.defineProperty(window,'speechSynthesis',{value:{getVoices:()=>[],cancel(){},speak(u){spoken.push({text:u.text,rate:u.rate})},speaking:false}})});
  await p.goto(origin+'/#seed=42');await p.click('#btn-start');
  await p.waitForFunction(()=>BW.adventure().brain.audio>0);
  assert.equal(await p.evaluate(()=>spoken.length),0);await p.click('#welcome-play');
  await p.waitForFunction(()=>Object.keys(BW.voiceIndex()).length>=100);
  const hash=audioHash('Dog');
  const start=await p.evaluate(()=>BW.adventure().brain.audio);
  await p.evaluate(()=>BW.voiceSay('Dog'));await p.waitForFunction(n=>BW.adventure().brain.audio>n,start);
  assert.equal(await p.evaluate(()=>spoken.length),0);
  // Decode 20 actual generated MP3s. This proves valid media, not human listening quality.
  const samples=Object.entries(JSON.parse(fs.readFileSync(path.join(root,'brain/audio/index.json'),'utf8'))).slice(0,20);
  const decoded=await p.evaluate(async({samples,endpoint})=>{
    const ac=new AudioContext(),out=[];
    for(const [text,hash]of samples){const r=await fetch(endpoint+'/audio/'+hash+'.mp3'),b=await ac.decodeAudioData(await r.arrayBuffer());if(!Number.isFinite(b.duration)||b.duration<=.1)throw Error('Invalid MP3');out.push({text,seconds:b.duration});}
    await ac.close();return out;
  },{samples,endpoint});
  // Missing media falls back once, and preserves the intended line/rate.
  await p.evaluate(url=>BW.voiceSay('Dog',{audio_url:url}),endpoint+'/audio/'+'0'.repeat(20)+'.mp3');
  await p.waitForFunction(()=>spoken.length===1);assert.deepEqual(await p.evaluate(()=>spoken[0]),{text:'Dog',rate:0.8199999928474426});
  const namedBefore=await p.evaluate(()=>spoken.length);await p.evaluate(()=>BW.voiceSay('Hi Unique Name. Let us play!',{named:true}));assert.equal(await p.evaluate(()=>spoken.length),namedBefore);
  // Untrusted/off-origin URL cannot play audio.
  await p.evaluate(()=>BW.voiceSay('Dog',{audio_url:'https://untrusted.invalid/audio/12345678901234567890.mp3'}));assert.equal(await p.evaluate(()=>spoken.at(-1).text),'Dog');
  // Cancellation prevents an asynchronous play rejection from speaking after a card closes.
  await p.evaluate(url=>{const NativeAudio=window.Audio;window.Audio=class{play(){return new Promise((_,reject)=>setTimeout(()=>reject(Error('autoplay')),100))}pause(){}};BW.voiceSay('Dog',{audio_url:url});BW.voiceStop();window.Audio=NativeAudio;},endpoint+'/audio/'+hash+'.mp3');
  const count=await p.evaluate(()=>spoken.length);await p.waitForTimeout(180);assert.equal(await p.evaluate(()=>spoken.length),count);
  const exerciseTts=await p.evaluate(()=>spoken.length),exerciseAudio=await p.evaluate(()=>BW.adventure().brain.audio);
  await p.evaluate(()=>BW.voiceOpen());await p.waitForFunction(()=>!BW.adventure().active.pending);
  assert(await p.locator('#chat-picture').isVisible());assert.equal((await p.evaluate(()=>BW.adventure().active)).key,'dog');
  // Tier one uses the safe question atom, without a context lead that reveals the answer.
  assert.equal(await p.locator('#chat-question').innerText(),'What is this?');
  await p.waitForFunction(n=>BW.adventure().brain.audio>=n+1,exerciseAudio);
  assert.equal(await p.evaluate(()=>spoken.length),exerciseTts);
  await p.click('#btn-zh');assert.match(await p.locator('#brain-status').innerText(),/预生成音频 [1-9].*合成回落 [1-9]/);
  await p.screenshot({path:path.join(root,'screens/voice-parent-sources.png')});
  assert.deepEqual(errors,[]);
  const result={status:'PASS',decoded,stats:await p.evaluate(()=>BW.adventure().brain),checks:['actual MP3 playback before TTS','20 MP3 decode checks','404 fallback once at rate .82','named TTS forbidden','off-origin rejection','late rejection canceled','safe L1 prompt audio metadata accepted','parent source counters']};
  fs.writeFileSync(path.join(root,'screens/voice-results.json'),JSON.stringify(result,null,2)+'\n');
  console.log('PASS voice playback, fallback, cancellation, names, validation, source stats, 20 MP3 decodes');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{await browser?.close();await close(brain);await close(front)});
