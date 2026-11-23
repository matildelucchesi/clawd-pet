# Pet Claude della spa — Implementation Plan

**Goal:** A pixel-art blocky creature pet in a small always-on-top Windows desktop window that soaks in an onsen while Claude is idle and goes to the gym while Claude Code (Code tab, terminal, Cowork if reachable) is working, with petting as the only interaction.

**Architecture:** An Electron app with a transparent, frameless, always-on-top window. The main process runs a tiny HTTP server on `127.0.0.1:47321`; Claude Code hooks POST their event JSON to it with `curl`. A pure state module turns hook events into `'onsen' | 'gym'`, and the renderer draws palette-indexed sprites on a canvas with slow frame timing.

**Tech Stack:** Node 20+, Electron (latest stable), plain HTML/JS + `<canvas>`, `node:test` for tests, `electron-builder` for a portable `.exe`. No other runtime dependencies.

## Global Constraints
- Platform: Windows 10/11 x64. Hooks use the built-in `curl.exe`.
- Pet (changed 2026-11-23 at Matilde's request, from her reference image): flat blocky creature, colour #D97757 with black square eyes, no outline. Base shape on a 12×8 grid ('X' body, 'E' eye), drawn at 3× (36×24) inside the 48×48 sprite:
  `..XXXXXXXX..` / `..XEXXXXEX..` / `XXXXXXXXXXXX` / `XXXXXXXXXXXX` / `..XXXXXXXX..` / `..XXXXXXXX..` / `..X.X..X.X..` / `..X.X..X.X..` (wide body, two eyes near the top, stubby arms at rows 2–3, four short legs).
- Pixel art, palette of 8–12 colours, sprite 48×48 logical pixels drawn at 3× (144×144), nearest-neighbour scaling.
- Slow animations: no frame shorter than 250 ms; nothing flashing.
- Scenes: `onsen` (idle: in steaming water, folded towel on head, half-closed eyes, occasional bubble) and `gym` (working: lifting weights or pedalling slowly, sweat drop).
- Back-to-onsen delay: 2500 ms after the last session stops working.
- Petting (hover or click) plays a short reaction and never changes the scene.
- Regular Claude chat: no detection; pet stays in onsen. No activity guessing anywhere.
- No timer, coins, shop or purchasable items.
- Hooks must never slow down or break Claude: 1 s timeout, always exit 0.

## Review Focus
1. Claude interrupted/crashes and `Stop` never arrives → pet returns to onsen after 10 min without any hook from that session (Task 1).
2. Two Claude sessions at once, one finishes → pet stays in gym until every session is idle (Task 1).
3. Widget not running when hooks fire → `curl` fails fast and silently, Claude unaffected (Task 3).
4. Existing `~/.claude/settings.json` hooks/settings → installer keeps them, is idempotent, writes a backup (Task 3).
5. Malformed/empty POST body or unknown event → 400/204 and state unchanged (Task 2).

## File Structure
pet-spa/ package.json; src/main/main.js (window+wiring, T6); src/main/state.js (T1); src/main/server.js (T2); src/main/preload.js (T6); src/hooks/install.js (T3); src/renderer/index.html, palette.js, sprites.js (T4), animator.js (T5), renderer.js (T6); tests/*.test.js

### Task 1: Pet state machine
Files: package.json, src/main/state.js, tests/state.test.js
Produces: `createPetState({ idleDelayMs = 2500, staleMs = 600000, now = Date.now }) → { onHook(event, sessionId), scene(): 'onsen'|'gym' }`. Mapping: UserPromptSubmit, PreToolUse, PostToolUse → working; Stop, SessionEnd, Notification → idle. Unknown ignored. scene() is 'gym' if any session working, or last session went idle < idleDelayMs ago; working session with no hook for staleMs counts idle.
Steps: npm init -y, "type":"commonjs", "test":"node --test tests/". Failing tests with fake clock: starts in onsen; UserPromptSubmit goes to gym; Stop returns to onsen only after 2500 ms (+2499 gym, +2500 onsen); two sessions stays gym until both stop; stale working session returns to onsen after 600000 ms; Notification counts as idle; unknown event ignored. Run → FAIL. Implement (Map<sessionId,{working,lastSeen}> + lastIdleAt). Run → PASS. git init, commit "feat: pet state machine".

### Task 2: Local hook server
Files: src/main/server.js, tests/server.test.js
Produces: `startServer({ port = 47321, petState, onChange }) → Promise<http.Server>`, 127.0.0.1 only. POST /hook with Claude Code hook JSON body; reads hook_event_name and session_id; calls onChange(petState.scene()) after each accepted event. 204 accepted, 400 bad JSON/missing fields, 404 other paths. Body limit 64 KB.
Tests (port 0, fetch): accepts UserPromptSubmit and reports gym; malformed JSON → 400, stays onsen; empty body → 400; GET / → 404. FAIL → implement node:http → PASS → commit "feat: local hook server".

### Task 3: Hook installer
Files: src/hooks/install.js, tests/install.test.js
Produces: pure `mergeHooks(settings) → settings` and CLI `node src/hooks/install.js [--settings <path>]` (default %USERPROFILE%\.claude\settings.json), npm script "install-hooks". Command for every event: `curl.exe -s -m 1 -X POST -H "Content-Type: application/json" --data-binary @- http://127.0.0.1:47321/hook || exit /b 0`. Events: UserPromptSubmit, PreToolUse, PostToolUse, Stop, SessionEnd, Notification. The command string is the identity for idempotency.
Tests: adds all six events to empty settings; keeps existing hooks and unrelated keys; idempotent. FAIL → implement (missing file → {}, writes settings.json.bak-<timestamp> before save) → PASS. Manual: with widget closed, a Claude Code prompt responds normally, no hook error, no delay > ~1 s. Commit "feat: claude code hook installer".

### Task 4: Palette and sprites
Files: src/renderer/palette.js, sprites.js, tests/sprites.test.js
Produces: PALETTE: string[] (8–12 hex, index 0 transparent); SPRITES: Record<AnimName,{frames: string[][], frameMs}>, each frame 48 strings × 48 chars ('.' transparent, '0'–'9','a','b' palette index). AnimName: onsen_idle, onsen_bubble, onsen_to_gym, gym_lift, gym_to_onsen, pet_onsen, pet_gym. Backgrounds (water+steam, gym mat+weights) in same frames.
Tests: palette 8–12; every frame 48×48; every char maps to palette; frameMs ≥ 250; all seven exist. FAIL → draw pixel art as char grids (2–4 frames each; towel on head + half-closed eyes in onsen; sweat drop in gym) → PASS → commit "feat: pixel art sprites".

### Task 5: Animator
Files: src/renderer/animator.js, tests/animator.test.js
Produces: `createAnimator({ sprites, now = performance.now, random = Math.random }) → { setScene(s), pet(), frame(): string[] }`. Scene change plays transition once then loops scene anim; in onsen, onsen_bubble once every ~8–15 s; pet() plays pet_onsen/pet_gym once then back to loop; pet() during transition ignored; setScene during pet waits until it ends.
Tests (fake clock, fixed random): loops onsen_idle at frameMs; setScene gym plays onsen_to_gym then gym_lift; pet in gym plays pet_gym then gym_lift, scene unchanged; pet during transition ignored; bubble between 8 and 15 s. FAIL → implement → PASS → commit "feat: animator".

### Task 6: Desktop window
Files: src/main/main.js, preload.js, src/renderer/index.html, renderer.js; package.json ("main", "start":"electron .", devDependency electron).
Window 160×160, transparent, frameless, alwaysOnTop, skipTaskbar, not resizable, draggable by body (-webkit-app-region: drag, except pet pixels handling hover/click). Tray icon with "Esci". Main ticks petState.scene() every 500 ms, sends changes over IPC 'scene'; preload exposes window.pet.onScene(cb). Port 47321 busy → log, pet stays onsen, tray tooltip "Porta occupata". Renderer draws animator.frame() with imageSmoothingEnabled=false at 3×.
Checks: npm start → star in onsen, on top, draggable; prompt in Claude desktop Code tab → gym, back to onsen ~2.5 s after finish; hover/click → reaction, scene unchanged; second server on 47321 first → app opens, onsen, tooltip "Porta occupata". npm test → PASS. Commit "feat: desktop window".

### Task 7: Cowork check
In a Cowork task with hooks installed, send a prompt and watch the pet. If it reacts, note in README. If not (VM can't reach 127.0.0.1 on the PC), note in README that Cowork leaves the pet in onsen and tell Matilde. No guessing.

### Task 8: Package and README
README.md (Italian); package.json electron-builder, "dist":"electron-builder --win portable". npm run dist → dist/PetClaudeSpa.exe launches and behaves as Task 6. README: start the pet, npm run install-hooks, behaviour in Code/terminal/Cowork/chat, quit, remove hooks (restore backup). Commit "chore: packaging and readme".
