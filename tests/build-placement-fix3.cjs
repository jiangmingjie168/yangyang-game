'use strict';
// Geometry contracts for P2: each segment remains supercover; another clear
// head/corner segment can legitimately see around an isolated obstacle.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
const walls=new Set(),ctx={TILE:32,PH:28,W:240,H:64,player:{x:80,y:92},sightBlock:null,Math,get:(x,y)=>walls.has(x+','+y)?1:0,solid:id=>id===1};vm.createContext(ctx);
vm.runInContext(source.slice(source.indexOf('  function buildReach('),source.indexOf('  function buildTap(')),ctx);
function blocks(list){walls.clear();list.forEach(p=>walls.add(p.join(',')));}
// Re-execute all historical single-ray contracts against the extracted segment.
const old=fs.readFileSync(require('node:path').join(__dirname,'build-placement.cjs'),'utf8');
const legacy={...ctx,PH:30};vm.createContext(legacy);vm.runInContext(source.slice(source.indexOf('  function buildReach('),source.indexOf('  function buildTap(')),legacy);
legacy.placementSight=(x,y)=>legacy.segmentClear(legacy.player.x/32,(legacy.player.y-30*.4)/32,x+.5,y+.5,x,y);
const assertions=old.slice(old.indexOf('function ray('),old.indexOf('// Fences,'));
vm.runInContext(assertions,vm.createContext({ctx:legacy,walls,assert}));
vm.runInContext(old.slice(old.indexOf('// Fences,'),old.indexOf('console.log')),vm.createContext({source,assert}));
// Stand beside a one-tile wall. Chest-only blocks; the head ray clears its top.
ctx.player={x:3.7*32,y:6*32};blocks([[4,5]]);
assert.equal(ctx.segmentClear(3.7,5.65,4.5,4.5,4,4),false);
assert.equal(ctx.placementSight(4,4),true);
blocks([[4,5],[4,4]]);assert.equal(ctx.placementSight(4,3),true);
// Mirrored side.
ctx.player={x:5.3*32,y:6*32};assert.equal(ctx.placementSight(4,3),true);
// A fully closed shell admits no origin/target corner, from either side.
const shell=[];for(let y=2;y<=6;y++)shell.push([4,y],[8,y]);for(let x=4;x<=8;x++)shell.push([x,2],[x,6]);blocks(shell);
ctx.player={x:3.7*32,y:6*32};assert.equal(ctx.placementSight(6,4),false);assert(ctx.sightBlock);
ctx.player={x:9.3*32,y:6*32};assert.equal(ctx.placementSight(6,4),false);
console.log('PASS all 14 legacy segment/reach contracts; mirrored head/corner stacking; closed shell blocks all fourteen rays');
