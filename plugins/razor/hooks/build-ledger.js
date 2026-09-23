#!/usr/bin/env node
'use strict';

// Stop — build ledger: threshold-gated outcome meter.
//
// The gates prevent; this measures. At turn end, compare the working tree
// against the SessionStart snapshot (base commit + untracked count). If the
// session looks like sprawl — large insertion-heavy diff with almost no
// deletions, or many new files — inject one question, once per session.
// Silent while the session behaves; the thresholds are generous on purpose
// so a legitimately large requested task never trips it.

const { readInput, emitContext, isActive, settingOff, settingNumber, fileStore, git } = require('./razor-lib');
const { classify } = require('./file-meter');

const DEFAULT_LOC_BUDGET = 500;
const DEFAULT_FILES_BUDGET = 8;

// A budget of zero or less uses the default.
function budget(name, fallback, env) {
  const n = settingNumber(name, fallback, env);
  return n > 0 ? n : fallback;
}

// Sprawl = big net growth with next-to-no deletion, or a pile of new files.
// A large diff that also deletes a lot is refactoring, not sprawl.
function shouldFire(stats, locBudget, filesBudget) {
  const sprawlLoc =
    stats.insertions - stats.deletions > locBudget && stats.deletions < stats.insertions * 0.1;
  return sprawlLoc || stats.newFiles > filesBudget;
}

// Sum a --numstat block, skipping the paths the ledger never charges. Both
// the session-start baseline and the turn-end tally go through here, so a
// path exempt from one is exempt from the other — an asymmetry would have the
// baseline subtract lines the tally never counted, and the meter would go
// quiet for the rest of the session.
function tally(numstat, skip = () => false) {
  let insertions = 0;
  let deletions = 0;
  for (const line of (numstat || '').split('\n')) {
    const [ins, del, file] = line.split('\t');
    if (!file || skip(file) || isUncounted(file)) continue;
    insertions += parseInt(ins, 10) || 0;
    deletions += parseInt(del, 10) || 0;
  }
  return { insertions, deletions };
}

// The session's own delta: the working tree vs the base commit, minus the
// dirt that was already there when the session started. Files that were
// untracked at session start are excluded by NAME — staging or committing
// them mid-session must not move their content onto the session's bill.
// razor: count-level subtraction for edits to pre-existing files; per-line
// attribution needs a full diff snapshot at session start.
// A regenerated lockfile is thousands of insertions nobody wrote, and it lands
// with almost no deletions -- exactly the shape shouldFire reads as sprawl.
// The benchmark runner's own diff metric already skips these; the ledger has
// to as well or a routine dependency update ends the session with a question
// about code the agent never authored.
// git reports every path with forward slashes, so the name is what is after
// the last one.
function isLockfile(file) {
  const name = file.slice(file.lastIndexOf('/') + 1).toLowerCase();
  return name.endsWith('.lock') || name.endsWith('-lock.json') || name.endsWith('-lock.yaml');
}

// Prose is not sprawl. file-meter already classifies a new docs file and
// refuses to charge it against the file budget; the ledger has to agree, or a
// repo that mandates ADR amendments and doc comments ends every session with
// a question about lines nobody would want cut. classify() owns the path
// shapes so the two meters cannot drift apart.
function isUncounted(file) {
  return isLockfile(file) || classify(file) === 'docs';
}

function diffStats(ledger, cwd) {
  const numstat = git(['diff', '--numstat', ledger.baseSha], cwd);
  if (numstat === null) return null; // base sha gone (rebase) or not a repo
  const baseNames = new Set(ledger.baseUntrackedFiles || []);
  let { insertions, deletions } = tally(numstat, (file) => baseNames.has(file));
  insertions = Math.max(0, insertions - (ledger.baseInsertions || 0));
  deletions = Math.max(0, deletions - (ledger.baseDeletions || 0));

  const list = (s) => (s || '').split('\n').filter(Boolean);
  const added = list(git(['diff', '--diff-filter=A', '--name-only', ledger.baseSha], cwd));
  const untracked = list(git(['ls-files', '--others', '--exclude-standard'], cwd));
  const fresh = [...new Set([...added, ...untracked])].filter(
    (f) => !baseNames.has(f) && !isUncounted(f)
  );
  const newFiles = Math.max(0, fresh.length - (ledger.baseAdded || 0));

  return { insertions, deletions, newFiles };
}

// Measures the session against its baseline and returns the ledger question,
// or null when there is nothing to ask. The question fires at most once per
// session.
//
// Every setting comes from `env`. `store` has read(id) and write(id, state).
function run(data, { env, store }) {
  if (settingOff('LEDGER', env)) return null;
  const state = store.read(data.session_id);
  if (!isActive(state, env)) return null;

  const ledger = state.ledger;
  if (!ledger || !ledger.baseSha || ledger.fired) return null;

  const stats = diffStats(ledger, data.cwd);
  if (!stats) return null;
  const locBudget = budget('LEDGER_LOC', DEFAULT_LOC_BUDGET, env);
  const filesBudget = budget('LEDGER_FILES', DEFAULT_FILES_BUDGET, env);
  if (!shouldFire(stats, locBudget, filesBudget)) return null;

  ledger.fired = true;
  store.write(data.session_id, state);

  return (
    `razor ledger: +${stats.insertions} / -${stats.deletions} LOC, ` +
    `${stats.newFiles} new files since session start. ` +
    'Deletion-positive diffs are the goal — is all of this needed? ' +
    '(fires once per session; RAZOR_LEDGER=off to silence)'
  );
}

function main() {
  const env = process.env;
  emitContext('Stop', run(readInput(), { env, store: fileStore(env) }));
}

if (require.main === module) main();

module.exports = { run, main, shouldFire, diffStats, tally, isUncounted };
