const test = require('node:test');
const assert = require('node:assert/strict');
const { createPetState } = require('../src/main/state.js');
const { startServer } = require('../src/main/server.js');

async function setup() {
  const petState = createPetState();
  const changes = [];
  const server = await startServer({ port: 0, petState, onChange: (s) => changes.push(s) });
  const { address, port } = server.address();
  return { petState, changes, server, base: `http://${address}:${port}` };
}

test('listens on 127.0.0.1 only', async (t) => {
  const { server } = await setup();
  t.after(() => server.close());
  assert.equal(server.address().address, '127.0.0.1');
});

test('accepts UserPromptSubmit and reports gym', async (t) => {
  const { server, base, changes, petState } = await setup();
  t.after(() => server.close());
  const res = await fetch(`${base}/hook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hook_event_name: 'UserPromptSubmit', session_id: 's1', prompt: 'hi' }),
  });
  assert.equal(res.status, 204);
  assert.deepEqual(changes, ['gym']);
  assert.equal(petState.scene(), 'gym');
});

test('malformed JSON gives 400 and stays onsen', async (t) => {
  const { server, base, changes, petState } = await setup();
  t.after(() => server.close());
  const res = await fetch(`${base}/hook`, { method: 'POST', body: '{not json' });
  assert.equal(res.status, 400);
  assert.deepEqual(changes, []);
  assert.equal(petState.scene(), 'onsen');
});

test('empty body gives 400', async (t) => {
  const { server, base, petState } = await setup();
  t.after(() => server.close());
  const res = await fetch(`${base}/hook`, { method: 'POST', body: '' });
  assert.equal(res.status, 400);
  assert.equal(petState.scene(), 'onsen');
});

test('missing fields give 400', async (t) => {
  const { server, base, petState } = await setup();
  t.after(() => server.close());
  const res = await fetch(`${base}/hook`, { method: 'POST', body: JSON.stringify({ hook_event_name: 'UserPromptSubmit' }) });
  assert.equal(res.status, 400);
  const res2 = await fetch(`${base}/hook`, { method: 'POST', body: 'null' });
  assert.equal(res2.status, 400);
  assert.equal(petState.scene(), 'onsen');
});

test('unknown event gives 204 and leaves state unchanged', async (t) => {
  const { server, base, changes, petState } = await setup();
  t.after(() => server.close());
  const res = await fetch(`${base}/hook`, { method: 'POST', body: JSON.stringify({ hook_event_name: 'Whatever', session_id: 's1' }) });
  assert.equal(res.status, 204);
  assert.deepEqual(changes, []);
  assert.equal(petState.scene(), 'onsen');
});

test('body over 64 KB is rejected', async (t) => {
  const { server, base, petState } = await setup();
  t.after(() => server.close());
  const big = JSON.stringify({ hook_event_name: 'UserPromptSubmit', session_id: 's1', prompt: 'x'.repeat(70 * 1024) });
  const res = await fetch(`${base}/hook`, { method: 'POST', body: big }).catch(() => null);
  if (res) assert.equal(res.status, 413);
  assert.equal(petState.scene(), 'onsen');
});

test('GET / gives 404', async (t) => {
  const { server, base } = await setup();
  t.after(() => server.close());
  const res = await fetch(`${base}/`);
  assert.equal(res.status, 404);
});
