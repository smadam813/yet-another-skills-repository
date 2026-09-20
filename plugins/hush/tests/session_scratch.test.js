'use strict';

// Session scratch is the one module that writes into a session's directory:
// it parks a sidecar and lists the live ones, claims and re-arms the note,
// keeps the react counter, and appends the debug manifest. These tests drive
// it through its interface against the real temp root, one fresh session id
// per test. Each asserts on what a later call returns. after() removes every
// session through removeSession.

const { test, describe, after } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {
  parkSidecar, listSidecars, isSidecar, removeSession, sessionDir,
  claimNote, rearmNote, resetReact, reactSeen, appendManifest, manifestPath,
} = require('../hooks/lib/session-scratch');

const sessions = [];
function freshSessionId(tag) {
  const id = `hush-scratch-${tag}-${crypto.randomBytes(4).toString('hex')}`;
  sessions.push(id);
  return id;
}
after(() => {
  for (const id of sessions) removeSession(id);
});

describe('session scratch: park then list', () => {
  test('a parked sidecar comes back from the list as the same path', () => {
    const id = freshSessionId('park-list');
    const file = parkSidecar(id, 'full output');
    assert.ok(file, 'park returns the path it wrote');
    assert.ok(file.endsWith('.txt'), 'a sidecar is a .txt file');
    assert.ok(isSidecar(file), 'the path it returns is one it recognizes');
    assert.strictEqual(fs.readFileSync(file, 'utf8'), 'full output');
    assert.deepStrictEqual(listSidecars(id), [file]);
  });

  test('parking the same content twice yields one file', () => {
    const id = freshSessionId('idempotent');
    const first = parkSidecar(id, 'same bytes');
    const second = parkSidecar(id, 'same bytes');
    assert.strictEqual(second, first);
    assert.strictEqual(listSidecars(id).length, 1);
  });

  test('the list is sorted by name, not by write order', () => {
    const id = freshSessionId('sorted');
    const parked = ['zzz', 'aaa', 'mmm'].map((c) => parkSidecar(id, c));
    assert.deepStrictEqual(listSidecars(id), [...parked].sort());
  });

  test('a session that parked nothing lists nothing', () => {
    const id = freshSessionId('empty');
    assert.deepStrictEqual(listSidecars(id), []);
    assert.strictEqual(fs.existsSync(sessionDir(id)), false, 'listing creates no directory');
  });

  test('the list skips a stale partial write beside a parked sidecar', () => {
    const id = freshSessionId('partial');
    const file = parkSidecar(id, 'complete');
    fs.writeFileSync(path.join(sessionDir(id), '.abc123.txt.4242.1a2b3c4d.tmp'), 'half a wri');
    assert.deepStrictEqual(listSidecars(id), [file]);
  });

  test('the list skips a stale partial write when nothing was parked', () => {
    const id = freshSessionId('partial-only');
    fs.mkdirSync(sessionDir(id), { recursive: true });
    fs.writeFileSync(path.join(sessionDir(id), '.abc123.txt.4242.1a2b3c4d.tmp'), 'half a wri');
    assert.deepStrictEqual(listSidecars(id), []);
  });

  test('the list skips a directory named like a sidecar', () => {
    const id = freshSessionId('dir');
    const file = parkSidecar(id, 'real');
    fs.mkdirSync(path.join(sessionDir(id), 'notafile.txt'));
    assert.deepStrictEqual(listSidecars(id), [file]);
  });

  test('the list skips a parked sidecar that is gone', () => {
    const id = freshSessionId('deleted');
    const file = parkSidecar(id, 'gone soon');
    fs.rmSync(file);
    assert.deepStrictEqual(listSidecars(id), []);
  });
});

describe('session scratch: park fails open', () => {
  test('a session id shaped like a path traversal parks under the scratch root', () => {
    const id = freshSessionId('../../escape');
    const file = parkSidecar(id, 'contained');
    assert.ok(file);
    assert.ok(isSidecar(file));
    assert.strictEqual(path.dirname(path.resolve(file)), path.resolve(sessionDir(id)));
  });

  test('park returns null when a plain file sits where session scratch goes', () => {
    const id = freshSessionId('blocked');
    fs.mkdirSync(path.dirname(sessionDir(id)), { recursive: true });
    fs.writeFileSync(sessionDir(id), 'not a directory');
    assert.strictEqual(parkSidecar(id, 'anything'), null);
    fs.rmSync(sessionDir(id), { force: true });
  });
});

