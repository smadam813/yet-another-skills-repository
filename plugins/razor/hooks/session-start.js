#!/usr/bin/env node
'use strict';

// SessionStart — inject the ladder into the main thread and snapshot the
// git baseline for the build ledger, taken once per session (resume/compact
// keep the original baseline). The snapshot includes the tree's pre-existing
// dirt — dirty insertions, deletions, added and untracked files — so the
// ledger only ever charges the session for its own delta.
// The emitter owns the wire shape; this file only decides what to say.

const { RULESET, readInput, emitContext, isActive, settingOff, fileStore, git } = require('./razor-lib');
const { tally, isUncounted } = require('./build-ledger');

// Hands the ladder to `emit`, then records the ledger baseline in `store`.
// `emit` is a callback, not a return value, so the ladder leaves before any
// git call starts.
//
// Every setting comes from `env`. `store` has read(id), write(id, state), and
// sweep().
function run(data, { env, store, emit }) {
  const state = store.read(data.session_id);
  if (!isActive(state, env)) return;

  // The ladder goes out first. Everything below it is git, and a repo slow
  // enough to burn the hook's timeout must cost at most the ledger baseline —
  // never the injection, which is the whole product.
  emit(RULESET);

  // Swept after the ladder for the same reason: a state dir with thousands of
  // entries is a readdir the injection must never wait behind.
  store.sweep();

  if (state.ledger || settingOff('LEDGER', env)) return;
  const baseSha = git(['rev-parse', 'HEAD'], data.cwd);
  if (!baseSha) return;
  const list = (s) => (s || '').split('\n').filter(Boolean);
  // --numstat, not --shortstat: the baseline has to be measured with the
  // same path exemptions the ledger charges by, or pre-existing docs dirt
  // gets subtracted from a tally that never counted it.
  const dirty = tally(git(['diff', '--numstat', 'HEAD'], data.cwd));
  state.ledger = {
    baseSha,
    baseInsertions: dirty.insertions,
    baseDeletions: dirty.deletions,
    baseAdded: list(git(['diff', '--diff-filter=A', '--name-only', 'HEAD'], data.cwd)).filter(
      (f) => !isUncounted(f)
    ).length,
    // Names, not a count: a pre-existing untracked file the session
    // merely stages or commits must stay off the session's bill.
    baseUntrackedFiles: list(git(['ls-files', '--others', '--exclude-standard'], data.cwd)),
    fired: false,
  };
  store.write(data.session_id, state);
}

function main() {
  const env = process.env;
  run(readInput(), { env, store: fileStore(env), emit: (text) => emitContext('SessionStart', text) });
}

if (require.main === module) main();

module.exports = { run, main };
