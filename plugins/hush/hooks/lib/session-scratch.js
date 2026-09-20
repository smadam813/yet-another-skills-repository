'use strict';

// Session scratch: the one directory hush owns for a session, and the one
// module that writes into it. Hooks ask it for behavior, never for a path.
// compress-tool-output.js parks a sidecar here and gets a path back, claims
// the note, and adds to the running total. precompact-summary.js asks for
// the live sidecars this session parked. postcompact-rearm.js re-arms the
// note. silence-nudge.js resets and advances the react counter.
// transform-manifest.js appends a debug record. session-end-cleanup.js
// removes the directory. isSidecar decides whether a Read of a path is a
// read of a sidecar.
//
// Layout: tmpdir/hush-sidecar/<session>/ holds:
//   <content-hash>.txt  a sidecar (parkSidecar). The directory IS the
//                       registration.
//   saved.json          the running compression total (addSaved).
//   hush-note           the note sentinel: present means delivered
//                       (claimNote, rearmNote).
//   react-count         the react counter: mid-turn text blocks answered
//                       this turn (resetReact, reactSeen).
//   manifest.jsonl      the HUSH_DEBUG decision manifest (appendManifest).
// Only the .txt entries are sidecars; listSidecars never offers the others
// to the summarizer as a recovery file.
//
// A flat shared directory made ownership a filename prefix and, since files
// are content-addressed and an existing file is never rewritten, let two
// sessions silently share one file: whoever's cleanup ran first pulled the
// recovery location out from under the other. Per-session directories cost
// duplicated bytes when two sessions produce identical output and buy back a
// namespace that can be deleted whole.
//
// Retention is session-scoped: SessionEnd deletes this session's directory.
// Anything left behind by a crash is caught by the age-graced sweep, which
// only ever touches entries untouched for STALE_MS. A live concurrent
// session's directory has a fresh mtime (creating a file inside updates it),
// so a sweep from another session's end can't take it.
//
// Cleanup is a Core behavior: session-end-cleanup.js runs only while the Core
// surface is on. The react counter is Quiet's one entry here, and it rides
// Core's lifetime. With HUSH_CORE=off nothing reaps it, and it is left for OS
// temp cleaning. That is a known trade-off, not a bug: HUSH_CORE=off keeps
// its pinned meaning of "no Core hook touches disk".
//
// The session id becomes one path segment here and nowhere else. Every
// function here is fail-open: a missing directory is a no-op, and no failure
// is worth raising into a hook.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { safeWriteFileSync, refuseSymlink } = require('./safe-write');

const SIDECAR_ROOT = path.join(os.tmpdir(), 'hush-sidecar');

// Crash leftovers are only distinguishable from live files by age. A day is
// long enough that no plausible session loses a file it still points at.
const STALE_MS = 24 * 60 * 60 * 1000;

// An underscore replaces anything that isn't [A-Za-z0-9-], path separators
// and traversal included, so a session id can never name a directory outside
// the scratch root.
// win32 folds the case: `ABCD1234` and `abcd1234` are one directory on NTFS,
// so distinct-case ids have to resolve to the same name here too — otherwise a
// cleanup for one id deletes the other's live files.
function sessionDir(sessionId) {
  const safe = String(sessionId || 'unknown').replace(/[^a-zA-Z0-9-]/g, '_');
  return path.join(SIDECAR_ROOT, process.platform === 'win32' ? safe.toLowerCase() : safe);
}

// True for any file under the scratch root at any depth: a session directory
// today, a stale flat-scheme leftover from an older run just the same.
// win32 folds the case here for the same reason sessionDir does: the path
// arrives from the model, which may have retyped or lowercased what the digest
// printed, and NTFS calls that the same file. A case-only mismatch used to read
// as "not a sidecar", and a full Read of one then passed through uncompressed --
// the whole parked output straight back into context, which is the one thing
// this predicate exists to prevent.
function isSidecar(filePath) {
  if (typeof filePath !== 'string') return false;
  const fold = (p) => (process.platform === 'win32' ? p.toLowerCase() : p);
  const resolved = fold(path.resolve(filePath.trim()));
  const root = fold(path.resolve(SIDECAR_ROOT) + path.sep);
  return resolved.startsWith(root);
}

// FNV-1a over the UTF-16 code units: cheap, and a collision only costs a
// reused file name for output that is byte-identical in practice.
function cheapHash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

