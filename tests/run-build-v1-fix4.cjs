'use strict';
// One reproducible release command. Browser suites run as separate processes;
// their historical fixtures stay separate from the fresh-save pointer gate.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),{spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..'), results=[];
const server=http.createServer((req,res)=>{
  const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const file=path.resolve(root,'.'+(name==='/'?'/index.html':name));
  if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
  fs.readFile(file,(error,body)=>{if(error){res.writeHead(404);res.end();return;}
    res.setHeader('Content-Type',file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.webmanifest')?'application/manifest+json':file.endsWith('.png')?'image/png':'application/octet-stream');res.end(body);});
});
async function run(suite,args){
  const log='screens/build-v1-fix4-test-'+suite+'.log', fd=fs.openSync(path.join(root,log),'w'), start=Date.now();
  const child=spawn(process.execPath,args||['tests/'+suite+'.cjs'],{cwd:root,env:{...process.env,BW_URL:'http://127.0.0.1:'+server.address().port},stdio:['ignore',fd,fd]});
  const timer=setTimeout(()=>child.kill('SIGTERM'),600000);
  const exit=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',(code)=>resolve(code===null?124:code));});
  clearTimeout(timer);fs.closeSync(fd);
  const result={suite,exit,seconds:Math.round((Date.now()-start)/100)/10,log};results.push(result);console.log(JSON.stringify(result));
}
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  // Build includes both fix1 and fix2 fresh-save gates. Keep those captures
  // sequential; remaining compatibility suites can run independently.
  await run('build-v1',['tests/build-v1-fix3-compat.cjs']);await run('build-placement-fix3');
  const queue=['natural-pointer-v4r','chinese-cleanup','world-v2','memory-chat','server'];
  async function worker(){for(;;){const suite=queue.shift();if(!suite)return;await run(suite,suite==='server'?['--test','brain/server.test.cjs']:undefined);}}
  await Promise.all([worker(),worker(),worker()]);
  fs.writeFileSync(path.join(root,'screens/build-v1-fix4-regressions.json'),JSON.stringify(results,null,2)+'\n');
  if(results.some(r=>r.exit!==0))process.exitCode=1;
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>{server.closeAllConnections();server.close();});
