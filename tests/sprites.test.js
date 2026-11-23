const test = require('node:test');
const assert = require('node:assert/strict');
const { PALETTE } = require('../src/renderer/palette.js');
const { SPRITES } = require('../src/renderer/sprites.js');

const NAMES = ['onsen_idle', 'onsen_bubble', 'onsen_to_gym', 'gym_lift', 'gym_to_onsen', 'pet_onsen', 'pet_gym'];
const KEYS = '0123456789ab';

test('palette has 8 to 12 colours, index 0 transparent', () => {
  assert.ok(PALETTE.length >= 8 && PALETTE.length <= 12, `got ${PALETTE.length}`);
  assert.equal(PALETTE[0], 'transparent');
  for (const c of PALETTE.slice(1)) assert.match(c, /^#[0-9a-f]{6}$/i);
});

test('all seven animations exist', () => {
  for (const n of NAMES) assert.ok(SPRITES[n], `missing ${n}`);
});

test('every animation has 2-4 frames and frameMs >= 250', () => {
  for (const n of NAMES) {
    const a = SPRITES[n];
    assert.ok(a.frames.length >= 2 && a.frames.length <= 4, `${n}: ${a.frames.length} frames`);
    assert.ok(a.frameMs >= 250, `${n}: ${a.frameMs} ms`);
  }
});

test('every frame is 48x48', () => {
  for (const n of NAMES) {
    SPRITES[n].frames.forEach((f, i) => {
      assert.equal(f.length, 48, `${n}[${i}] rows`);
      f.forEach((row, y) => assert.equal(row.length, 48, `${n}[${i}] row ${y}`));
    });
  }
});

test('every char maps to the palette', () => {
  for (const n of NAMES) {
    for (const f of SPRITES[n].frames) {
      for (const row of f) {
        for (const ch of row) {
          if (ch === '.') continue;
          const idx = KEYS.indexOf(ch);
          assert.ok(idx >= 0 && idx < PALETTE.length, `${n}: bad char ${ch}`);
        }
      }
    }
  }
});

test('consecutive frames differ by a modest number of pixels (no flashing)', () => {
  for (const n of NAMES) {
    const fr = SPRITES[n].frames;
    for (let i = 1; i < fr.length; i++) {
      let diff = 0;
      for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) if (fr[i][y][x] !== fr[i - 1][y][x]) diff++;
      assert.ok(diff > 0, `${n}: frame ${i} identical to previous`);
      assert.ok(diff < 48 * 48 * 0.5, `${n}: frame ${i} changes ${diff} px`);
    }
  }
});
