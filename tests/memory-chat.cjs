'use strict';
// Synthetic speech and local HTTP only; no real child data or provider account.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {normalize,template,conversationLines}=require('../brain/server.cjs');
const source=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const origin='http://127.0.0.1:19273';
let browser;
async function page({data,online=false,bad=false,hang=false,autoWeather=false,viewport={width:1180,height:720},file=false,reduced=false}={}) {
  const ctx=await browser.newContext({viewport,hasTouch:true,reducedMotion:reduced?'reduce':'no-preference'}),p=await ctx.newPage();p.errors=[];p.calls=[];
  p.on('pageerror',e=>p.errors.push(String(e)));
  await p.clock.install({time:new Date('2026-11-03T09:00:00Z')});
  const html=source.replace(/^const BRAIN_URL = '[^']*';$/m,'const BRAIN_URL = '+JSON.stringify(online?origin+'/mock-buddy':'')+';')
    .replace('Math.random() < 0.3','Math.random() < '+(autoWeather?'1':'0'))
    .replace('ready: true,',`ready: true, testLines: conversationLines, testEvent: rememberEvent, testOpen: () => openChat({anchor:'scene',key:'tree'}), testMode: determineMode,
      testClose: () => closeChat(true), testWords: () => Array.from(WORDS),
      testWeatherPicture: weather => showAmbient(Object.assign(socialPayload('weather_chat'), {weather:weather})),
      testWeatherKey: (night, stars, cloudy) => { timeOfDay=night?0.8:0.3; starPos=stars?[{}]:[]; sunPos={x:50,y:50}; cloudPos=cloudy?[{x:50,y:50,scale:1}]:[]; return weatherKey(); },
      testRainbow: () => { const c=document.createElement('canvas'); c.width=viewW; c.height=viewH; drawRainbow(c.getContext('2d')); return {left:rainbowLeft,pixels:c.getContext('2d').getImageData(0,0,c.width,c.height).data.some(v=>v!==0)}; },`);
  await p.route(origin+'/',r=>r.fulfill({contentType:'text/html',body:html}));
  await p.route('**/mock-buddy',async r=>{
    const q=r.request().postDataJSON();p.calls.push(q);if(hang&&q.event!=='greet')return;
    const value=template(normalize(q));if(bad&&q.event!=='greet')value.say='你好! Say dragon!';
    await r.fulfill({contentType:'application/json',headers:{'X-Buddy-Source':'brain','X-Buddy-Reason':'validated'},body:JSON.stringify(value)}).catch(()=>{});
  });
  await p.addInitScript(data=>{
    if(data&&!sessionStorage.getItem('fixture')) {localStorage.setItem('block-world-save-v1',JSON.stringify(data));sessionStorage.setItem('fixture','1');}
    window.spoken=[];
    Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{getVoices:()=>[],cancel(){},speak(u){spoken.push(u.text);window.lastUtterance=u;},speaking:false}});
    window.SpeechRecognition=class {start(){window.recognizer=this;if(window.failListen)throw Error("synthetic start failure");this.onstart?.();}abort(){this.onend?.();}};
    window.voiceResult=text=>{const r=window.recognizer;r.onresult?.({resultIndex:0,results:[[{transcript:text}]]});r.onend?.();};
  },data);
  if(file)await ctx.setOffline(true);
  await p.goto(file?'file://'+path.join(__dirname,'../index.html')+'#seed=42':origin+'/#seed=42');
  if(await p.locator('#btn-portrait').isVisible())await p.click('#btn-portrait');
  await p.click('#btn-start');return p;
}
async function saved(p){return p.evaluate(()=>{BW.saveNow();return JSON.parse(localStorage.getItem('block-world-save-v1'));});}
async function done(p){assert.deepEqual(p.errors,[]);assert.equal(await p.evaluate(()=>BW.error()),'');await p.context().close();}
async function dismiss(p){if(await p.locator('#welcome').isVisible())await p.click('#welcome-play');}
async function photo(p,name){await p.screenshot({path:path.join(__dirname,'../screens/'+name+'.png')});}
async function mic(p,id,on){
 assert.equal(await p.locator('#'+id).evaluate(e=>e.classList.contains('mic-recording')),on);
 if(on){assert.equal(await p.locator('#'+id).evaluate(e=>getComputedStyle(e).opacity),'1');assert.equal(await p.locator('#'+id).evaluate(e=>getComputedStyle(e).animationName),'mic-pulse');}
}
const report=s=>console.log('PASS',s);
(async()=>{
 browser=await chromium.launch({executablePath:process.env.CHROMIUM||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});
 let p=await page({viewport:{width:390,height:844}});
 assert.equal(await p.evaluate(()=>BW.adventure().mode),'name_ask');
 assert.equal(await p.locator('#welcome-line').innerText(),'Hi! What is your name?');
 const before=await p.evaluate(()=>BW.player().x);await p.keyboard.press('ArrowRight');
 assert.equal(await p.evaluate(()=>BW.player().x),before);assert(await p.locator('#name-entry').isVisible());
 await photo(p,'name-ask');
 for(const end of ['onend','onerror','timeout','failure']) {
   await p.evaluate(end=>window.failListen=end==='failure',end);await p.click('#name-mic');
   if(end!=='failure'){await mic(p,'name-mic',true);if(end==='timeout')await p.clock.fastForward(8001);else await p.evaluate(end=>recognizer[end]?.(),end);}
   await mic(p,'name-mic',false);
 }
 await p.evaluate(()=>window.failListen=false);
 await p.click('#name-mic');await mic(p,'name-mic',true);await p.evaluate(()=>voiceResult('Sam'));await mic(p,'name-mic',false);await p.fill('#name-input','');

 for(const letter of ['S','A','M'])await p.getByRole('button',{name:letter,exact:true}).click();
 assert.equal(await p.inputValue('#name-input'),'SAM');await p.click('#name-mic');await mic(p,'name-mic',true);await p.fill('#name-input','Sam');await p.click('#name-form button[type=submit]');
 let data=await saved(p);assert.equal(data.child_name,'Sam');assert.equal(data.name_asked,true);assert.match(await p.locator('#welcome-line').innerText(),/Hi Sam\./);
 assert.equal(await p.evaluate(()=>BW.adventure().mode),'greet');await mic(p,'name-mic',false);await done(p);
 p=await page({data});assert(await p.locator('#name-entry').isHidden());assert.match(await p.locator('#welcome-line').innerText(),/Sam/);await done(p);
 report('first visit blocks only the name flow; letter taps + keyboard save one name; return greet uses it');
 p=await page();await p.clock.fastForward(10001);assert.equal(await p.locator('#name-hint').innerText(),'You can say it or tap!');assert(await p.locator('#name-hint').isVisible());
 await p.clock.fastForward(10000);assert.equal((await saved(p)).name_asked,false);await p.clock.fastForward(10000);assert.equal((await saved(p)).name_asked,true);assert.equal((await saved(p)).child_name,'Mario');assert.equal(await p.evaluate(()=>BW.adventure().mode),'greet');await done(p);
 // Even a value changed without an input event must survive the timeout.
 p=await page();await p.evaluate(()=>document.getElementById('name-input').value='Jo');await p.clock.fastForward(30001);assert.equal((await saved(p)).child_name,'Jo');await done(p);
 p=await page();await p.clock.fastForward(25000);await p.getByRole('button',{name:'S',exact:true}).click();await p.clock.fastForward(10000);assert.equal((await saved(p)).name_asked,false);
 await p.fill('#name-input','Sam');await p.clock.fastForward(25000);assert.equal((await saved(p)).name_asked,false);await p.clock.fastForward(5001);assert.equal((await saved(p)).child_name,'Sam');await done(p);
 p=await page();await p.clock.fastForward(25000);await p.click('#name-mic');await p.clock.fastForward(10000);assert.equal((await saved(p)).name_asked,false);
 await p.click('#name-mic');await p.evaluate(()=>voiceResult('My name is Luca'));assert.equal(await p.inputValue('#name-input'),'Luca');assert.equal((await saved(p)).child_name,'Mario');assert.equal((await saved(p)).name_asked,false);
 // Neither the old timeout nor a failed second mic attempt may confirm ASR.
 await p.click('#name-mic');await p.clock.fastForward(30001);assert.equal((await saved(p)).name_asked,false);assert(await p.locator('#name-entry').isVisible());
 await p.fill('#name-input','Luka');await p.click('#name-form button[type=submit]');assert.equal((await saved(p)).child_name,'Luka');assert.equal((await saved(p)).name_asked,true);await done(p);
 p=await page();await p.click('#btn-zh');await p.fill('#parent-name','Alex');assert.equal((await saved(p)).name_asked,true);assert.match(await p.locator('#welcome-line').innerText(),/Alex/);await done(p);
 p=await page({data:{...data,child_name:'Emma',name_asked:false}});assert.equal(await p.evaluate(()=>BW.adventure().mode),'greet');await done(p);
 report('30-second default preserves typed names; letters, typing and mic reset it; 10-second hint and editable ASR require confirmation');
 p=await page({data});await dismiss(p);await p.click('#btn-buddy');
 assert.equal(await p.locator('#buddy-line').innerText(),'Do you like cat or dog?');
 assert.deepEqual(await p.locator('#buddy-options button').allTextContents(),['cat','dog']);
 const x=await p.evaluate(()=>BW.player().x);await p.keyboard.down('ArrowRight');await p.waitForTimeout(200);await p.keyboard.up('ArrowRight');assert((await p.evaluate(()=>BW.player().x))>x);
 await photo(p,'small-talk');await p.getByRole('button',{name:'dog',exact:true}).click();
 assert.equal((await saved(p)).prefs.animal,'dog');assert.equal(await p.locator('#buddy-line').innerText(),'Try: I see a dog!');await photo(p,'coach');
 assert.equal((await saved(p)).adventure.speaking.length,0);
 await p.click('#buddy-close');await p.click('#btn-buddy');assert.match(await p.locator('#buddy-line').innerText(),/house or table/);await p.click('#buddy-close');
 await p.click('#btn-buddy');assert.match(await p.locator('#buddy-line').innerText(),/fish or wheat/);await p.click('#buddy-close');
 await p.click('#btn-buddy');await p.click('#buddy-close');await p.click('#btn-buddy');await p.click('#buddy-close');
 assert.equal((await saved(p)).small_talk_count,5);const limitedSpoken=await p.evaluate(()=>spoken.length);await p.click('#btn-buddy');assert(await p.locator('#buddy-chat').isHidden());
 assert.equal(await p.locator('#btn-buddy').evaluate(el=>getComputedStyle(el).animationName),'buddy-wave');assert.equal(await p.evaluate(()=>spoken.length),limitedSpoken);assert.equal((await saved(p)).small_talk_count,5);
 await p.clock.fastForward(700);await p.click('#btn-buddy');assert.equal(await p.locator('#btn-buddy').evaluate(el=>getComputedStyle(el).animationName),'buddy-wave');
 data=await saved(p);await p.reload();await p.click('#btn-start');await dismiss(p);assert.equal(await p.evaluate(()=>BW.smallTalk()),false);
 await p.click('#btn-zh');assert.match(await p.locator('#parent-memory').innerText(),/dog.*5\/5/);await p.click('#parent-close');await done(p);
 report('preference chips save whitelist values and coach; unanswered slots never re-ask; chat stays nonblocking and caps at five across reload');
 const tomorrow={...data,chat_day:'2026-11-02',weather_chat_done:true};
 p=await page({data:tomorrow});assert.equal((await saved(p)).small_talk_count,0);assert.equal((await saved(p)).weather_chat_done,false);await dismiss(p);await p.evaluate(()=>BW.setRain(true));assert(await p.evaluate(()=>BW.weatherChat()));assert.equal(await p.locator('#buddy-line').innerText(),'Look! I see the rain!');assert(await p.locator('#buddy-picture').isVisible());assert.equal(await p.locator('#buddy-picture').getAttribute('aria-label'),'Rain');
 assert(await p.locator('#buddy-picture').evaluate(c=>c.getContext('2d').getImageData(0,0,128,128).data.some(v=>v!==0)));
 await photo(p,'weather-chat');
 await p.click('#buddy-close');assert.equal(await p.evaluate(()=>BW.weatherChat()),false);const weatherData=await saved(p);
 assert.deepEqual(await p.evaluate(()=>[BW.testWeatherKey(false,false,false),BW.testWeatherKey(false,false,true)]),['rain','rain']);
 await p.evaluate(()=>{BW.setTime(0.3);BW.setRain(false);});await p.clock.runFor(1400);
 assert((await p.evaluate(()=>BW.testRainbow())).pixels);await photo(p,'weather-rainbow');
 const weatherKeys=await p.evaluate(()=>[BW.testWeatherKey(false,false,true),BW.testWeatherKey(false,false,false),BW.testWeatherKey(true,true,false),BW.testWeatherKey(true,true,false),BW.testWeatherKey(true,false,false)]);
 assert.deepEqual(weatherKeys,['cloud','sun','star','moon','moon']);assert.equal(await p.evaluate(()=>BW.totalWords()),42);
 for(const weather of ['rain',...weatherKeys]){assert((await p.evaluate(()=>BW.testWords())).includes(weather));const q=normalize({event:'weather_chat',weather,time_of_day:'evening'});const lines=await p.evaluate(q=>BW.testLines(q),q);assert.deepEqual(lines,conversationLines(q));for(const line of lines){assert(line.split(/\s+/).length>=3&&line.split(/\s+/).length<=6);assert(!/rainbow/i.test(line));}}
 for(const weather of ['sun','cloud','moon','star']){await p.evaluate(weather=>BW.testWeatherPicture(weather),weather);assert(await p.locator('#buddy-picture').isVisible());assert.equal(await p.locator('#buddy-picture').getAttribute('aria-label'),weather[0].toUpperCase()+weather.slice(1));assert(await p.locator('#buddy-picture').evaluate(c=>c.getContext('2d').getImageData(0,0,128,128).data.some(v=>v!==0)));}
 await p.click('#buddy-close');
 assert.equal((await p.evaluate(()=>BW.testRainbow())).pixels,false); // Hidden at deep night.
 await p.evaluate(()=>BW.setTime(0.3));await p.clock.runFor(17000);assert.equal((await p.evaluate(()=>BW.testRainbow())).pixels,false);
 await p.evaluate(()=>{BW.setRain(true);BW.setRain(false);});await p.clock.runFor(1400);assert((await p.evaluate(()=>BW.testRainbow())).pixels);
 await p.evaluate(()=>BW.setRain(true));assert.equal((await p.evaluate(()=>BW.testRainbow())).left,0);await done(p);
 p=await page({data:weatherData});await dismiss(p);assert.equal(await p.evaluate(()=>BW.weatherChat()),false);await done(p);
 p=await page({data:{...tomorrow,chat_day:'2026-11-03',small_talk_count:0,weather_chat_done:false},autoWeather:true});await dismiss(p);await p.clock.fastForward(501);assert(await p.locator('#buddy-chat').isVisible());assert.equal((await saved(p)).weather_chat_done,true);await done(p);
 report('local calendar resets counters; weather matches rain, runs after greet and persists once per day');
 p=await page({data:{...tomorrow,chat_day:'2026-11-03',small_talk_count:0,weather_chat_done:false}});await dismiss(p);
 await p.evaluate(()=>BW.testEvent('built','house'));assert.equal((await saved(p)).prefs.build,'house');
 await p.click('#btn-buddy');assert.equal(await p.locator('#buddy-options button').count(),0);await p.click('#buddy-mic');await p.evaluate(()=>voiceResult('a cat'));assert.equal(await p.locator('#buddy-line').innerText(),'I can see a cat!');
 await p.evaluate(()=>BW.recast('I see a cat'));assert.equal(await p.locator('#buddy-line').innerText(),'Good job! Well done!');
 await p.evaluate(()=>BW.recast('dragon'));assert.equal(await p.locator('#buddy-line').innerText(),'Good try! Say it again!');
 await p.evaluate(()=>lastUtterance.onend());await p.clock.fastForward(8001);assert(await p.locator('#buddy-chat').isVisible());await p.clock.fastForward(1000);assert(await p.locator('#buddy-chat').isHidden());
 for(const word of ['hello','jump','follow','pet','home']) {await p.evaluate(word=>BW.recast(word),word);assert.equal(await p.locator('#buddy-line').innerText(),'Good try! Say it again!');}
 await p.evaluate(()=>BW.recast('rod'));assert.equal(await p.locator('#buddy-line').innerText(),'Try: I see a fishing rod!');
 await p.evaluate(()=>lastUtterance.onend());await p.clock.fastForward(8001);await p.click('#buddy-mic');await p.evaluate(()=>voiceResult('a cat'));assert.equal(await p.locator('#buddy-line').innerText(),'I can see a cat!');
 await p.evaluate(()=>lastUtterance.onend());await p.clock.fastForward(3001);assert(await p.locator('#buddy-chat').isHidden());
 await p.evaluate(()=>BW.give('tree',1));await p.evaluate(()=>BW.give('wood',1));await p.evaluate(()=>BW.testOpen());
 assert.equal(await p.evaluate(()=>BW.smallTalk()),false);assert.equal(await p.evaluate(()=>BW.weatherChat()),false);assert.equal(await p.evaluate(()=>BW.recast('cat')),false);assert(await p.locator('#buddy-chat').isHidden());
 assert.equal(await p.locator('#btn-buddy').evaluate(el=>getComputedStyle(el).animationName),'buddy-wave');assert(await p.locator('#dialogue').isVisible());
 await p.reload();await p.click('#btn-start');assert.equal(await p.evaluate(()=>BW.adventure().active),null);await done(p);
 report('noun-only recasts label fishing rod; tier-1 mic works eight seconds after TTS, closes at nine; gated Buddy waves silently');
 const fresh={...data,small_talk_count:0,prefs:{},prefsLearnedAt:{}};
 p=await page({data:fresh,online:true});await dismiss(p);await p.click('#btn-buddy');await p.waitForFunction(()=>BW.adventure().brain.brain>=1);assert(p.calls.some(q=>q.event==='small_talk'));assert.equal(await p.locator('#buddy-line').innerText(),'Do you like cat or dog?');await done(p);
 p=await page({data:fresh,online:true,bad:true});await dismiss(p);await p.click('#btn-buddy');await p.waitForFunction(()=>BW.adventure().brain.reasons['client-validation']);assert.equal(await p.locator('#buddy-line').innerText(),'Do you like cat or dog?');await done(p);
 p=await page({data:fresh,online:true,hang:true});await dismiss(p);await p.click('#btn-buddy');await p.clock.fastForward(6501);assert.equal(await p.locator('#buddy-line').innerText(),'Do you like cat or dog?');assert((await p.evaluate(()=>BW.adventure().brain.reasons)).timeout);await done(p);
 p=await page({data:fresh,online:true,hang:true});await dismiss(p);await p.click('#btn-buddy');await p.evaluate(()=>{BW.give('tree',1);BW.give('wood',1);BW.testOpen();});await p.clock.fastForward(6501);assert(await p.locator('#buddy-chat').isHidden());assert(await p.locator('#dialogue').isVisible());await done(p);
 p=await page({data:fresh});await dismiss(p);await p.click('#btn-buddy');assert(await p.locator('#buddy-picture').isHidden());
 for(const end of ['onend','onerror','timeout','failure','close']) {
   await p.evaluate(end=>window.failListen=end==='failure',end);await p.click('#buddy-mic');
   if(end!=='failure'){await mic(p,'buddy-mic',true);if(end==='timeout')await p.clock.fastForward(8001);else if(end==='close')await p.click('#buddy-close');else await p.evaluate(end=>recognizer[end]?.(),end);}
   await mic(p,'buddy-mic',false);
 }
 await p.evaluate(()=>window.failListen=false);await p.evaluate(()=>BW.recast('dog'));await p.click('#buddy-mic');await mic(p,'buddy-mic',true);
 await p.evaluate(()=>voiceResult('I like dog'));await mic(p,'buddy-mic',false);
 await done(p);
 p=await page({data:fresh});await dismiss(p);await p.click('#btn-buddy');await p.click('#buddy-mic');await p.evaluate(()=>voiceResult('I like dog'));assert.equal((await saved(p)).prefs.animal,'dog');await done(p);
 p=await page({file:true});await p.fill('#name-input','Sam');await p.click('#name-form button[type=submit]');await dismiss(p);await p.click('#btn-buddy');assert.equal(await p.locator('#buddy-line').innerText(),'Do you like cat or dog?');await done(p);
 report('valid brain response, rejected response, timeout and fully offline file templates remain usable');
 p=await page({data:fresh,viewport:{width:390,height:844}});await dismiss(p);await p.evaluate(()=>{BW.give('tree',1);BW.give('wood',1);BW.testOpen();});
 for(const id of ['chat-listen','chat-mic']){const b=await p.locator('#'+id).boundingBox();assert(b.width>=90&&b.height>=48);assert(b.x>=0&&b.x+b.width<=390&&b.y+b.height<=844);assert.equal(await p.locator('#'+id+' svg').count(),1);await p.locator('#'+id).tap();}
 assert(await p.evaluate(()=>!!window.recognizer));await mic(p,'chat-mic',true);await photo(p,'chat-buttons');
 for(const end of ['onend','onerror','timeout','failure','close']) {
   if(end==='timeout')await p.clock.fastForward(8001);else if(end==='close')await p.evaluate(()=>BW.testClose());else await p.evaluate(end=>recognizer[end==='failure'?'onend':end]?.(),end);
   await mic(p,'chat-mic',false);
   if(end==='close')await p.evaluate(()=>BW.testOpen());
   await p.evaluate(end=>window.failListen=end==='failure',end);await p.locator('#chat-mic').tap();
   if(end==='failure'){await mic(p,'chat-mic',false);await p.evaluate(()=>window.failListen=false);await p.locator('#chat-mic').tap();}
   await mic(p,'chat-mic',true);
 }
 await p.evaluate(()=>voiceResult('I see a tree'));await mic(p,'chat-mic',false);await p.clock.fastForward(1901);await p.waitForFunction(()=>BW.adventure().mode==='recast');assert.equal(await p.locator('#buddy-line').innerText(),'Good job! Well done!');assert(!JSON.stringify(await saved(p)).includes('I see a tree'));await done(p);
 p=await page({data:fresh,reduced:true});await dismiss(p);await p.click('#btn-buddy');await p.click('#buddy-mic');
 assert.equal(await p.locator('#buddy-mic').evaluate(e=>getComputedStyle(e).animationName),'none');assert.equal(await p.locator('#buddy-mic').evaluate(e=>e.classList.contains('mic-recording')),true);await p.click('#buddy-close');await mic(p,'buddy-mic',false);await done(p);
 report('all three mics glow during synthetic recognition and clear on result/end/error/timeout/close/start failure; reduced motion stays static');
 const petData=structuredClone(fresh);petData.animals.forEach(a=>{if(a[0]==='dog'){a[1]=petData.px+32;a[2]=petData.py;a[4]=1;}else a[1]=7000;});
 p=await page({data:petData});await dismiss(p);const buddy=await p.evaluate(()=>BW.screenAnimal('dog'));await p.mouse.click(buddy.x,buddy.y);assert.equal((await saved(p)).small_talk_count,1);assert(await p.locator('#buddy-chat').isVisible());assert.equal(await p.evaluate(()=>spoken.at(-1)),'Do you like cat or dog?');await done(p);
 p=await page({data:fresh});await dismiss(p);await p.clock.fastForward(60001);assert.equal((await saved(p)).small_talk_count,1);
 for(const input of [{event:'name_ask'}, {event:'small_talk',topic:'learn_pref_animal'}, {event:'small_talk',topic:'learn_pref_build'}, {event:'small_talk',topic:'learn_pref_food'}, {event:'small_talk',prefs:{build:'house'}}, ...['rain','sun','cloud','moon','star'].map(weather=>({event:'weather_chat',weather,time_of_day:'evening'})), ...[['cat',1],['a cat',2],['I see a cat',3],['dragon',1],['hello',1],['jump',1],['follow',1],['pet',1],['home',1],['rod',1],['a rod',2],['hello cat',2]].map(([child_said,target_tier])=>({event:'recast',child_said,target_tier}))]) {
   const q=normalize(input);assert.deepEqual(await p.evaluate(q=>BW.testLines(q),q),conversationLines(q));
 }
 await done(p);
 assert.equal(conversationLines(normalize({event:'recast',child_said:'cat',target_tier:1}))[0],'Try: I see a cat!');
 p=await page({data});await p.reload();await p.click('#btn-new');await p.click('#btn-new');await p.click('#btn-start');assert(await p.locator('#name-entry').isVisible());const cleared=await saved(p);assert.equal(cleared.child_name,'Mario');assert.equal(cleared.prefs.animal,null);await done(p);
 report('portrait SVG buttons are visible and touch clickable; 60-second idle triggers small talk; client/server phrase slots match');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{await browser?.close();});