// Parks one tool output as a sidecar and returns its path, or null when
// nothing is on disk afterwards. The name is the content hash, so a re-fire
// on identical output reuses the file, and the module never rewrites an
// existing file. The safe write refuses symlinks and throws on any I/O
// failure, so no caller can print a path for a write that never landed. The
// caller decides whether the content may leave the conversation at all: the
// secret screen and the HUSH_SIDECAR switch live there, not here.
function parkSidecar(sessionId, content) {
  try {
    const file = path.join(sessionDir(sessionId), `${cheapHash(content)}.txt`);
    if (!fs.existsSync(file)) safeWriteFileSync(file, content);
    return file;
  } catch {
    return null;
  }
}

// The sidecars this session parked that are still on disk, as full paths
// sorted by name, so repeated calls in one session list the same files the
// same way. Only a regular .txt file counts. A .tmp partial from an
// interrupted safe write is not a sidecar. Neither is a name that has since
// gone or that names a directory. With no session scratch on disk, the
// session parked nothing.
function listSidecars(sessionId) {
  const dir = sessionDir(sessionId);
  let names;
  try {
    names = fs.readdirSync(dir);
  } catch {
    return []; // no session scratch yet: nothing parked
  }
  return names
    .filter((f) => f.endsWith('.txt'))
    .sort()
    .map((f) => path.join(dir, f))
    .filter((file) => {
      const st = fs.statSync(file, { throwIfNoEntry: false });
      return !!st && st.isFile();
    });
}

// SessionEnd trigger: the session's whole namespace goes, partial `.tmp`
// writes from an interrupted safe-write included. Returns true when there was
// something there.
function removeSession(sessionId) {
  const dir = sessionDir(sessionId);
  try {
    if (!fs.existsSync(dir)) return false;
    fs.rmSync(dir, { recursive: true, force: true });
    return true;
  } catch {
    return false; // fail-open: cleanup never breaks a session
  }
}

// Crash trigger: a session that never reached SessionEnd leaves its directory
// behind. Sweeps every root entry — directory or loose file — whose mtime is
// older than the grace, and returns how many it removed.
//
// mtime on the directory is the liveness signal, which a session that wrote
// no sidecar for a full day would fail.
function sweepStale(maxAgeMs, now) {
  const cutoff = (typeof now === 'number' ? now : Date.now()) - (typeof maxAgeMs === 'number' ? maxAgeMs : STALE_MS);
  let entries;
  try {
    entries = fs.readdirSync(SIDECAR_ROOT);
  } catch {
    return 0; // no root yet (or unreadable) — nothing to sweep
  }
  let removed = 0;
  for (const name of entries) {
    const full = path.join(SIDECAR_ROOT, name);
    try {
      if (fs.statSync(full).mtimeMs >= cutoff) continue;
      fs.rmSync(full, { recursive: true, force: true });
      removed++;
    } catch {
      /* vanished under us, or not ours to remove — either way, skip it */
    }
  }
  return removed;
}

// The session's running compression total, as a statusline can read it:
// tmpdir/hush-sidecar/<session>/saved.json holding {"in":N,"out":M} — characters
// that arrived from tools against characters actually delivered to the model.
// Claude Code has one statusline slot and hush does not take it; this file is
// how a user's own script shows the number instead.
//
// It lives in the session directory because it has exactly the sidecar
// lifetime: removeSession takes it with the parked copies, and the stale sweep
// catches it after a crash. Named .json so precompact-summary's .txt filter
// never offers it to the summarizer as a recovery file.
function savedPath(sessionId) {
  return path.join(sessionDir(sessionId), 'saved.json');
}

// The note's sentinel: an empty file whose existence says "delivered". It
// lives in the session directory for the reason saved.json does: removeSession
// takes it at session end and the stale sweep after a crash. A sentinel
// written to the tmpdir root instead outlived every session that never
// reached SessionEnd (killed, crashed, or closed without the event), and
// 32,000 of them piled up.
function notePath(sessionId) {
  return path.join(sessionDir(sessionId), 'hush-note');
}

// Claims the note for this session: true exactly once, until rearmNote. The
// claim is a wx create, so two hook fires racing on parallel tool calls
// deliver at most one note. A session-less call never claims: a shared
// "unknown" sentinel would leak the once-only state across unrelated runs.
function claimNote(sessionId) {
  if (typeof sessionId !== 'string' || !sessionId) return false;
  try {
    const file = notePath(sessionId);
    refuseSymlink(file);
    // The first parked sidecar creates the directory lazily; a note can fire
    // before any output is parked, so create it here too.
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, '', { flag: 'wx' });
    return true;
  } catch {
    return false; // EEXIST (already noted), a symlink, or unwritable tmp
  }
}

