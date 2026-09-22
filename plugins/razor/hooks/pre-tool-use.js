#!/usr/bin/env node
'use strict';

// PreToolUse — single entry point for every razor gate.
//
// One state read and write per tool call, with the gates applied in order
// against the same state object: dep guard, manifest guard, import guard,
// file meter.
//
// Gate state is per subagent (see gateStateId): a subagent's searches and
// writes never spend the main thread's budgets, and vice versa. The /razor
// toggle stays session-wide.

const os = require('os');
const { readInput, emitDeny, isActive, gateStateId, fileStore } = require('./razor-lib');

const GATES = [
  require('./dep-guard'),
  require('./manifest-guard'),
  require('./import-guard'),
  require('./file-meter'),
];

// Runs every gate against one PreToolUse call and returns the deny reason,
// or null to pass. A call gets at most one deny: the first reason found wins
// (most specific first). Every gate still records its own nudge in the state
// even when an earlier gate already denied, so the retry passes all of them.
//
// Every setting comes from `env`. `store` has read(id) and write(id, state),
// and `tmpDir` is the temp directory the file meter exempts.
function run(data, { env, store, tmpDir }) {
  const sessionState = store.read(data.session_id);
  if (!isActive(sessionState, env)) return null;

  const stateId = gateStateId(data);
  const state = stateId === data.session_id ? sessionState : store.read(stateId);

  let reason = null;
  for (const gate of GATES) {
    const r = gate.check(data, state, { env, tmpDir });
    if (r && !reason) reason = r;
  }
  store.write(stateId, state);
  return reason;
}

function main() {
  const env = process.env;
  emitDeny('PreToolUse', run(readInput(), { env, store: fileStore(env), tmpDir: os.tmpdir() }));
}

if (require.main === module) main();

module.exports = { run, main };
