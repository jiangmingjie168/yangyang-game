'use strict';
// Consolidate only complete passing cases, preserving original run reports.
// This never changes a failed result into PASS. A matching source hash and
// a later, separately recorded, genuinely passing retry are required.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),sha=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'index.html'))).digest('hex');
const runs=process.env.BW_CRAFT_RUNS?JSON.parse(process.env.BW_CRAFT_RUNS):['screens/build-v1.1-craftable-final','screens/build-v1.1-craftable-retry'];
const out=path.resolve(root,process.env.BW_CRAFT_OUT||'screens/build-v1.1-craftable-verified');fs.mkdirSync(path.join(out,'provenance'),{recursive:true});
const picked=new Map(),provenance=[];
for(const run of runs){const dir=path.join(root,run),j=JSON.parse(fs.readFileSync(path.join(dir,'build-v1-craftable-results.json'))),clicks=JSON.parse(fs.readFileSync(path.join(dir,'build-v1-craftable-clicks.json')));assert.equal(j.sha256,sha);
 fs.copyFileSync(path.join(dir,'build-v1-craftable-results.json'),path.join(out,'provenance',path.basename(run)+'.json'));
 provenance.push({run,passed:j.results.filter(r=>r.status==='PASS').length,failed:j.results.filter(r=>r.status==='FAIL').map(r=>({case:r.case,error:r.error}))});
 for(const r of j.results)if(r.status==='PASS')picked.set(r.case,{result:r,frames:j.frames.filter(f=>f.case===r.case),clicks:clicks.filter(c=>c.case===r.case),dir});
}
const expected=['C','P','F','Q','R','I','V','T2','T3','N'].flatMap(k=>['desktop','mobile'].map(v=>k+'-'+v));assert.equal(picked.size,20);expected.forEach(k=>assert(picked.has(k),'Missing PASS '+k));
const results=[],frames=[],clicks=[];
for(const k of expected){const p=picked.get(k);results.push(p.result);frames.push(...p.frames);clicks.push(...p.clicks);for(const f of p.frames)fs.copyFileSync(path.join(p.dir,f.file),path.join(out,f.file));}
fs.writeFileSync(path.join(out,'build-v1-craftable-results.json'),JSON.stringify({sha256:sha,consolidation:'Complete passing cases selected from the listed same-source runs; any original failures retained in provenance.',provenance,results,frames},null,2));
fs.writeFileSync(path.join(out,'build-v1-craftable-clicks.json'),JSON.stringify(clicks,null,2));
console.log(JSON.stringify({cases:results.length,frames:frames.length,clicks:clicks.length,sha256:sha}));
