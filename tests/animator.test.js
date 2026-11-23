const test = require('node:test');
const assert = require('node:assert/strict');
const { SPRITES } = require('../src/renderer/sprites.js');
const { createAnimator } = require('../src/renderer/animator.js');

function setup(random = () => 0.5) {
  let t = 0;
  const a = createAnimator({ sprites: SPRITES, now: () => t, random });
  return { a, advance: (ms) => { t += ms; }, at: (ms) => { t = ms; } };
}
const F = (name, i) => SPRITES[name].frames[i];
const ms = (name) => SPRITES[name].frameMs;
const len = (name) => SPRITES[name].frames.length * ms(name);

test('loops onsen_idle at its frameMs', () => {
  const { a, advance } = setup();
  assert.equal(a.frame(), F('onsen_idle', 0));
  advance(ms('onsen_idle') - 1);
  assert.equal(a.frame(), F('onsen_idle', 0));
  advance(1);
  assert.equal(a.frame(), F('onsen_idle', 1));
  advance(ms('onsen_idle') * (SPRITES.onsen_idle.frames.length - 1));
  assert.equal(a.frame(), F('onsen_idle', 0), 'wraps around');
});

test('setScene gym plays onsen_to_gym once then loops gym_lift', () => {
  const { a, advance } = setup();
  a.setScene('gym');
  assert.equal(a.frame(), F('onsen_to_gym', 0));
  advance(ms('onsen_to_gym'));
  assert.equal(a.frame(), F('onsen_to_gym', 1));
  advance(len('onsen_to_gym') - ms('onsen_to_gym'));
  assert.equal(a.frame(), F('gym_lift', 0));
  advance(len('gym_lift'));
  assert.equal(a.frame(), F('gym_lift', 0), 'loops');
});

test('setScene onsen from gym plays gym_to_onsen then onsen_idle', () => {
  const { a, advance } = setup();
  a.setScene('gym');
  advance(len('onsen_to_gym'));
  a.frame();
  a.setScene('onsen');
  assert.equal(a.frame(), F('gym_to_onsen', 0));
  advance(len('gym_to_onsen'));
  assert.equal(a.frame(), F('onsen_idle', 0));
});

test('setScene with the current scene does nothing', () => {
  const { a } = setup();
  a.setScene('onsen');
  assert.equal(a.frame(), F('onsen_idle', 0));
});

test('pet in gym plays pet_gym then back to gym_lift, scene unchanged', () => {
  const { a, advance } = setup();
  a.setScene('gym');
  advance(len('onsen_to_gym'));
  a.frame();
  a.pet();
  assert.equal(a.frame(), F('pet_gym', 0));
  assert.equal(a.scene(), 'gym');
  advance(len('pet_gym'));
  assert.equal(a.frame(), F('gym_lift', 0));
  assert.equal(a.scene(), 'gym');
});

test('pet in onsen plays pet_onsen then onsen_idle', () => {
  const { a, advance } = setup();
  a.pet();
  assert.equal(a.frame(), F('pet_onsen', 0));
  advance(len('pet_onsen'));
  assert.equal(a.frame(), F('onsen_idle', 0));
});

test('pet during a transition is ignored', () => {
  const { a, advance } = setup();
  a.setScene('gym');
  advance(ms('onsen_to_gym'));
  a.pet();
  assert.equal(a.frame(), F('onsen_to_gym', 1));
  advance(len('onsen_to_gym') - ms('onsen_to_gym'));
  assert.equal(a.frame(), F('gym_lift', 0));
});

test('setScene during pet waits until the pet ends', () => {
  const { a, advance } = setup();
  a.pet();
  advance(ms('pet_onsen'));
  a.setScene('gym');
  assert.equal(a.frame(), F('pet_onsen', 1));
  advance(len('pet_onsen') - ms('pet_onsen'));
  assert.equal(a.frame(), F('onsen_to_gym', 0));
  advance(len('onsen_to_gym'));
  assert.equal(a.frame(), F('gym_lift', 0));
});

test('scene flip-flop during a pet that ends where it started plays no transition', () => {
  const { a, advance } = setup();
  a.pet();
  a.setScene('gym');
  a.setScene('onsen');
  advance(len('pet_onsen'));
  assert.equal(a.frame(), F('onsen_idle', 0));
});

test('setScene during a transition is applied after it', () => {
  const { a, advance } = setup();
  a.setScene('gym');
  advance(ms('onsen_to_gym'));
  a.setScene('onsen');
  assert.equal(a.frame(), F('onsen_to_gym', 1));
  advance(len('onsen_to_gym') - ms('onsen_to_gym'));
  assert.equal(a.frame(), F('gym_to_onsen', 0));
});

for (const [r, expected] of [[0, 8000], [0.5, 11500], [0.999, 14993]]) {
  test(`bubble plays once between 8 and 15 s (random=${r})`, () => {
    const { a, at } = setup(() => r);
    at(expected - 1);
    assert.notEqual(a.frame(), F('onsen_bubble', 0));
    at(Math.ceil(expected));
    assert.equal(a.frame(), F('onsen_bubble', 0));
    at(Math.ceil(expected) + len('onsen_bubble'));
    assert.ok(SPRITES.onsen_idle.frames.includes(a.frame()), 'back to idle');
  });
}

test('no bubble in the gym', () => {
  const { a, advance } = setup(() => 0);
  a.setScene('gym');
  for (let i = 0; i < 100; i++) {
    advance(500);
    const f = a.frame();
    assert.ok(!SPRITES.onsen_bubble.frames.includes(f));
  }
});
