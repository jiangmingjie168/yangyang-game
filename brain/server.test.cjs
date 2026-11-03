'use strict';
// Real HTTP game -> buddy -> local fake DeepSeek. No real provider or key.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { createServer, normalize, template, validOutput, WORDS } = require('./server.cjs');
const input = { event: 'fish', scene: 'water', chapter: 3, target_word: 'fish', options: ['fish', 'wood'], learned_words: ['fish', 'wood'], turn: 0 };
async function listen(server) { await new Promise(r => server.listen(0, '127.0.0.1', r)); return 'http://127.0.0.1:' + server.address().port; }
async function close(server) { server.closeAllConnections(); await new Promise(r => server.close(r)); }
async function scenario(replies, request = input, config = {}) {
  const calls = [];
  const upstream = http.createServer(async (req, res) => {
    let raw = ''; for await (const b of req) raw += b;
    calls.push(JSON.parse(raw));
    const reply = replies[Math.min(calls.length - 1, replies.length - 1)];
    if (reply === 'timeout') return;
    if (reply === 'delayed-invalid') { await new Promise(r => setTimeout(r, 80)); res.end('{}'); return; }
    if (reply === 'slow-body') { res.writeHead(200); res.write('{'); return; }
    if (reply === 'error') { res.writeHead(503); res.end('unavailable'); return; }
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ choices: [{ message: { content: typeof reply === 'string' ? reply : JSON.stringify(reply) } }] }));
  });
  const url = await listen(upstream);
  const server = createServer({ key: 'mock-only-not-a-real-key', model: 'mock-model', url: url + '/chat/completions', timeoutMs: 120, origins: ['https://game.example'], ...config });
  const base = await listen(server);
  try {
    const start = Date.now();
    const response = await fetch(base + '/buddy', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://game.example' }, body: JSON.stringify(request) });
    return { value: response.status === 200 ? await response.json() : null, status: response.status, calls, elapsed: Date.now() - start, cors: response.headers.get('access-control-allow-origin') };
  } finally { await close(server); await close(upstream); }
}
test('valid JSON uses configured model, JSON mode, prompt and CORS', async () => {
  const expected = template(normalize(input)), result = await scenario([expected]);
  assert.deepEqual(result.value, expected); assert.equal(result.calls.length, 1);
  assert.equal(result.calls[0].model, 'mock-model'); assert.deepEqual(result.calls[0].response_format, { type: 'json_object' });
  assert.match(result.calls[0].messages[0].content, /never use Chinese/i); assert.equal(result.cors, 'https://game.example');
});
test('invalid model outputs get exactly one corrective retry, then template', async t => {
  const good = template(normalize(input));
  const bads = {
    'bad JSON': '{broken', 'empty JSON': '    ', Chinese: { ...good, say: '你好 Fish?' },
    'non-whitelisted options': { ...good, options: ['fish', 'dragon'] },
    'different learned options': { ...good, options: ['wood', 'fish'] },
    'answer outside options': { ...good, answer: 'cat' }, 'changed answer': { ...good, answer: 'wood' },
    'changed done': { ...good, done: true }, 'non-boolean done': { ...good, done: 'false' },
    'too long': { ...good, say: 'Fish or wood? '.repeat(5) }, 'new topic': { ...good, say: 'Fish or wood? Buy a rocket!' },
    'wrong word': { ...good, say: 'Wrong! Fish or wood?' }, 'tier switch': { ...good, say: "What's this?" },
    'extra fields': { ...good, reward: 99 }, 'no English': { ...good, say: '!!!' }
  };
  for (const [name, bad] of Object.entries(bads)) await t.test(name, async () => {
    const repaired = await scenario([bad, good]); assert.deepEqual(repaired.value, good); assert.equal(repaired.calls.length, 2);
    assert.match(repaired.calls[1].messages.at(-1).content, /Correction/);
    const failed = await scenario([bad]); assert.deepEqual(failed.value, good); assert.equal(failed.calls.length, 2);
  });
});
test('HTTP error and hard timeouts (including slow body) fall back without retry', async t => {
  for (const reply of ['error', 'timeout', 'slow-body']) await t.test(reply, async () => {
    const result = await scenario([reply]); assert.deepEqual(result.value, template(normalize(input)));
    assert.equal(result.calls.length, 1); assert(result.elapsed < 1000);
  });
});
test('corrective retry shares the whole request deadline', async () => {
  const result = await scenario(['delayed-invalid', 'timeout']);
  assert.deepEqual(result.value, template(normalize(input))); assert.equal(result.calls.length, 2);
  assert(result.elapsed < 190, 'retry must not start a fresh timeout budget');
});
test('all three rule tiers, feedback praise and mandatory max-turn closing', async () => {
  for (const tier of [1, 2, 3]) for (const feedback of ['prompt', 'retry', 'success']) {
    const p = normalize({ ...input, tier, feedback, child_said: feedback === 'prompt' ? undefined : 'fish' });
    const expected = template(p); assert(validOutput(expected, p));
    assert.deepEqual((await scenario([expected], p)).value, expected);
  }
  const p = normalize({ ...input, turn: 3 }); const result = await scenario(['timeout'], p);
  assert(result.value.done); assert.equal(result.calls.length, 0);
  assert.equal(normalize({ ...input, turn: 100 }).turn, 3);
  const replyOnly = normalize({ ...input, child_said: 'fish' });
  assert.equal(replyOnly.feedback, 'retry'); assert.match(template(replyOnly).say, /^Great!/);
  const retry = normalize({ ...input, feedback: 'retry' });
  assert(!validOutput({ ...template(retry), say: 'Fish or wood?' }, retry));
});
test('every vocabulary item has valid templates in all tiers', () => {
  for (const word of WORDS) for (const tier of [1,2,3]) {
    const other = word === 'wood' ? 'fish' : 'wood';
    const p = normalize({ ...input, target_word: word, options: [word,other], learned_words: [word,other], tier });
    assert(validOutput(template(p), p), word + ' tier ' + tier);
  }
});
test('untrusted input rejected; no key never calls provider', async () => {
  assert.equal((await scenario(['timeout'], input, { key: '' })).calls.length, 0);
  for (const patch of [{ options: ['fish','dragon'] }, { options: ['fish','fish'] }, { target_word: 'cat' }, { tier: 4 }, { turn: -1 }, { turn: 0.5 }, { child_said: 'x'.repeat(161) }, { chapter: 4 }, { scene: '<script>' }]) {
    const result = await scenario(['timeout'], { ...input, ...patch }); assert.equal(result.status, 400); assert.equal(result.calls.length, 0);
  }
});
test('HTTP route, media type, method, body limit, and exact origin policy', async () => {
  const s = createServer({ key: '', origins: ['https://game.example'] }); const base = await listen(s);
  try {
    assert.equal((await fetch(base + '/missing')).status, 404);
    assert.equal((await fetch(base + '/buddy')).status, 405);
    assert.equal((await fetch(base + '/buddy', { method: 'POST', body: '{}' })).status, 415);
    assert.equal((await fetch(base + '/buddy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' })).status, 400);
    assert.equal((await fetch(base + '/buddy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: ' '.repeat(9000) })).status, 413);
    assert.equal((await fetch(base + '/buddy', { method: 'OPTIONS', headers: { Origin: 'https://game.example' } })).status, 204);
    assert.equal((await fetch(base + '/buddy', { method: 'OPTIONS', headers: { Origin: 'https://evil.example' } })).status, 403);
    assert.equal((await fetch(base + '/buddy', { headers: { Origin: 'null' } })).status, 403);
  } finally { await close(s); }
});
