'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

// `|| exit 0` (not `exit /b 0`): Claude Code on Windows runs hooks through Git Bash,
// where `exit /b` fails with code 2 (a blocking hook error). `exit 0` works in bash and cmd.
const HOOK_COMMAND = 'curl.exe -s -m 1 --connect-timeout 0.2 -o NUL -X POST -H "Content-Type: application/json" --data-binary @- http://127.0.0.1:47321/hook || exit 0';
const EVENTS = ['UserPromptSubmit', 'PreToolUse', 'PostToolUse', 'Stop', 'SessionEnd', 'Notification'];

function clone(v) { return JSON.parse(JSON.stringify(v)); }

// async: Claude Code starts the hook and carries on without waiting for it.
const HOOK_ENTRY = { type: 'command', command: HOOK_COMMAND, timeout: 5, async: true };
const ENDPOINT = '127.0.0.1:47321/hook';

// Any command hitting our endpoint is ours (older installs used other flags).
function isOurs(h) {
  return !!h && typeof h.command === 'string' && h.command.includes(ENDPOINT);
}

function mergeHooks(settings) {
  const out = clone(settings || {});
  if (!out.hooks || typeof out.hooks !== 'object') out.hooks = {};
  for (const event of EVENTS) {
    const groups = Array.isArray(out.hooks[event]) ? out.hooks[event] : [];
    let found = false;
    for (const g of groups) {
      if (!g || !Array.isArray(g.hooks)) continue;
      g.hooks = g.hooks.map((h) => {
        if (!isOurs(h)) return h;
        found = true;
        return clone(HOOK_ENTRY);
      });
    }
    if (!found) groups.push({ hooks: [clone(HOOK_ENTRY)] });
    out.hooks[event] = groups;
  }
  return out;
}

function removeHooks(settings) {
  const out = clone(settings || {});
  if (!out.hooks || typeof out.hooks !== 'object') return out;
  for (const event of Object.keys(out.hooks)) {
    const groups = out.hooks[event];
    if (!Array.isArray(groups)) continue;
    const kept = groups
      .map((g) => (g && Array.isArray(g.hooks) ? { ...g, hooks: g.hooks.filter((h) => !isOurs(h)) } : g))
      .filter((g) => !g || !Array.isArray(g.hooks) || g.hooks.length > 0);
    if (kept.length) out.hooks[event] = kept; else delete out.hooks[event];
  }
  if (Object.keys(out.hooks).length === 0) delete out.hooks;
  return out;
}

function defaultSettingsPath() {
  return path.join(process.env.USERPROFILE || os.homedir(), '.claude', 'settings.json');
}

function main(argv) {
  const i = argv.indexOf('--settings');
  const file = i >= 0 && argv[i + 1] ? path.resolve(argv[i + 1]) : defaultSettingsPath();
  const uninstall = argv.includes('--uninstall');

  let current = {};
  let raw = null;
  if (fs.existsSync(file)) {
    raw = fs.readFileSync(file, 'utf8');
    try {
      current = raw.trim() ? JSON.parse(raw) : {};
    } catch (err) {
      console.error(`${file} non è un JSON valido, non lo tocco: ${err.message}`);
      process.exit(1);
    }
  }

  const next = uninstall ? removeHooks(current) : mergeHooks(current);
  if (JSON.stringify(next) === JSON.stringify(current)) {
    console.log(`Nessuna modifica: ${file} è già a posto.`);
    return;
  }
  if (raw !== null) {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backup = `${file}.bak-${stamp}`;
    fs.writeFileSync(backup, raw);
    console.log(`Backup salvato in ${backup}`);
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(next, null, 2) + '\n');
  console.log(uninstall ? `Hook del pet rimossi da ${file}` : `Hook del pet installati in ${file}`);
}

if (require.main === module) main(process.argv.slice(2));

module.exports = { mergeHooks, removeHooks, HOOK_COMMAND, EVENTS, defaultSettingsPath };
