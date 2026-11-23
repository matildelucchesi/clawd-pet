'use strict';

const WORKING_EVENTS = new Set(['UserPromptSubmit', 'PreToolUse', 'PostToolUse']);
const IDLE_EVENTS = new Set(['Stop', 'SessionEnd', 'Notification']);

function isKnownEvent(event) {
  return WORKING_EVENTS.has(event) || IDLE_EVENTS.has(event);
}

function createPetState({ idleDelayMs = 2500, staleMs = 600000, now = Date.now } = {}) {
  const sessions = new Map(); // sessionId -> { working, lastSeen }
  let lastIdleAt = -Infinity;

  function onHook(event, sessionId) {
    if (!isKnownEvent(event)) return false;
    const t = now();
    const working = WORKING_EVENTS.has(event);
    const prev = sessions.get(sessionId);
    if (!working && prev && prev.working) lastIdleAt = t;
    if (event === 'SessionEnd') sessions.delete(sessionId);
    else sessions.set(sessionId, { working, lastSeen: t });
    return true;
  }

  function scene() {
    const t = now();
    for (const [id, s] of sessions) {
      if (!s.working) continue;
      if (t - s.lastSeen < staleMs) return 'gym';
      // Stale: treat as idle from the moment it went stale.
      s.working = false;
      lastIdleAt = Math.max(lastIdleAt, s.lastSeen + staleMs - idleDelayMs);
      sessions.set(id, s);
    }
    return t - lastIdleAt < idleDelayMs ? 'gym' : 'onsen';
  }

  return { onHook, scene };
}

module.exports = { createPetState, isKnownEvent };
