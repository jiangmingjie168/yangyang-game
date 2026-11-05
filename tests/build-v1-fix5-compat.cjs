'use strict';
// Preserve the historical files. One old assertion explicitly forbids the
// own-block stacking now required by fix3. Adapt it and the documented fix5
// invitation/rearm expectations below, then run
// the complete original build-v1 (including fix1/fix2 and legacy-save checks).
// This changes test expectations, never the served HTML or browser state.
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),assert=require('node:assert/strict');
const file=path.join(__dirname,'build-v1-fix1.cjs');let source=fs.readFileSync(file,'utf8');
const before="// An occupied square never consumes a second block.\n        await p.mouse.click(240,224);await remaining(2);await snap('R',4);";
const after="// Fix3: clicking an owned block stacks into the empty square above it.\n        await p.mouse.click(240,224);await remaining(1);await snap('R',4);";
assert(source.includes(before),'Historical stacking assertion remains identifiable');
// Explicitly dismiss the visible material card before crafting; do not rely on its timer.
source=source.replace("for(let i=0;i<times;i++) { assert","for(let i=0;i<times;i++) { if(await p.locator('#wordcard').isVisible())await p.locator('#wordcard').click(); assert");
const adapted=new Module(file,module);adapted.filename=file;adapted.paths=module.paths;require.cache[file]=adapted;adapted.loaded=true;
console.log('compatibility: retain fix3 own-block stacking assertion');
// Closed work now requires one new cell before the next Show. Use the two
// remaining real crafted Planks for the legacy level-two/three questions.
source=source.replace("await p.locator('[data-build=\"fence\"]').click(); await p.locator('#btn-buddy').click();", "await p.locator('[data-build=\"planks\"]').click(); await p.mouse.click(316,level===2?224:186); await p.waitForTimeout(2800); await p.locator('[data-build=\"fence\"]').click(); await p.locator('#btn-buddy').click();");
source=source.replace("await feedback('No more fence!'); await stock(2);", "await feedback('No more fence!'); await stock(0);");
adapted._compile(source.replace(before,after),file);
const fix2file=path.join(__dirname,'build-v1-fix2.cjs');
let fix2=fs.readFileSync(fix2file,'utf8');
const oldInvite="assert.equal(await p.getByRole('button',{name:'Show my building'}).isVisible(),false);await snap('Next placement folds Show away and consumes one plank');";
assert(fix2.includes(oldInvite));
fix2=fix2.replace(oldInvite,"assert.equal(await p.getByRole('button',{name:'Show my building'}).isVisible(),true);await snap('Next placement preserves Show and consumes one plank');");
const adapted2=new Module(fix2file,module);adapted2.filename=fix2file;adapted2.paths=module.paths;require.cache[fix2file]=adapted2;adapted2._compile(fix2,fix2file);adapted2.loaded=true;
console.log('fix5 compatibility: add one actual Planks before each repeated closed Show; placement now preserves an invitation. Served HTML stays unmodified.');
require('./build-v1.cjs');
