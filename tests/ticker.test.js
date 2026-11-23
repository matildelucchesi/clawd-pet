const test = require('node:test');
const assert = require('node:assert/strict');
const { createSceneTicker } = require('../src/main/ticker.js');

test('sends the first scene, then only changes', () => {
  let scene = 'onsen';
  const sent = [];
  const tick = createSceneTicker({ petState: { scene: () => scene }, send: (s) => sent.push(s) });
  tick(); tick();
  scene = 'gym'; tick(); tick();
  scene = 'onsen'; tick();
  assert.deepEqual(sent, ['onsen', 'gym', 'onsen']);
});

test('resend() forces the current scene out again (e.g. after a reload)', () => {
  const sent = [];
  const tick = createSceneTicker({ petState: { scene: () => 'gym' }, send: (s) => sent.push(s) });
  tick();
  tick.resend();
  assert.deepEqual(sent, ['gym', 'gym']);
});
