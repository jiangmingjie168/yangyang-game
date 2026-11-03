'use strict';
// Enumerate rule-owned atoms, not the unbounded cross-product with child names.
const fs = require('node:fs');
const path = require('node:path');
const { WORDS, greetingLines, greetingSlots, conversationLines, contextLeads, PREF_VALUES, template } = require('../server.cjs');
const lines = new Map();
function add(text, category) { if (!lines.has(text)) lines.set(text, {text, category}); }
const label = w => w === 'rod' ? 'fishing rod' : w;
const cap = s => s[0].toUpperCase() + s.slice(1);
// Put deployment samples first: labels, prompts, welcome, praise and social lines.
for (const w of WORDS) add(cap(label(w)), 'word');
for (const s of ['Tree or dog?', 'Dog or tree?', "What's this?", 'What is this?', 'Great! Keep exploring!', 'Nice! Keep exploring!', 'Good job! Well done!', 'Hi! What is your name?', 'Hello! What is your name?', 'Do you like cat or dog?', 'Look! I see the sun!', 'Look! I see the rain!', 'Try: I see a dog!', 'I see a dog. Say it!', 'I see a tree. Say it!', "Hi friend. I'm so happy you're here. Let's build something together!"]) add(s, 'main');
for (const s of ['You met a dog!', 'You found wood!', 'You found a tree!', 'You met a sheep!', 'Great! Dog or tree?', 'Great! Tree or dog?', 'Find a tree!', 'Mine stone!', 'Find water!', 'Tap a sheep!', 'Try: I see a cat!', 'Look! I see the cloud!', 'Look! I see the moon!', 'Look! I see the star!', 'Do you like house or table?', 'Do you like fish or wheat?', 'I can see a dog!', 'We can see a dog!', 'Say: I see a dog!', 'Great! Good job!']) add(s, 'main');
for (const praise of ['Great!', 'Nice!', 'Good job!', 'Well done!']) add(praise, 'praise');
for (const s of ['Keep exploring!', "Let's keep exploring!", 'Say it!', 'Your turn!', 'Good try! Say it again!']) add(s, 'exercise');
for (const w of WORDS) {
  add('Find the ' + cap(label(w)) + '!', 'quiz');
  add("Let's say " + label(w) + ' together!', 'reveal');
  for (const other of WORDS) if (w !== other) {
    add(cap(label(w)) + ' or ' + label(other) + '?', 'tier1');
    add('Is this ' + label(w) + ' or ' + label(other) + '?', 'tier1');
  }
  const p = {target_word:w, options:[w,w==='tree'?'dog':'tree'], tier:3, turn:0, feedback:'prompt'};
  const line = template(p).say;
  add(line, 'tier3'); add(line.replace('Say it!', 'Your turn!'), 'tier3');
  for (const action of ['found','made','built','met','caught','rode','task','scene'])
    contextLeads({target_word:w,recent_events:[{action,word:w}]}).forEach(s=>add(s,'context'));
  add('Remember ' + label(w) + '?', 'context'); add('You said ' + label(w) + '!', 'context');
  for (const tier of [1,2,3]) conversationLines({event:'recast',child_said:label(w),target_tier:tier}).forEach(s=>add(s,'recast'));
  conversationLines({event:'small_talk', prefs:{},recent_events:[{word:w}]}).forEach(s=>add(s,'small_talk'));
}
for (const time_of_day of ['morning','afternoon','evening']) for (const returning of [false,true]) {
  const p = {child_name:'friend',time_of_day,returning};
  greetingLines(p).forEach(s=>add(s,'greeting'));
  greetingSlots(p).flat().forEach(s=>add(s,'greeting_segment'));
}
for (const weather of ['rain','cloud','sun','moon','star']) conversationLines({event:'weather_chat',weather}).forEach(s=>add(s,'weather'));
for (const topic of ['animal','build','food']) {
  conversationLines({event:'small_talk',topic:'learn_pref_'+topic}).forEach(s=>add(s,'preference'));
  for (const w of PREF_VALUES[topic]) conversationLines({event:'small_talk',prefs:{[topic]:w}}).forEach(s=>add(s,'preference'));
}
const html = fs.readFileSync(path.join(__dirname,'../../index.html'),'utf8');
for (const m of html.matchAll(/\{ en: '([^']+)'/g)) add(m[1],'quest');
add('Level 3 Complete! Explore and play!', 'quest');
const manifest = {version:1, voice:'en-US-JennyNeural', rate:'-15%', hash:'sha256(text.trim().toLowerCase()), first 20 hex characters', composition:'Optional praise + optional matching context + exercise. Atoms are enumerated separately; named lines use whole-line TTS fallback. All friend greeting combinations are enumerated. Toasts are not spoken.', lines:[...lines.values()]};
fs.writeFileSync(path.join(__dirname,'../lines-manifest.json'), JSON.stringify(manifest,null,2)+'\n');
console.log('Manifest lines:',lines.size);
