'use strict';
/* global PetPalette, PetSprites, PetAnimator */

(function () {
  const SCALE = 3;
  const KEYS = '0123456789ab';
  const { PALETTE } = PetPalette;
  const { SPRITES } = PetSprites;
  const animator = PetAnimator.createAnimator({ sprites: SPRITES });

  const canvas = document.getElementById('pet');
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  let shown = null;
  function draw() {
    const frame = animator.frame();
    if (frame !== shown) {
      shown = frame;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let y = 0; y < frame.length; y++) {
        const row = frame[y];
        for (let x = 0; x < row.length; x++) {
          const ch = row[x];
          if (ch === '.') continue;
          ctx.fillStyle = PALETTE[KEYS.indexOf(ch)];
          ctx.fillRect(x * SCALE, y * SCALE, SCALE, SCALE);
        }
      }
    }
    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);

  window.pet.onScene((scene) => animator.setScene(scene));

  // ---- hover, click and drag on the pet's own pixels ----
  function pixelAt(ev) {
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((ev.clientX - rect.left) / SCALE);
    const y = Math.floor((ev.clientY - rect.top) / SCALE);
    if (!shown || y < 0 || y >= shown.length || x < 0 || x >= shown[y].length) return false;
    return shown[y][x] !== '.';
  }

  let over = false;
  let press = null; // { x, y, dragging }
  const DRAG_THRESHOLD = 4;

  function setOver(next) {
    if (next === over) return;
    over = next;
    window.pet.setOverPet(over);
    canvas.classList.toggle('over', over);
    if (over && !press) animator.pet(); // hover = gentle pat
  }

  window.addEventListener('mousemove', (ev) => {
    if (press) {
      if (!press.dragging && Math.hypot(ev.screenX - press.x, ev.screenY - press.y) > DRAG_THRESHOLD) {
        press.dragging = true;
        canvas.classList.add('dragging');
        window.pet.dragStart();
      }
      if (press.dragging) window.pet.dragMove();
      return;
    }
    setOver(pixelAt(ev));
  });
  window.addEventListener('mouseleave', () => { if (!press) setOver(false); });

  canvas.addEventListener('mousedown', (ev) => {
    if (ev.button !== 0 || !pixelAt(ev)) return;
    press = { x: ev.screenX, y: ev.screenY, dragging: false };
  });
  window.addEventListener('mouseup', (ev) => {
    if (!press) return;
    const wasDrag = press.dragging;
    press = null;
    canvas.classList.remove('dragging');
    if (wasDrag) window.pet.dragEnd();
    else animator.pet();
    setOver(pixelAt(ev));
  });
})();
