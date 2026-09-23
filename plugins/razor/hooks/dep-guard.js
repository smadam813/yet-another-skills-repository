'use strict';

// Gate (Bash|PowerShell, via pre-tool-use.js) — soft gate on new-dependency
// installs.
//
// The first attempt to install a named package is denied with the
// reuse-first reason (rungs 3–5); re-running the same install passes. One
// forced reconsideration per dependency, never a hard block, and razor
// never *grants* permission — on the pass path it stays silent so the
// user's normal permission flow still applies.
//
// Only project-dependency managers are guarded. Lockfile restores
// (`npm install` bare, `npm ci`, `pip install -r ...`, `poetry install`)
// and system package managers (apt, brew, winget) are out of scope.

const { settingOff } = require('./razor-lib');
const { claim, isDeclared } = require('./reconsideration-ledger');
const { nearestManifest } = require('./manifest');

// manager → subcommands that add a named package
const ADD_SUBCOMMANDS = {
  npm: ['install', 'i', 'add'],
  pnpm: ['install', 'i', 'add'],
  yarn: ['add'],
  bun: ['add', 'install', 'i'],
  pip: ['install'],
  pip3: ['install'],
  pipenv: ['install'],
  poetry: ['add'],
  uv: ['add'],
  cargo: ['add'],
  go: ['get'],
  composer: ['require'],
  gem: ['install'],
};

// pip args that mean "restore/develop", not "add a new dependency"
const PIP_RESTORE_FLAGS = new Set(['-r', '--requirement', '-e', '--editable']);

// Flags that take their value as the NEXT token. Left alone, that value is
// read as a package name and the deny reason invents a dependency nobody
// asked for. Only the separated form needs this — `--flag=value` is one
// token and already skipped as a flag.
const VALUE_FLAGS = new Set([
  '-t', '--target', '-i', '--index-url', '--extra-index-url', '-f', '--find-links',
  '-c', '--constraint', '--python', '--prefix', '--registry', '--tag',
  '-w', '--workspace', '--features', '--manifest-path',
  '--group', '--filter', '--branch', '--rev',
  // `cargo add -p <member> <dep>` and `uv pip install -p 3.12 <dep>` both put a
  // value here that is not a package. Reading it as one denies a name nobody
  // installed, which is the expensive direction.
  '-p', '--package',
]);

// A local path or a URL is a location, not a name from a registry. Denying
// one names a package that does not exist, and the suppressing direction is
// the safe one: a missed nudge costs nothing, a false deny costs a turn.
function isLocationSpec(a) {
  return (
    /^\.{1,2}[\\/]/.test(a) || a === './...' || a.startsWith('/') || a.startsWith('~/')
    || /^[A-Za-z]:[\\/]/.test(a) || a.includes('://') || a.startsWith('file:')
  );
}

