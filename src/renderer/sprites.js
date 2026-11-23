'use strict';
// Pixel-art frames for the spa star, drawn procedurally into 48x48 char grids.
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
  function rect(g, x0, y0, w, h, c) {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) put(g, x, y, c);
  }
  function inEllipse(x, y, cx, cy, rx, ry) {
    const dx = (x + 0.5 - cx) / rx;
    const dy = (y + 0.5 - cy) / ry;
    return dx * dx + dy * dy <= 1;
  }
  // Filled shape from a mask predicate, with a 1px outline in `outline` (or none).
  function shape(g, inside, fill, outline, clip = () => true) {
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (!inside(x, y) || !clip(x, y)) continue;
        const edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
        put(g, x, y, edge && outline ? outline : typeof fill === 'function' ? fill(x, y) : fill);
      }
    }
  }
  function stamp(g, x0, y0, rows) {
    rows.forEach((row, dy) => {
      for (let dx = 0; dx < row.length; dx++) if (row[dx] !== '.') put(g, x0 + dx, y0 + dy, row[dx]);
    });
  }

  // ---- the star ----
  const R = 14;
  const r = 8;

  function starPoly(cx, cy) {
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const rad = i % 2 === 0 ? R : r;
      pts.push([cx + rad * Math.cos(a), cy + rad * Math.sin(a)]);
    }
    return pts;
  }
  function inPoly(px, py, pts) {
    let ins = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i];
      const [xj, yj] = pts[j];
      if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) ins = !ins;
    }
    return ins;
  }

  // eyes: 'open' | 'half' | 'happy'; mouth: 'smile' | 'o' | 'effort'
  function drawStar(g, cx, cy, { eyes = 'open', mouth = 'smile', blush = false, clipY = H } = {}) {
    const pts = starPoly(cx, cy);
    const inside = (x, y) => inPoly(x + 0.5, y + 0.5, pts);
    const fill = (x, y) => ((x - cx) + (y - cy) < -10 ? '3' : '2');
    shape(g, inside, fill, '1', (x, y) => y < clipY);

    const ex = Math.round(cx);
    const ey = Math.round(cy) - 2;
    // left eye covers x ex-5..ex-4, right eye ex+4..ex+5
    for (const x0 of [ex - 6, ex + 5]) {
      if (eyes === 'open') {
        rect(g, x0, ey, 2, 2, '7');
      } else if (eyes === 'half') {
        rect(g, x0, ey, 2, 1, '1');
        rect(g, x0, ey + 1, 2, 1, '7');
      } else if (eyes === 'happy') {
        put(g, x0 - 1 + (x0 > ex ? 1 : 0), ey + 1, '7');
        put(g, x0 + (x0 > ex ? 1 : 0), ey, '7');
        put(g, x0 + 1 + (x0 > ex ? 1 : 0), ey + 1, '7');
      }
    }
    if (blush) {
      rect(g, ex - 9, ey + 2, 2, 1, '8');
      rect(g, ex + 8, ey + 2, 2, 1, '8');
    }
    const my = ey + 3;
    if (mouth === 'smile') {
      put(g, ex - 1, my, '7');
      put(g, ex, my + 1, '7');
      put(g, ex + 1, my, '7');
    } else if (mouth === 'o') {
      rect(g, ex - 1, my, 2, 2, '7');
    } else if (mouth === 'effort') {
      rect(g, ex - 1, my + 1, 3, 1, '7');
    }
  }

  // ---- onsen ----
  const WATER_Y = 32;
  function drawTub(g, ripple) {
    shape(g, (x, y) => inEllipse(x, y, 24, 39, 23, 8), 'b', '1');
    shape(g, (x, y) => inEllipse(x, y, 24, 38, 19, 5.5), '4', null);
    for (let x = 8; x < 40; x++) if ((x + ripple * 3) % 7 === 0) put(g, x, WATER_Y + 2, '5');
    for (let x = 12; x < 36; x++) if ((x + ripple * 2) % 9 === 0) put(g, x, WATER_Y + 4, '5');
  }
  function drawWaterFront(g, cx) {
    for (let x = cx - 11; x <= cx + 11; x++) if (x % 2 === 0) put(g, x, WATER_Y, '5');
  }
  function drawTowel(g, cx, topY) {
    stamp(g, cx - 5, topY - 3, [
      '.111111111.',
      '16666666661',
      '14444444441',
      '16666666661',
      '.111111111.',
    ]);
  }
  const STEAM = [
    ['.5.', '5..', '.5.', '..5', '.5.'],
    ['..5', '.5.', '5..', '.5.', '..5'],
  ];
  function drawSteam(g, phase) {
    stamp(g, 6, 9 - (phase % 2), STEAM[phase % 2]);
    stamp(g, 39, 11 - ((phase + 1) % 2), STEAM[(phase + 1) % 2]);
    stamp(g, 33, 3 + (phase % 3), STEAM[phase % 2].slice(0, 3));
  }
  function onsenFrame({ steam = 0, ripple = steam, eyes = 'half', mouth = 'smile', blush = false, cy = 26, towel = true, extra } = {}) {
    const g = blank();
    drawSteam(g, steam);
    drawTub(g, ripple);
    drawStar(g, 24, cy, { eyes, mouth, blush, clipY: WATER_Y });
    drawWaterFront(g, 24);
    if (towel) drawTowel(g, 24, cy - R + 1);
    if (extra) extra(g);
    return g;
  }

  // ---- gym ----
  const MAT_Y = 37;
  function drawMat(g) {
    rect(g, 3, MAT_Y, 42, 4, '9');
    rect(g, 3, MAT_Y, 42, 1, '1');
    rect(g, 3, MAT_Y + 3, 42, 1, '1');
    rect(g, 3, MAT_Y, 1, 4, '1');
    rect(g, 44, MAT_Y, 1, 4, '1');
  }
  // a small dumbbell centred on (x, y)
  function drawDumbbell(g, x, y) {
    stamp(g, x - 4, y - 2, [
      '11...11.',
      '1a1111a1',
      '1aaaaaa1',
      '1a1111a1',
      '11...11.',
    ].map((row) => row.slice(0, 8)));
  }
  function drawSweat(g, x, y) {
    stamp(g, x, y, ['.4.', '454', '.4.']);
  }
  function gymFrame({ cy = 24, lift = false, sweatY = 9, eyes = 'open', mouth = 'effort', blush = false, weights = true, extra } = {}) {
    const g = blank();
    drawMat(g);
    const armY = Math.round(cy - R * Math.sin(Math.PI / 10));
    const armDX = Math.round(R * Math.cos(Math.PI / 10));
    const wY = lift ? armY - 5 : armY;
    if (weights && lift) {
      for (const ax of [24 - armDX, 24 + armDX - 1]) {
        rect(g, ax - 1, wY, 3, armY - wY + 1, '1');
        rect(g, ax, wY + 1, 1, armY - wY, '2');
      }
    }
    drawStar(g, 24, cy, { eyes, mouth, blush });
    if (weights) {
      drawDumbbell(g, 24 - armDX, wY);
      drawDumbbell(g, 24 + armDX, wY);
    }
    if (sweatY !== null) drawSweat(g, 31, sweatY);
    if (extra) extra(g);
    return g;
  }

  // ---- extras ----
  const HEART = ['.1.1.', '18181', '18881', '.181.', '..1..'];
  const heart = (x, y) => (g) => stamp(g, x, y, HEART);
  const BUBBLE = ['.5.', '5.5', '.5.'];
  const bubble = (x, y) => (g) => stamp(g, x, y, BUBBLE);
  const splash = (lift) => (g) => {
    stamp(g, 12, WATER_Y - 2 - lift, ['5..', '.5.']);
    stamp(g, 33, WATER_Y - 2 - lift, ['..5', '.5.']);
  };
  function airFrame(cy, { eyes = 'open', mouth = 'o' } = {}) {
    const g = blank();
    drawStar(g, 24, cy, { eyes, mouth });
    stamp(g, 20, cy + R + 2, ['5...5', '.5.5.']);
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
      onsenFrame({ steam: 0, extra: bubble(34, WATER_Y - 1) }),
      onsenFrame({ steam: 0, mouth: 'o', extra: bubble(35, WATER_Y - 5) }),
      onsenFrame({ steam: 1, extra: bubble(36, WATER_Y - 10) }),
    ]),
    onsen_to_gym: anim(400, [
      onsenFrame({ cy: 23, eyes: 'open', mouth: 'o', towel: false, extra: splash(0) }),
      airFrame(17),
      gymFrame({ sweatY: null, mouth: 'smile' }),
    ]),
    gym_lift: anim(700, [
      gymFrame({ sweatY: 8 }),
      gymFrame({ lift: true, sweatY: 10 }),
      gymFrame({ sweatY: 12 }),
    ]),
    gym_to_onsen: anim(400, [
      gymFrame({ cy: 22, weights: false, sweatY: null, mouth: 'o', extra: (g) => { drawDumbbell(g, 9, MAT_Y - 3); drawDumbbell(g, 39, MAT_Y - 3); } }),
      airFrame(17, { eyes: 'happy', mouth: 'smile' }),
      onsenFrame({ cy: 27, eyes: 'happy', mouth: 'o', towel: false, extra: splash(2) }),
    ]),
    pet_onsen: anim(450, [
      onsenFrame({ eyes: 'happy', blush: true, extra: heart(35, 12) }),
      onsenFrame({ eyes: 'happy', blush: true, steam: 1, extra: heart(36, 8) }),
      onsenFrame({ eyes: 'happy', blush: true, steam: 2, extra: heart(36, 4) }),
    ]),
    pet_gym: anim(450, [
      gymFrame({ eyes: 'happy', blush: true, mouth: 'smile', sweatY: null, extra: heart(37, 10) }),
      gymFrame({ eyes: 'happy', blush: true, mouth: 'smile', sweatY: null, extra: heart(38, 6) }),
      gymFrame({ eyes: 'happy', blush: true, mouth: 'smile', sweatY: null, extra: heart(38, 2) }),
    ]),
  };

  const api = { SPRITES, W, H };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PetSprites = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
