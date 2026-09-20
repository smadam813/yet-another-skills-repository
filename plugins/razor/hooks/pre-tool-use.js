#!/usr/bin/env node
'use strict';

// PreToolUse — single entry point for every razor gate.
//
// One process per tool call and one state read/write, with the gates applied
// in order against the same state object: dep guard, manifest guard, import
// guard, file meter. Every gate still records its own bookkeeping even
// when an earlier one already denied — the retry then passes all of them —
// and the first reason found is the one emitted (most specific wins).
//
// Gate state is per subagent (see gateStateId): a subagent's searches and
// writes never spend the main thread's budgets, and vice versa. The /razor
// toggle stays session-wide.

const { readInput, emitDeny, readState, writeState, isActive, gateStateId, turnKey } = require('./razor-lib');

const MANIFEST_GUARD = require('./manifest-guard');
const IMPORT_GUARD = require('./import-guard');
const FILE_METER = require('./file-meter');

const GATES = [
  require('./dep-guard'),
  MANIFEST_GUARD,
  IMPORT_GUARD,
  FILE_METER,
];

function main() {
  const data = readInput();
  const sessionState = readState(data.session_id);
  if (!isActive(sessionState)) return;

  const stateId = gateStateId(data);
  const state = stateId === data.session_id ? sessionState : readState(stateId);

  let reason = null;
  for (const gate of GATES) {
    const r = gate.check(data, state);
    if (r && !reason) reason = r;
  }
  writeState(stateId, state);

  emitDeny('PreToolUse', reason);
}

if (require.main === module) main();

module.exports = { main };