// Flags, `.`, locations, and shell redirects are not package names. A bare
// redirect operator (`>`, `2>`) also consumes the following token — its
// target. Quotes come off first: the shell strips them before the manager
// ever sees the token, and a version spec must be quoted in a real shell
// (`pip install 'flask>=2.1'`), so `'flask>=2.1'` and `flask>=2.1` are
// the same package.
function packageArgs(args) {
  const out = [];
  let skipNext = false;
  for (const raw of args) {
    if (skipNext) {
      skipNext = false;
      continue;
    }
    const a = raw.replace(/^['"]+|['"]+$/g, '');
    if (!a || a === '.' || a === '..') continue;
    if (a.startsWith('-')) {
      if (VALUE_FLAGS.has(a)) skipNext = true;
      continue;
    }
    const redirect = a.match(/^\d*(?:>>?|<<?|&>>?)(.*)$/);
    if (redirect) {
      if (!redirect[1]) skipNext = true;
      continue;
    }
    if (isLocationSpec(a)) continue;
    out.push(a);
  }
  return out;
}

// Parse one shell segment; returns {manager, packages} when it adds a new
// named dependency, null otherwise.
function parseSegment(segment) {
  const tokens = segment.trim().split(/\s+/).filter(Boolean);
  // Wrapper prefixes (`sudo pip …`, `env PIP_X=1 pip …`, `command pip …`)
  // resolve to the same install; strip them so the manager is what's judged.
  while (tokens.length && (/^[A-Za-z_][A-Za-z0-9_]*=/.test(tokens[0]) || ['sudo', 'env', 'command'].includes(tokens[0]))) {
    tokens.shift();
  }
  if (!tokens.length) return null;

  let cmd = tokens.shift().toLowerCase().replace(/\.(exe|cmd)$/, '');

  // python -m pip install …  →  pip install …
  if ((cmd === 'python' || cmd === 'python3' || cmd === 'py') && tokens[0] === '-m' && /^pip3?$/.test(tokens[1] || '')) {
    cmd = tokens[1];
    tokens.splice(0, 2);
  }
  // uv pip install …  →  pip install …
  if (cmd === 'uv' && tokens[0] === 'pip') {
    cmd = 'pip';
    tokens.shift();
  }
  // yarn global add …  →  yarn add …
  if (cmd === 'yarn' && tokens[0] === 'global') tokens.shift();

  // dotnet add [proj] package Name
  if (cmd === 'dotnet' && tokens[0] === 'add') {
    const idx = tokens.indexOf('package');
    if (idx !== -1 && tokens[idx + 1]) return { manager: 'dotnet', packages: [tokens[idx + 1]] };
    return null;
  }

  const subs = ADD_SUBCOMMANDS[cmd];
  if (!subs) return null;
  const sub = (tokens.shift() || '').toLowerCase();
  if (!subs.includes(sub)) return null;

  if (/^pip3?$/.test(cmd) && tokens.some((t) => PIP_RESTORE_FLAGS.has(t))) return null;

  const packages = packageArgs(tokens);
  if (!packages.length) return null; // bare install = lockfile restore
  // `pip install --upgrade pip` upgrades the tool, it does not add a project
  // dependency. Same for any manager asked to install only itself.
  if (packages.length === 1 && packages[0].toLowerCase() === cmd) return null;
  return { manager: cmd, packages };
}

// razor: parses the command exactly as the model issued it. hush's
// preserve-exit-code.js rewrites Bash/PowerShell commands via updatedInput
// under bypassPermissions/HUSH_WRAP=1, but PreToolUse hooks from separate
// plugins don't chain — each one gets the same original tool_input, never a
// sibling's rewrite (verified live 2026-07-14). No unwrap step needed here.
// Scan a whole command line (split on shell chaining) for a dependency add.
function parseInstallCommands(command) {
  const hits = [];
  for (const segment of String(command || '').split(/&&|\|\||;|\|/)) {
    const hit = parseSegment(segment);
    if (hit) hits.push(hit);
  }
  return hits;
}

// The first install in the line. Kept for callers that want one answer.
function parseInstallCommand(command) {
  return parseInstallCommands(command)[0] || null;
}

// One decision per package however the spec is written: `axios`,
// `axios@^1.8`, `flask==2.0`, and `requests[socks]` all name the same
// dependency. Cut at the first version/extras marker; a non-leading `@`
// starts a version (a leading one is an npm scope).
function packageName(token) {
  const t = String(token || '');
  const at = t.indexOf('@', 1);
  const spec = t.search(/[=<>!~[]/);
  const end = Math.min(at === -1 ? t.length : at, spec === -1 ? t.length : spec);
  return t.slice(0, end) || t;
}

const LIST_CAP = 30;

// The retry contract is spelled out as the base prompt's own "adjustment":
// the harness tells the model a denied call means the user declined and to
// adjust rather than retry verbatim — so the reason declares its automated
// provenance and frames the unchanged re-run AS the correct adjustment.
const PROVENANCE = "This is razor's automated checkpoint, not the user declining. ";

function retryContract(what) {
  return (
    `the correct adjustment is to re-issue the exact same ${what} — ` +
    'razor asks once and the retry passes; nothing here needs the user.'
  );
}

// One deny body for all three dependency gates; only the head sentence
// differs. The list is what the manifest declares — evidence, not a claim
// about what's physically installed.
function evidenceReason(head, deps, what) {
  if (deps && deps.length) {
    const sorted = [...new Set(deps)].sort((a, b) => a.localeCompare(b));
    const shown = sorted.slice(0, LIST_CAP).join(', ') + (sorted.length > LIST_CAP ? ', …' : '');
    return (
      head +
      `Already declared (${sorted.length}): ${shown}. ` +
      'Rungs 3-5 — check the stdlib, the platform, and those first, even when the user names the library. ' +
      PROVENANCE +
      'If nothing covers it, ' +
      retryContract(what)
    );
  }
  return (
    head +
    'Rungs 3-5 — check the stdlib, the platform, and already-declared deps first, even when the user names the library. ' +
    PROVENANCE +
    'If nothing covers it, ' +
    retryContract(what)
  );
}

function denyReason(hit, deps) {
  return evidenceReason(`razor: '${hit.packages.join(' ')}' adds a new ${hit.manager} dependency. `, deps, 'command');
}

// Ecosystem of a manager, for the manifest walk and for the reconsideration
// ledger shared with the manifest and import guards. Every manager needs one,
// because the reconsideration ledger files each record under an ecosystem and
// a name.
const MANAGER_ECO = {
  npm: 'node', pnpm: 'node', yarn: 'node', bun: 'node',
  pip: 'python', pip3: 'python', pipenv: 'python', poetry: 'python', uv: 'python',
  cargo: 'rust', go: 'go', composer: 'php', gem: 'ruby', dotnet: 'dotnet',
};

// Dispatcher entry: mutates gate state, returns the deny reason or null.
function check(data, state, { env }) {
  if (settingOff('DEP_GUARD', env)) return null;
  if (data.tool_name !== 'Bash' && data.tool_name !== 'PowerShell') return null;

  // Every install on the line, not just the first. A chained command that
  // installs two packages used to be checkpointed for the first one alone,
  // and the retry that cleared it carried the second in unexamined -- one
  // nudge, two dependencies. Each install now gets its own one-time
  // checkpoint, and the first one still owing a nudge is the one that answers.
  for (const hit of parseInstallCommands(data.tool_input && data.tool_input.command)) {
    const reason = checkHit(hit, data, state);
    if (reason) return reason;
  }
  return null;
}

function checkHit(hit, data, state) {
  const names = hit.packages.map(packageName);
  const eco = MANAGER_ECO[hit.manager];
  const manifest = nearestManifest(eco, data.cwd);
  const deps = manifest && manifest.deps;
  // Installing what the manifest already declares is a restore, not an
  // addition — never checkpointed.
  if (deps && names.every((n) => isDeclared(n, deps))) return null;

  // When another gate already nudged every package, the normal permission flow applies.
  const owed = claim(state, eco, names);
  if (!owed.length) return null;
  return denyReason({ ...hit, packages: owed }, deps);
}

module.exports = {
  check, parseInstallCommand, parseInstallCommands, packageName, denyReason, evidenceReason, PROVENANCE, retryContract, ADD_SUBCOMMANDS, MANAGER_ECO,
};
