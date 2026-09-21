'use strict';

const path = require('path');
const { spawnSync } = require('child_process');

const HOOKS_DIR = path.join(__dirname, '..', 'hooks');

// The suite must not read hush's own flags out of the developer's shell — a dev
// who exports HUSH_DISABLE=1 would otherwise watch the suite go red for no
// reason. Every test file requires this module before it touches a hook, in
// process or spawned, so clearing them here clears them everywhere. A flag a
// test sets afterwards, in process.env or through runHook's `env`, still binds.
for (const key of Object.keys(process.env)) {
  if (key.startsWith('HUSH_')) delete process.env[key];
}

/** Run a hook script from hooks/ with JSON stdin; returns spawnSync result. */
function runHook(name, stdinData, env) {
  return spawnSync('node', [path.join(HOOKS_DIR, name)], {
    input: stdinData === undefined ? undefined : JSON.stringify(stdinData),
    encoding: 'utf-8',
    timeout: 30000,
    env: { ...process.env, ...(env || {}) },
  });
}

/** Parse hook stdout as JSON, or null when the hook stayed silent. */
function hookOutput(result) {
  const out = (result.stdout || '').trim();
  return out ? JSON.parse(out) : null;
}

// The `deps` an in-process transform call takes: a scratch, a turn reader,
// and the settings built from `env`. A spawned hook builds the same object
// from the child's environment and the real transcript.
function deps(scratch, turn, env) {
  const { settingsFromEnv } = require('../hooks/lib/transform');
  return { scratch, turn, settings: settingsFromEnv(env) };
}

// `deps` over the session scratch module and a turn reader that sees no
// transcript, for a case whose assertion is about the disk.
function makeDeps(env = {}) {
  return deps(require('../hooks/lib/session-scratch'), stubTurn(), env);
}

// `deps` over an in-memory scratch and a stub turn, so a call touches
// neither the disk nor a transcript. `claim` goes to memoryScratch;
// `promptText` and `bytes` are what the stub turn answers.
function memoryDeps(env = {}, { claim, promptText, bytes } = {}) {
  return deps(memoryScratch({ claim }), stubTurn(promptText, bytes), env);
}

// appendRecord reads the HUSH_DEBUG gate from the environment on every call,
// so a case sets the gate around its call and restores it after.
function withDebug(value, fn) {
  const prev = process.env.HUSH_DEBUG;
  if (value === undefined) delete process.env.HUSH_DEBUG;
  else process.env.HUSH_DEBUG = value;
  try {
    return fn();
  } finally {
    if (prev === undefined) delete process.env.HUSH_DEBUG;
    else process.env.HUSH_DEBUG = prev;
  }
}

// A turn reader that answers with a fixed prompt and transcript size.
const stubTurn = (promptText = '', bytes = undefined) => () => ({ promptText, bytes });

// An in-memory session scratch with the functions the transform calls. It
// records every call, so a test asserts on what the transform handed it.
// `claim` is what claimNote answers: false plays a fire that lost the race.
// A parked sidecar gets one fixed path per session, which the call records
// beside the content so a test can match it against the record.
function memoryScratch({ claim = true } = {}) {
  const calls = { parked: [], manifest: [], saved: [], claimed: [] };
  return {
    calls,
    isSidecar: () => false,
    parkSidecar(sessionId, content) {
      const file = `/memory/${sessionId}/parked.txt`;
      calls.parked.push({ sessionId, content, path: file });
      return file;
    },
    appendManifest(sessionId, record) {
      calls.manifest.push({ sessionId, record });
    },
    addSaved(sessionId, bytesIn, bytesOut) {
      calls.saved.push({ sessionId, bytesIn, bytesOut });
      return true;
    },
    claimNote(sessionId) {
      calls.claimed.push(sessionId);
      return claim;
    },
  };
}

module.exports = { runHook, hookOutput, HOOKS_DIR, makeDeps, memoryDeps, stubTurn, memoryScratch, withDebug };