describe('session scratch: the note sentinel', () => {
  test('claiming twice yields one claim', () => {
    const id = freshSessionId('claim');
    assert.strictEqual(claimNote(id), true);
    assert.strictEqual(claimNote(id), false);
  });

  test('re-arm then claim yields one claim again', () => {
    const id = freshSessionId('rearm');
    assert.strictEqual(claimNote(id), true);
    rearmNote(id);
    assert.strictEqual(claimNote(id), true);
    assert.strictEqual(claimNote(id), false);
  });

  test('re-arming a session that never claimed is a no-op', () => {
    const id = freshSessionId('rearm-none');
    rearmNote(id);
    assert.strictEqual(fs.existsSync(sessionDir(id)), false, 're-arm creates no directory');
  });

  test('a session-less claim never succeeds', () => {
    assert.strictEqual(claimNote(''), false);
    assert.strictEqual(claimNote(undefined), false);
  });

  test('the sentinel is not a sidecar', () => {
    const id = freshSessionId('claim-not-sidecar');
    claimNote(id);
    assert.deepStrictEqual(listSidecars(id), []);
  });
});

describe('session scratch: the react counter', () => {
  test('the count is monotonic within a turn', () => {
    const id = freshSessionId('react');
    resetReact(id);
    assert.strictEqual(reactSeen(id, 1), true, 'first block above zero');
    assert.strictEqual(reactSeen(id, 1), false, 'same block again');
    assert.strictEqual(reactSeen(id, 2), true, 'a new block');
    assert.strictEqual(reactSeen(id, 1), false, 'never below the stored count');
  });

  test('a new turn resets the count', () => {
    const id = freshSessionId('react-reset');
    resetReact(id);
    assert.strictEqual(reactSeen(id, 3), true);
    resetReact(id);
    assert.strictEqual(reactSeen(id, 1), true, 'after a reset, one block is new again');
  });

  test('with no counter on disk, any block above zero is new', () => {
    const id = freshSessionId('react-fresh');
    assert.strictEqual(reactSeen(id, 1), true);
    assert.strictEqual(reactSeen(id, 0), false);
  });

  test('a session-less count is never stored', () => {
    assert.strictEqual(reactSeen('', 1), false);
    assert.strictEqual(reactSeen(undefined, 1), false);
  });

  test('the counter is not a sidecar', () => {
    const id = freshSessionId('react-not-sidecar');
    resetReact(id);
    reactSeen(id, 1);
    assert.deepStrictEqual(listSidecars(id), []);
  });
});

describe('session scratch: the debug manifest', () => {
  test('a record lands inside the session directory, one JSON line per append', () => {
    const id = freshSessionId('manifest');
    appendManifest(id, { tool: 'Bash', action: 'cap' });
    appendManifest(id, { tool: 'Read', action: 'passthrough' });
    const file = manifestPath(id);
    assert.strictEqual(path.dirname(path.resolve(file)), path.resolve(sessionDir(id)));
    const lines = fs.readFileSync(file, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
    assert.deepStrictEqual(lines, [{ tool: 'Bash', action: 'cap' }, { tool: 'Read', action: 'passthrough' }]);
  });

  test('the manifest is not a sidecar', () => {
    const id = freshSessionId('manifest-not-sidecar');
    appendManifest(id, { action: 'cap' });
    assert.deepStrictEqual(listSidecars(id), []);
  });

  test('removeSession takes the manifest with the rest', () => {
    const id = freshSessionId('manifest-remove');
    parkSidecar(id, 'parked');
    appendManifest(id, { action: 'sidecar' });
    assert.strictEqual(removeSession(id), true);
    assert.strictEqual(fs.existsSync(manifestPath(id)), false);
    assert.strictEqual(fs.existsSync(sessionDir(id)), false);
  });

  test('a symlink at the manifest path is refused, and nothing is written through it', { skip: process.platform === 'win32' }, () => {
    const id = freshSessionId('manifest-symlink');
    const victim = path.join(sessionDir(id), 'victim');
    fs.mkdirSync(sessionDir(id), { recursive: true });
    fs.writeFileSync(victim, '');
    fs.symlinkSync(victim, manifestPath(id));
    appendManifest(id, { action: 'cap' });
    assert.strictEqual(fs.readFileSync(victim, 'utf8'), '');
  });
});
