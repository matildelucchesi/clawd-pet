'use strict';

// Returns tick(): reads petState.scene() and calls send(scene) only when it changed.
function createSceneTicker({ petState, send }) {
  let last = null;
  function tick() {
    const s = petState.scene();
    if (s !== last) {
      last = s;
      send(s);
    }
  }
  tick.resend = () => {
    last = null;
    tick();
  };
  return tick;
}

module.exports = { createSceneTicker };
