const test = require('node:test');
const assert = require('node:assert/strict');
const { createPetState } = require('../src/main/state.js');

function fakeClock(start = 1000) {
  let t = start;
  return { now: () => t, advance: (ms) => { t += ms; } };
}

test('starts in onsen', () => {
  const c = fakeClock();
  assert.equal(createPetState({ now: c.now }).scene(), 'onsen');
});

test('UserPromptSubmit goes to gym', () => {
  const c = fakeClock();
  const s = createPetState({ now: c.now });
  s.onHook('UserPromptSubmit', 'a');
  assert.equal(s.scene(), 'gym');
});

test('PreToolUse and PostToolUse count as working', () => {
  const c = fakeClock();
  const s = createPetState({ now: c.now });
  s.onHook('PreToolUse', 'a');
  assert.equal(s.scene(), 'gym');
  const s2 = createPetState({ now: c.now });
  s2.onHook('PostToolUse', 'b');
  assert.equal(s2.scene(), 'gym');
});

test('Stop returns to onsen only after 2500 ms', () => {
  const c = fakeClock();
  const s = createPetState({ now: c.now });
  s.onHook('UserPromptSubmit', 'a');
  s.onHook('Stop', 'a');
  c.advance(2499);
  assert.equal(s.scene(), 'gym');
  c.advance(1);
  assert.equal(s.scene(), 'onsen');
});

test('SessionEnd counts as idle', () => {
  const c = fakeClock();
  const s = createPetState({ now: c.now });
  s.onHook('UserPromptSubmit', 'a');
  s.onHook('SessionEnd', 'a');
  c.advance(2500);
  assert.equal(s.scene(), 'onsen');
});

test('two sessions stay in gym until both stop', () => {
  const c = fakeClock();
  const s = createPetState({ now: c.now });
  s.onHook('UserPromptSubmit', 'a');
  s.onHook('UserPromptSubmit', 'b');
  s.onHook('Stop', 'a');
  c.advance(10000);
  assert.equal(s.scene(), 'gym');
  s.onHook('Stop', 'b');
  c.advance(2499);
  assert.equal(s.scene(), 'gym');
  c.advance(1);
  assert.equal(s.scene(), 'onsen');
});

test('stale working session returns to onsen after 600000 ms', () => {
  const c = fakeClock();
  const s = createPetState({ now: c.now });
  s.onHook('UserPromptSubmit', 'a');
  c.advance(599999);
  assert.equal(s.scene(), 'gym');
  c.advance(1);
  assert.equal(s.scene(), 'onsen');
});

test('a fresh hook keeps a long-running session working', () => {
  const c = fakeClock();
  const s = createPetState({ now: c.now });
  s.onHook('UserPromptSubmit', 'a');
  c.advance(500000);
  s.onHook('PreToolUse', 'a');
  c.advance(500000);
  assert.equal(s.scene(), 'gym');
});

test('Notification counts as idle', () => {
  const c = fakeClock();
  const s = createPetState({ now: c.now });
  s.onHook('UserPromptSubmit', 'a');
  s.onHook('Notification', 'a');
  c.advance(2500);
  assert.equal(s.scene(), 'onsen');
});

test('unknown event is ignored', () => {
  const c = fakeClock();
  const s = createPetState({ now: c.now });
  s.onHook('SomethingElse', 'a');
  assert.equal(s.scene(), 'onsen');
  s.onHook('UserPromptSubmit', 'a');
  s.onHook('SomethingElse', 'a');
  c.advance(700000);
  assert.equal(s.scene(), 'onsen');
});
