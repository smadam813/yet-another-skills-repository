'use strict';

// Session scratch is the one module that parks a sidecar and lists the live
// ones. These tests drive it through its interface against the real temp
// root, one fresh session id per test, and assert on what a later call
// returns. removeSession takes each session with it in after().

const { test, describe, after } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { parkSidecar, listSidecars, isSidecar, removeSession, sessionDir } = require('../hooks/lib/session-scratch');

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

  test('a stale partial write beside a parked sidecar is not listed', () => {
    const id = freshSessionId('partial');
    const file = parkSidecar(id, 'complete');
    fs.writeFileSync(path.join(sessionDir(id), '.abc123.txt.4242.1a2b3c4d.tmp'), 'half a wri');
    assert.deepStrictEqual(listSidecars(id), [file]);
  });

  test('a stale partial write with no parked sidecar lists nothing', () => {
    const id = freshSessionId('partial-only');
    fs.mkdirSync(sessionDir(id), { recursive: true });
    fs.writeFileSync(path.join(sessionDir(id), '.abc123.txt.4242.1a2b3c4d.tmp'), 'half a wri');
    assert.deepStrictEqual(listSidecars(id), []);
  });

  test('a directory named like a sidecar is not listed', () => {
    const id = freshSessionId('dir');
    const file = parkSidecar(id, 'real');
    fs.mkdirSync(path.join(sessionDir(id), 'notafile.txt'));
    assert.deepStrictEqual(listSidecars(id), [file]);
  });

  test('a parked sidecar that was deleted is not listed', () => {
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

  test('a session directory that is a plain file makes park return null', () => {
    const id = freshSessionId('blocked');
    fs.mkdirSync(path.dirname(sessionDir(id)), { recursive: true });
    fs.writeFileSync(sessionDir(id), 'not a directory');
    assert.strictEqual(parkSidecar(id, 'anything'), null);
    fs.rmSync(sessionDir(id), { force: true });
  });
});