// Re-arms the note: the next claim succeeds again. Compaction summarizes the
// note away while the sentinel still says "delivered", so the PostCompact
// hook calls this. Harmless when nothing was claimed.
function rearmNote(sessionId) {
  try {
    fs.unlinkSync(notePath(sessionId));
  } catch {
    /* ENOENT fine; anything else is not worth breaking a session over */
  }
}

// The react counter: how many mid-turn text blocks the nudge has already
// answered this turn. Quiet's one entry in session scratch (see the header).
function reactPath(sessionId) {
  return path.join(sessionDir(sessionId), 'react-count');
}

// A new turn starts at zero.
function resetReact(sessionId) {
  if (typeof sessionId !== 'string' || !sessionId) return;
  try {
    safeWriteFileSync(reactPath(sessionId), '0');
  } catch {
    /* fail-open: an unwritable counter means no corrective, the cheap direction */
  }
}

// True when `n` mid-turn text blocks is more than the stored count, and
// stores `n`. The nudge fires at most once per new block: the reminder lands
// right after the block that earned it, then stays quiet until another
// appears. Fail-silent on any trouble: no count means no injection.
function reactSeen(sessionId, n) {
  if (typeof sessionId !== 'string' || !sessionId) return false;
  try {
    const file = reactPath(sessionId);
    let seen = 0;
    try {
      seen = Number(fs.readFileSync(file, 'utf8')) || 0;
    } catch {
      seen = 0;
    }
    if (!(n > seen)) return false;
    safeWriteFileSync(file, String(n));
    return true;
  } catch {
    return false;
  }
}

// The HUSH_DEBUG decision manifest: one JSON line per handled tool output.
// transform-manifest.js owns the record shape and the env gate; this module
// owns where the lines go. It lives in the session directory so a debug
// session leaves nothing behind in the temp root.
function manifestPath(sessionId) {
  return path.join(sessionDir(sessionId), 'manifest.jsonl');
}

// Appends one record. An append cannot go through the atomic-rename safe
// write, so it refuses a symlink at the path and opens with O_NOFOLLOW to
// close the gap between the check and the write where the platform allows.
function appendManifest(sessionId, record) {
  try {
    const file = manifestPath(sessionId);
    refuseSymlink(file);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const O_NOFOLLOW = typeof fs.constants.O_NOFOLLOW === 'number' ? fs.constants.O_NOFOLLOW : 0;
    const fd = fs.openSync(file, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_APPEND | O_NOFOLLOW, 0o600);
    try {
      fs.writeSync(fd, JSON.stringify(record) + '\n');
    } finally {
      fs.closeSync(fd);
    }
  } catch {
    /* fail-open: the manifest is best-effort observability, never a reason
       to alter or block the compression decision */
  }
}

// Adds one tool call's before/after sizes to the total. Read-modify-write on
// every handled tool output, measured at ~0.45ms against the ~60ms node start
// each hook fire already pays, so it runs unconditionally rather than behind a
// flag of its own; HUSH_CORE=off stops it with the rest of the surface.
//
// Fail-open, and deliberately not locked: two hook fires racing on parallel
// tool calls can lose one update, which costs a slightly low statusline and
// nothing else. A session-less call is skipped — a shared 'unknown' file would
// mix unrelated runs and no session would ever clean it up.
function addSaved(sessionId, bytesIn, bytesOut) {
  if (typeof sessionId !== 'string' || !sessionId) return false;
  if (!(bytesIn > 0)) return false;
  const file = savedPath(sessionId);
  try {
    let total = {};
    try {
      total = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
      /* absent, partial or hand-edited: the total restarts rather than throwing */
    }
    if (!total || typeof total !== 'object') total = {};
    safeWriteFileSync(file, JSON.stringify({
      in: (Number(total.in) || 0) + bytesIn,
      out: (Number(total.out) || 0) + (Number(bytesOut) || 0),
    }));
    return true;
  } catch {
    return false; // fail-open: a statusline number never breaks a session
  }
}

module.exports = {
  SIDECAR_ROOT, sessionDir, isSidecar,
  parkSidecar, listSidecars,
  removeSession, sweepStale,
  savedPath, addSaved,
  notePath, claimNote, rearmNote,
  resetReact, reactSeen,
  manifestPath, appendManifest,
};
