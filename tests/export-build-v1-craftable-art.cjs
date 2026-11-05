'use strict';
// Export the exact inline canvas masters for art review; never loads the game.
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const code='var TILE=32;'+html.slice(html.indexOf('  var CRAFTABLES='),html.indexOf('  function newBuildSession()'));
const browser=await chromium.launch({executablePath:process.env.CHROME||'/usr/bin/google-chrome',args:['--no-sandbox']});
try{const p=await browser.newPage();await p.setContent('<html><body></body></html>');await p.addScriptTag({content:code});
for(const item of ['houseKit','pen']){const png=await p.evaluate(item=>craftableSprite(newCraftable(item)).toDataURL(),item);fs.writeFileSync(path.join(root,'icons/build-v1-craftable-'+(item==='houseKit'?'house':item)+'.png'),Buffer.from(png.split(',')[1],'base64'));}}
finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
