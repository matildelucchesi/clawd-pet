const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { mergeHooks, removeHooks, HOOK_COMMAND, EVENTS } = require('../src/hooks/install.js');

const SIX = ['UserPromptSubmit', 'PreToolUse', 'PostToolUse', 'Stop', 'SessionEnd', 'Notification'];

function commandsFor(settings, event) {
  return (settings.hooks[event] || []).flatMap((g) => (g.hooks || []).map((h) => h.command));
}

test('command always exits 0 in bash and cmd, posts to the hook endpoint with 1 s timeout', () => {
  assert.match(HOOK_COMMAND, /^curl\.exe -s -m 1 /);
  assert.match(HOOK_COMMAND, /http:\/\/127\.0\.0\.1:47321\/hook/);
  assert.match(HOOK_COMMAND, /\|\| exit 0$/);
  assert.doesNotMatch(HOOK_COMMAND, /exit \/b/);
  assert.match(HOOK_COMMAND, / --connect-timeout 0\.2 /, 'closed widget must fail fast');
});

test('adds all six events to empty settings', () => {
  const out = mergeHooks({});
  assert.deepEqual([...EVENTS].sort(), [...SIX].sort());
  for (const e of SIX) assert.deepEqual(commandsFor(out, e), [HOOK_COMMAND]);
  for (const e of SIX) assert.equal(out.hooks[e][0].hooks[0].type, 'command');
  for (const e of SIX) assert.equal(out.hooks[e][0].hooks[0].timeout, 5);
});

test('hooks run async so Claude never waits on the pet', () => {
  const out = mergeHooks({});
  for (const e of SIX) assert.equal(out.hooks[e][0].hooks[0].async, true, e);
});

test('an older pet hook (different command string) is upgraded in place, not duplicated', () => {
  const old = 'curl.exe -s -m 1 -X POST -H "Content-Type: application/json" --data-binary @- http://127.0.0.1:47321/hook || exit 0';
  const before = {
    hooks: {
      Stop: [
        { hooks: [{ type: 'command', command: 'echo done' }] },
        { hooks: [{ type: 'command', command: old, timeout: 5 }] },
      ],
    },
  };
  const out = mergeHooks(before);
  assert.deepEqual(commandsFor(out, 'Stop'), ['echo done', HOOK_COMMAND]);
  assert.equal(out.hooks.Stop[1].hooks[0].async, true);
  assert.deepEqual(removeHooks(out), { hooks: { Stop: [{ hooks: [{ type: 'command', command: 'echo done' }] }] } });
});

test('keeps existing hooks and unrelated keys', () => {
  const existing = {
    enabledPlugins: { 'x@y': true },
    hooks: {
      Stop: [{ hooks: [{ type: 'command', command: 'echo done' }] }],
      PreToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command: 'lint' }] }],
      SubagentStop: [{ hooks: [{ type: 'command', command: 'other' }] }],
    },
  };
  const snapshot = JSON.parse(JSON.stringify(existing));
  const out = mergeHooks(existing);
  assert.deepEqual(existing, snapshot, 'input not mutated');
  assert.deepEqual(out.enabledPlugins, { 'x@y': true });
  assert.deepEqual(commandsFor(out, 'Stop'), ['echo done', HOOK_COMMAND]);
  assert.deepEqual(commandsFor(out, 'PreToolUse'), ['lint', HOOK_COMMAND]);
  assert.equal(out.hooks.PreToolUse[0].matcher, 'Bash');
  assert.deepEqual(out.hooks.SubagentStop, existing.hooks.SubagentStop);
});

test('is idempotent', () => {
  const once = mergeHooks({ hooks: { Stop: [{ hooks: [{ type: 'command', command: 'echo done' }] }] } });
  const twice = mergeHooks(once);
  assert.deepEqual(twice, once);
});

test('removeHooks undoes mergeHooks and keeps the rest', () => {
  const base = { model: 'x', hooks: { Stop: [{ hooks: [{ type: 'command', command: 'echo done' }] }] } };
  assert.deepEqual(removeHooks(mergeHooks(base)), base);
  assert.deepEqual(removeHooks(mergeHooks({})), {});
});

test('CLI writes a backup before saving and handles a missing file', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'petspa-'));
  const file = path.join(dir, 'settings.json');
  const script = path.join(__dirname, '..', 'src', 'hooks', 'install.js');

  execFileSync(process.execPath, [script, '--settings', file], { stdio: 'pipe' });
  const first = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.deepEqual(commandsFor(first, 'Stop'), [HOOK_COMMAND]);
  assert.equal(fs.readdirSync(dir).filter((f) => f.includes('.bak-')).length, 0, 'no backup of a missing file');

  fs.writeFileSync(file, JSON.stringify({ model: 'opus' }));
  execFileSync(process.execPath, [script, '--settings', file], { stdio: 'pipe' });
  const backups = fs.readdirSync(dir).filter((f) => f.startsWith('settings.json.bak-'));
  assert.equal(backups.length, 1);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir, backups[0]), 'utf8')), { model: 'opus' });
  assert.equal(JSON.parse(fs.readFileSync(file, 'utf8')).model, 'opus');
});

test('CLI refuses to overwrite invalid JSON', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'petspa-'));
  const file = path.join(dir, 'settings.json');
  fs.writeFileSync(file, '{ broken');
  const script = path.join(__dirname, '..', 'src', 'hooks', 'install.js');
  assert.throws(() => execFileSync(process.execPath, [script, '--settings', file], { stdio: 'pipe' }));
  assert.equal(fs.readFileSync(file, 'utf8'), '{ broken');
});
