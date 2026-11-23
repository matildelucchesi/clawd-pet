'use strict';
// Picks which sprite frame to show, given the current scene and time.
// Pure apart from the injected clock and random source, so it runs in node tests.
(function (root) {
  const LOOP = { onsen: 'onsen_idle', gym: 'gym_lift' };
  const TRANSITION = { gym: 'onsen_to_gym', onsen: 'gym_to_onsen' };
  const PET = { onsen: 'pet_onsen', gym: 'pet_gym' };
  const BUBBLE_MIN_MS = 8000;
  const BUBBLE_SPREAD_MS = 7000;

  function createAnimator({ sprites, now = () => performance.now(), random = Math.random }) {
    let scene = 'onsen';      // scene the current/last loop belongs to
    let wanted = 'onsen';     // latest scene requested by setScene
    let anim = { name: LOOP.onsen, start: now(), kind: 'loop' };
    let nextBubbleAt = anim.start + BUBBLE_MIN_MS + random() * BUBBLE_SPREAD_MS;

    const duration = (name) => sprites[name].frames.length * sprites[name].frameMs;

    function play(name, kind, start) {
      anim = { name, start, kind };
    }
    function loop(start) {
      play(LOOP[scene], 'loop', start);
      if (scene === 'onsen') nextBubbleAt = start + BUBBLE_MIN_MS + random() * BUBBLE_SPREAD_MS;
    }
    // After a one-shot ends (or while looping), start the transition if one is owed.
    function settle(start) {
      if (wanted !== scene) {
        scene = wanted;
        play(TRANSITION[scene], 'transition', start);
      } else {
        loop(start);
      }
    }

    function advance(t) {
      // Process every event that happened up to t, in order.
      for (let guard = 0; guard < 1000; guard++) {
        if (anim.kind === 'loop') {
          if (scene === 'onsen' && nextBubbleAt <= t) {
            play('onsen_bubble', 'bubble', nextBubbleAt);
            continue;
          }
          return;
        }
        const end = anim.start + duration(anim.name);
        if (end > t) return;
        settle(end);
      }
    }

    function setScene(s) {
      if (s !== 'onsen' && s !== 'gym') return;
      const t = now();
      advance(t);
      wanted = s;
      // Loops and bubbles give way at once; pets and transitions finish first.
      if (anim.kind === 'loop' || anim.kind === 'bubble') {
        if (wanted !== scene) settle(t);
      }
    }

    function pet() {
      const t = now();
      advance(t);
      if (anim.kind === 'transition' || anim.kind === 'pet') return;
      play(PET[scene], 'pet', t);
    }

    function frame() {
      const t = now();
      advance(t);
      const s = sprites[anim.name];
      const i = Math.floor((t - anim.start) / s.frameMs);
      return s.frames[anim.kind === 'loop' ? i % s.frames.length : Math.min(i, s.frames.length - 1)];
    }

    return { setScene, pet, frame, scene: () => scene };
  }

  const api = { createAnimator };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PetAnimator = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
