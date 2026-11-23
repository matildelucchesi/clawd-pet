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

// Matilde's character: blocky creature, 12x8 base grid, drawn at 3x.
const BASE = [
  '..XXXXXXXX..',
  '..XEXXXXEX..',
  'XXXXXXXXXXXX',
  'XXXXXXXXXXXX',
  '..XXXXXXXX..',
  '..XXXXXXXX..',
  '..X.X..X.X..',
  '..X.X..X.X..',
];

function containsCreature(frame) {
  for (let oy = 0; oy + 24 <= 48; oy++) {
    for (let ox = 0; ox + 36 <= 48; ox++) {
      let ok = true;
      for (let y = 0; y < 24 && ok; y++) {
        for (let x = 0; x < 36 && ok; x++) {
          const cell = BASE[Math.floor(y / 3)][Math.floor(x / 3)];
          const want = cell === 'X' ? '2' : cell === 'E' ? '7' : '.';
          if (frame[oy + y][ox + x] !== want) ok = false;
        }
      }
      if (ok) return true;
    }
  }
  return false;
}

test('body colour is terracotta #D97757 and eyes are black-ish', () => {
  assert.equal(PALETTE[2].toLowerCase(), '#d97757');
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(PALETTE[7].substr(i, 2), 16));
  assert.ok(r + g + b < 90, `eyes too light: ${PALETTE[7]}`);
});

test('mid-jump frames show the full base creature at 3x', () => {
  assert.ok(containsCreature(SPRITES.onsen_to_gym.frames[1]), 'onsen_to_gym[1]');
  assert.ok(containsCreature(SPRITES.gym_to_onsen.frames[1]) === false, 'gym_to_onsen[1] has happy eyes, so not the base face');
});

// Onsen: only the top of the head, the eyes and the towel stick out of the water.
const lowestRow = (frame, ch) => {
  for (let y = 47; y >= 0; y--) if (frame[y].includes(ch)) return y;
  return -1;
};

test('in the onsen the water line sits just below the eyes', () => {
  for (const name of ['onsen_idle', 'onsen_bubble', 'pet_onsen']) {
    SPRITES[name].frames.forEach((f, i) => {
      const eyes = lowestRow(f, '7');
      const body = lowestRow(f, '2');
      assert.ok(eyes > 0, `${name}[${i}] eyes visible`);
      assert.ok(body - eyes <= 1, `${name}[${i}]: body shows ${body - eyes} rows below the eyes`);
    });
  }
});

test('steam rises in staggered wisps: low and high puffs in every idle frame', () => {
  const idle = SPRITES.onsen_idle.frames;
  assert.equal(idle.length, 4);
  const steamIn = (f, y0, y1) => {
    let n = 0;
    for (let y = y0; y <= y1; y++) for (let x = 0; x < 48; x++) if ((x < 11 || x > 36) && f[y][x] === '5') n++;
    return n;
  };
  idle.forEach((f, i) => {
    assert.ok(steamIn(f, 22, 30) > 0, `frame ${i}: no steam near the water`);
    assert.ok(steamIn(f, 0, 14) > 0, `frame ${i}: no steam up high`);
  });
});

test('in the onsen the arms are under water', () => {
  for (const name of ['onsen_idle', 'onsen_bubble', 'pet_onsen']) {
    SPRITES[name].frames.forEach((f, i) => {
      for (let y = 0; y < 48; y++) {
        assert.notEqual(f[y][6], '2', `${name}[${i}] left arm at y=${y}`);
        assert.notEqual(f[y][41], '2', `${name}[${i}] right arm at y=${y}`);
      }
    });
  }
});
