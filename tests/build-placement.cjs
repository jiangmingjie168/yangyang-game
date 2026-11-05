'use strict';
// Isolated geometry contract tests, not browser probes. The release scenarios
// in build-v1-fix1.cjs separately exercise the unmodified page by pointer.
const fs=require('node:fs'), vm=require('node:vm'), assert=require('node:assert/strict');
const source=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
const walls=new Set();
const ctx={TILE:32,PH:30,W:240,H:64,player:{x:80,y:92},Math,
  get:(x,y)=>walls.has(x+','+y)?1:0,solid:id=>id===1};
vm.createContext(ctx);
vm.runInContext(source.slice(source.indexOf('  function buildReach('),source.indexOf('  function buildTap(')),ctx);
function ray(x,y,blocks,expected,label){walls.clear();blocks.forEach(p=>walls.add(p.join(',')));assert.equal(ctx.placementSight(x,y),expected,label);}
// Origin is (2.5,2.5), so diagonal corner cases are exact, not approximate.
ray(8,2,[],true,'clear horizontal');
ray(8,2,[[5,2]],false,'wall behind which the target is still within reach');
ray(2,8,[[2,5]],false,'vertical wall');
ray(8,8,[[4,3]],false,'touching the horizontal side of a corner');
ray(8,8,[[3,4]],false,'touching the vertical side of a corner');
ray(8,8,[[4,4]],false,'diagonal wall');
ray(8,2,[[8,2]],true,'target itself is accessible for removal');
ray(8,2,[[5,3]],true,'clear ray alongside wall');
ray(0,2,[[1,2]],false,'negative horizontal direction');
ray(2,0,[[2,1]],false,'negative vertical direction');
assert(ctx.buildReach(10,2),'new horizontal outer tile');
assert(!ctx.buildReach(11,2),'one tile beyond new horizontal limit');
assert(ctx.buildReach(2,8),'new vertical outer tile');
assert(!ctx.buildReach(2,9),'one tile beyond new vertical limit');
// Fences, windows and leaves use the same blocking classification as walls;
// an open/passable Door is deliberately not a solid block.
const solidList=source.match(/\[GRASS, DIRT[^\n]+SOLID\[id\] = 1/)[0];
for(const k of ['FENCE','WINDOW','LEAVES','PLANKS','HOUSE'])assert(solidList.includes(k));
assert(!solidList.includes('DOOR'));
console.log('PASS 14 line-of-sight/reach contracts; fence/window/tree blocking and passable doors');
