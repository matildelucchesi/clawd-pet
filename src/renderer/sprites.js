'use strict';
// Pixel-art frames for the spa creature, drawn procedurally into 48x48 char grids.
// '.' = transparent, other chars index into PALETTE (see palette.js).
(function (root) {
  const W = 48;
  const H = 48;

  function blank() {
    return Array.from({ length: H }, () => Array(W).fill('.'));
  }
  function put(g, x, y, c) {
    if (x >= 0 && x < W && y >= 0 && y < H) g[y][x] = c;
  }
  function rect(g, x0, y0, w, h, c, clipY = H) {
    for (let y = y0; y < Math.min(y0 + h, clipY); y++) for (let x = x0; x < x0 + w; x++) put(g, x, y, c);
  }
  function inEllipse(x, y, cx, cy, rx, ry) {
    const dx = (x + 0.5 - cx) / rx;
    const dy = (y + 0.5 - cy) / ry;
    return dx * dx + dy * dy <= 1;
  }
  // Filled shape from a mask predicate, with a 1px outline in `outline` (or none).
  function shape(g, inside, fill, outline) {
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (!inside(x, y)) continue;
        const edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
        put(g, x, y, edge && outline ? outline : fill);
      }
    }
  }
  function stamp(g, x0, y0, rows) {
    rows.forEach((row, dy) => {
      for (let dx = 0; dx < row.length; dx++) if (row[dx] !== '.') put(g, x0 + dx, y0 + dy, row[dx]);
    });
  }

  // ---- the creature ----
  // Base shape on a 12x8 grid, drawn at 3x (36x24): 'X' body, 'E' eye.
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
  const CELL = 3;
  const BODY_W = 12 * CELL;
  const OX = (W - BODY_W) / 2; // creature is always horizontally centred

  // eyes: 'open' | 'half' | 'happy'; armsUp raises the arm blocks to head height.
  function drawCreature(g, oy, { eyes = 'open', blush = false, armsUp = false, clipY = H } = {}) {
    BASE.forEach((row, cy) => {
      for (let cx = 0; cx < 12; cx++) {
        if (row[cx] === '.') continue;
        const isArm = cx < 2 || cx > 9;
        if (armsUp && isArm) continue;
        rect(g, OX + cx * CELL, oy + cy * CELL, CELL, CELL, '2', clipY);
      }
    });
    if (armsUp) {
      for (const cx of [0, 10]) rect(g, OX + cx * CELL, oy, 2 * CELL, 2 * CELL, '2', clipY);
    }
    for (const cx of [3, 8]) {
      const ex = OX + cx * CELL;
      const ey = oy + CELL;
      if (eyes === 'open') {
        rect(g, ex, ey, CELL, CELL, '7', clipY);
      } else if (eyes === 'half') {
        rect(g, ex, ey + 1, CELL, 2, '2', clipY);
        rect(g, ex, ey + 2, CELL, 1, '7', clipY);
      } else if (eyes === 'happy') {
        rect(g, ex, ey, CELL, CELL, '2', clipY);
        put(g, ex, ey + 2, '7');
        put(g, ex + 1, ey + 1, '7');
        put(g, ex + 2, ey + 2, '7');
      }
    }
    if (blush) {
      rect(g, OX + 2 * CELL, oy + 2 * CELL + 1, CELL, 1, '8', clipY);
      rect(g, OX + 9 * CELL, oy + 2 * CELL + 1, CELL, 1, '8', clipY);
    }
  }

  // ---- onsen ----
  const WATER_Y = 32;
  const ONSEN_Y = 20; // creature top in the tub: rows 0-3 (head + arms) above water
  function drawTub(g, ripple) {
    shape(g, (x, y) => inEllipse(x, y, 24, 39, 23.5, 8), 'b', '1');
    shape(g, (x, y) => inEllipse(x, y, 24, 38, 20, 5.5), '4', null);
    for (let x = 6; x < 42; x++) if ((x + ripple * 3) % 7 === 0) put(g, x, WATER_Y + 2, '5');
    for (let x = 10; x < 38; x++) if ((x + ripple * 2) % 9 === 0) put(g, x, WATER_Y + 4, '5');
  }
  function drawWaterLine(g) {
    for (let x = OX - 1; x <= OX + BODY_W; x++) if (x % 2 === 0) put(g, x, WATER_Y, '5');
  }
  function drawTowel(g, oy) {
    stamp(g, OX + 2 * CELL - 1, oy - 5, [
      '.111111111111111111111111.',
      '16666666666666666666666661',
      '14444444444444444444444441',
      '16666666666666666666666661',
      '.111111111111111111111111.',
    ]);
  }
  const STEAM = [
    ['.5.', '5..', '.5.', '..5', '.5.'],
    ['..5', '.5.', '5..', '.5.', '..5'],
  ];
  function drawSteam(g, phase) {
    stamp(g, 3, 6 - (phase % 2), STEAM[phase % 2]);
    stamp(g, 42, 9 - ((phase + 1) % 2), STEAM[(phase + 1) % 2]);
    stamp(g, 37, 1 + (phase % 3), STEAM[phase % 2].slice(0, 3));
  }
  function onsenFrame({ steam = 0, ripple = steam, eyes = 'half', blush = false, oy = ONSEN_Y, towel = true, extra } = {}) {
    const g = blank();
    drawSteam(g, steam);
    drawTub(g, ripple);
    drawCreature(g, oy, { eyes, blush, clipY: WATER_Y });
    drawWaterLine(g);
    if (towel) drawTowel(g, oy);
    if (extra) extra(g);
    return g;
  }

  // ---- gym ----
  const MAT_Y = 40;
  const GYM_Y = MAT_Y - 8 * CELL; // feet on the mat
  function drawMat(g) {
    rect(g, 2, MAT_Y, 44, 4, '9');
    rect(g, 2, MAT_Y, 44, 1, '1');
    rect(g, 2, MAT_Y + 3, 44, 1, '1');
    rect(g, 2, MAT_Y, 1, 4, '1');
    rect(g, 45, MAT_Y, 1, 4, '1');
  }
  // a small upright dumbbell centred on (x, y), held in the creature's arm block
  function drawDumbbell(g, x, y) {
    stamp(g, x - 2, y - 4, [
      '11111',
      '1aaa1',
      '11111',
      '.1a1.',
      '.1a1.',
      '.1a1.',
      '11111',
      '1aaa1',
      '11111',
    ]);
  }
  function drawSweat(g, x, y) {
    stamp(g, x, y, ['.4.', '454', '.4.']);
  }
  function gymFrame({ oy = GYM_Y, lift = false, sweatY = GYM_Y - 4, eyes = 'open', blush = false, weights = true, extra } = {}) {
    const g = blank();
    drawMat(g);
    drawCreature(g, oy, { eyes, blush, armsUp: lift && weights });
    if (weights) {
      const wy = lift ? oy + CELL : oy + 3 * CELL;
      drawDumbbell(g, OX + 1, wy);
      drawDumbbell(g, OX + BODY_W - 2, wy);
    }
    if (sweatY !== null) drawSweat(g, OX + 10 * CELL, sweatY);
    if (extra) extra(g);
    return g;
  }

  // ---- extras ----
  const HEART = ['.1.1.', '18181', '18881', '.181.', '..1..'];
  const heart = (x, y) => (g) => stamp(g, x, y, HEART);
  const BUBBLE = ['.5.', '5.5', '.5.'];
  const bubble = (x, y) => (g) => stamp(g, x, y, BUBBLE);
  const splash = (lift) => (g) => {
    stamp(g, OX - 2, WATER_Y - 3 - lift, ['5..', '.5.']);
    stamp(g, OX + BODY_W - 1, WATER_Y - 3 - lift, ['..5', '.5.']);
  };
  function airFrame(oy, { eyes = 'open' } = {}) {
    const g = blank();
    drawCreature(g, oy, { eyes });
    stamp(g, 20, oy + 8 * CELL + 2, ['5...5...5', '.5.5.5.5.']);
    return g;
  }

  const toStrings = (g) => g.map((row) => row.join(''));
  const anim = (frameMs, frames) => ({ frameMs, frames: frames.map(toStrings) });

  const SPRITES = {
    onsen_idle: anim(900, [
      onsenFrame({ steam: 0 }),
      onsenFrame({ steam: 1 }),
      onsenFrame({ steam: 2 }),
    ]),
    onsen_bubble: anim(500, [
      onsenFrame({ steam: 0, extra: bubble(36, WATER_Y - 2) }),
      onsenFrame({ steam: 0, extra: bubble(37, WATER_Y - 6) }),
      onsenFrame({ steam: 1, extra: bubble(38, WATER_Y - 11) }),
    ]),
    onsen_to_gym: anim(400, [
      onsenFrame({ oy: ONSEN_Y - 4, eyes: 'open', towel: false, extra: splash(0) }),
      airFrame(10),
      gymFrame({ sweatY: null }),
    ]),
    gym_lift: anim(700, [
      gymFrame({ sweatY: GYM_Y - 5 }),
      gymFrame({ lift: true, sweatY: GYM_Y - 3 }),
      gymFrame({ sweatY: GYM_Y - 1 }),
    ]),
    gym_to_onsen: anim(400, [
      gymFrame({ oy: GYM_Y - 3, weights: false, sweatY: null, extra: (g) => { drawDumbbell(g, 4, MAT_Y - 4); drawDumbbell(g, 43, MAT_Y - 4); } }),
      airFrame(9, { eyes: 'happy' }),
      onsenFrame({ oy: ONSEN_Y + 1, eyes: 'happy', towel: false, extra: splash(2) }),
    ]),
    pet_onsen: anim(450, [
      onsenFrame({ eyes: 'happy', blush: true, extra: heart(38, 10) }),
      onsenFrame({ eyes: 'happy', blush: true, steam: 1, extra: heart(39, 6) }),
      onsenFrame({ eyes: 'happy', blush: true, steam: 2, extra: heart(39, 2) }),
    ]),
    pet_gym: anim(450, [
      gymFrame({ eyes: 'happy', blush: true, sweatY: null, extra: heart(38, 8) }),
      gymFrame({ oy: GYM_Y - 1, eyes: 'happy', blush: true, sweatY: null, extra: heart(39, 4) }),
      gymFrame({ eyes: 'happy', blush: true, sweatY: null, extra: heart(39, 0) }),
    ]),
  };

  const api = { SPRITES, W, H };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PetSprites = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
