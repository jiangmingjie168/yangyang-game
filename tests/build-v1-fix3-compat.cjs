'use strict';
// Preserve the historical files. One old assertion explicitly forbids the
// own-block stacking now required by fix3. Adapt that assertion only, then run
// the complete original build-v1 (including fix1/fix2 and legacy-save checks).
// This changes test expectations, never the served HTML or browser state.
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),assert=require('node:assert/strict');
const file=path.join(__dirname,'build-v1-fix1.cjs');let source=fs.readFileSync(file,'utf8');
const before="// An occupied square never consumes a second block.\n        await p.mouse.click(240,224);await remaining(2);await snap('R',4);";
const after="// Fix3: clicking an owned block stacks into the empty square above it.\n        await p.mouse.click(240,224);await remaining(1);await snap('R',4);";
assert(source.includes(before),'Historical stacking assertion remains identifiable');
// Explicitly dismiss the visible material card before crafting; do not rely on its timer.
source=source.replace("for(let i=0;i<times;i++) { assert","for(let i=0;i<times;i++) { if(await p.locator('#wordcard').isVisible())await p.locator('#wordcard').click(); assert");
const adapted=new Module(file,module);adapted.filename=file;adapted.paths=module.paths;require.cache[file]=adapted;adapted._compile(source.replace(before,after),file);adapted.loaded=true;
console.log('fix3 compatibility: one obsolete own-block rejection assertion now requires a successful stack; every other fix1 assertion unchanged');
require('./build-v1.cjs');
