'use strict';
// Isolated canvas asset renderer: no game or gameplay state is loaded/injected.
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const code='var TILE=32;'+html.slice(html.indexOf('  var CRAFTABLES='),html.indexOf('  function newBuildSession()'));
const browser=await chromium.launch({executablePath:process.env.CHROME||'/usr/bin/google-chrome',args:['--no-sandbox']});
try{const p=await browser.newPage();await p.setContent('<html><body></body></html>');await p.addScriptTag({content:code});
for(const name of ['car','wheel','house-base','house-wall','house-roof','house-yard','house-window','house-all']){
 const png=await p.evaluate(name=>{if(name==='wheel'){const c=document.createElement('canvas');c.width=c.height=32;drawWheelArt(c.getContext('2d'));return c.toDataURL();}const b=newCraftable(name==='car'?'car':'houseKit');for(const part of Object.keys(HOUSE_UPGRADES)){if(name==='house-all'||name==='house-'+part){b.parts[part]={tier:2,material:HOUSE_UPGRADES[part].material};}}return craftableSprite(b).toDataURL();},name);
 fs.writeFileSync(path.join(root,'icons/build-v1.1-'+name+'.png'),Buffer.from(png.split(',')[1],'base64'));
}}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
