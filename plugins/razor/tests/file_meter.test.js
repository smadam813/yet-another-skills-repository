'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { mapStore, preToolUse, dispatch, writeTranscript } = require('./helpers');
const { stepTurn, classify, isExemptPath } = require('../hooks/file-meter');

// The workspace lives in the OS temp directory, so the run's tmpDir points
// somewhere else to keep the meter live. newFile paths are nonexistent and
// outside any test/docs/config tree, so they classify as production.
const REPO = fs.mkdtempSync(path.join(os.tmpdir(), 'razor-fm-'));
const TMP_DIR = path.join(REPO, 'tmp');
const newFile = (i) => path.join(REPO, 'src-does-not-exist', `f${i}.js`);

describe('unit: stepTurn', () => {
  test('fires once when the budget is crossed, then self-clears', () => {
    let turn;
    const results = [];
    for (let i = 0; i < 7; i++) {
      const { next, deny } = stepTurn(turn, 'turn-1', 4);
      turn = next;
      results.push(deny);
    }
    assert.deepStrictEqual(results, [false, false, false, false, true, false, false]);
  });

  test('a new turn key resets the counter', () => {
    let turn;
    for (let i = 0; i < 5; i++) turn = stepTurn(turn, 'turn-1', 4).next;
    assert.strictEqual(turn.fired, true);
    const { next, deny } = stepTurn(turn, 'turn-2', 4);
    assert.strictEqual(deny, false);
    assert.deepStrictEqual({ count: next.count, fired: next.fired }, { count: 1, fired: false });
  });

  test('uncounted kinds are tallied but never charged', () => {
    let turn;
    for (const kind of ['test', 'migration', 'config', 'docs', 'fixture', 'generated']) {
      turn = stepTurn(turn, 'turn-1', 1, kind).next;
    }
    assert.strictEqual(turn.count, 0);
    assert.strictEqual(turn.fired, false);
    assert.deepStrictEqual(turn.kinds, {
      test: 1,
      migration: 1,
      config: 1,
      docs: 1,
      fixture: 1,
      generated: 1,
    });
  });

  test('countAll charges every kind, for an operator-set ceiling', () => {
    let turn;
    const results = [];
    for (const kind of ['test', 'docs', 'production']) {
      const { next, deny } = stepTurn(turn, 'turn-1', 2, kind, true);
      turn = next;
      results.push(deny);
    }
    assert.deepStrictEqual(results, [false, false, true]);
  });
});

describe('unit: classify', () => {
  const cases = [
    ['src/service/order.js', 'production'],
    ['lib/parse.py', 'production'],
    ['tests/order.test.js', 'test'],
    ['src/order.spec.ts', 'test'],
    ['test_order.py', 'test'],
    ['__tests__/order.js', 'test'],
    ['tests/fixtures/order.json', 'test'],
    ['testdata/order.bin', 'fixture'],
    ['__snapshots__/order.js.snap', 'fixture'],
    ['db/migrations/001_add_orders.sql', 'migration'],
    ['dist/bundle.js', 'generated'],
    ['src/api.pb.go', 'generated'],
    ['src/proto/order_pb2.py', 'generated'],
    ['types/index.d.ts', 'generated'],
    ['docs/design.md', 'docs'],
    ['NOTES.md', 'docs'],
    ['config/app.yaml', 'config'],
    ['package.json', 'config'],
    ['.eslintrc.json', 'config'],
    ['vite.config.ts', 'config'],
    ['Dockerfile', 'config'],
    // Content and tooling, not modules to maintain: five icons used to spend
    // the whole production budget and deny the sixth write of the turn.
    ['public/icons/home.svg', 'asset'],
    ['assets/logo.png', 'asset'],
    ['fonts/inter.woff2', 'asset'],
    ['.gitignore', 'config'],
    ['.editorconfig', 'config'],
    ['.env.example', 'config'],
  ];
  for (const [file, kind] of cases) {
    test(`${file} -> ${kind}`, () => {
      assert.strictEqual(classify(path.join(REPO, file)), kind);
    });
  }
});

describe('unit: isExemptPath', () => {
  test('tmpdir and scratchpad are exempt, repo paths are not', () => {
    assert.strictEqual(isExemptPath(path.join(os.tmpdir(), 'x', 'y.js'), os.tmpdir()), true);
    assert.strictEqual(isExemptPath(path.join('D:', 'w', 'scratchpad', 'y.js'), os.tmpdir()), true);
    assert.strictEqual(isExemptPath(newFile(0), TMP_DIR), false);
  });
});

describe('integration: per-turn budget', () => {
  const input = (transcript, filePath) =>
    preToolUse('Write', { file_path: filePath }, { transcript_path: transcript });
  const meter = (data, env, store) => dispatch(data, env || {}, store, TMP_DIR);

  test('5th new production file denied, 6th passes, new turn resets', () => {
    const store = mapStore();
    const t1 = writeTranscript('turn-uuid-1');
    for (let i = 1; i <= 4; i++) {
      assert.strictEqual(meter(input(t1, newFile(i)), {}, store), null);
    }
    assert.match(meter(input(t1, newFile(5)), {}, store), /razor: new production file #5/);
    assert.strictEqual(meter(input(t1, newFile(6)), {}, store), null);

    const t2 = writeTranscript('turn-uuid-2');
    for (let i = 1; i <= 4; i++) {
      assert.strictEqual(meter(input(t2, newFile(10 + i)), {}, store), null);
    }
  });

  test('a feature shipping with tests, a migration and config is never denied', () => {
    const store = mapStore();
    const t = writeTranscript('turn-uuid-shape');
    const files = [
      'src-does-not-exist/order.js',
      'tests/order.test.js',
      'tests/order2.test.js',
      'db/migrations/001_orders.sql',
      'db/migrations/002_orders.sql',
      'config/orders.yaml',
      'docs/orders.md',
      'dist/orders.min.js',
    ].map((f) => path.join(REPO, f));
    for (const f of files) {
      assert.strictEqual(meter(input(t, f), {}, store), null);
    }
  });

  test('the deny names the uncounted work and the placement', () => {
    const store = mapStore();
    const t = writeTranscript('turn-uuid-msg');
    meter(input(t, path.join(REPO, 'tests', 'a.test.js')), {}, store);
    meter(input(t, path.join(REPO, 'docs', 'a.md')), {}, store);
    for (let i = 1; i <= 4; i++) {
      meter(input(t, newFile(40 + i)), {}, store);
    }
    const reason = meter(input(t, newFile(45)), {}, store);
    assert.match(reason, /razor: new production file #5 this turn \(budget 4\)/);
    assert.match(reason, /uncounted: 1 tests, 1 docs/);
    assert.match(reason, /creates a new directory, src-does-not-exist\//);
    assert.match(reason, /does this shape match what was asked for\?/);
  });

  test('existing files are never gated', () => {
    const store = mapStore();
    const t = writeTranscript('turn-uuid-3');
    for (let i = 0; i < 6; i++) {
      assert.strictEqual(meter(input(t, __filename), {}, store), null);
    }
  });

  test('tmpdir files are exempt even past budget', () => {
    const store = mapStore();
    const t = writeTranscript('turn-uuid-4');
    for (let i = 0; i < 6; i++) {
      const p = path.join(TMP_DIR, 'razor-nope', `f${i}.js`);
      assert.strictEqual(meter(input(t, p), {}, store), null);
    }
  });

  test('RAZOR_FILE_BUDGET=0 disables the meter', () => {
    const store = mapStore();
    const t = writeTranscript('turn-uuid-5');
    for (let i = 0; i < 3; i++) {
      assert.strictEqual(meter(input(t, newFile(20 + i)), { RAZOR_FILE_BUDGET: '0' }, store), null);
    }
  });

  test('RAZOR_FILE_BUDGET=1 fires on the second new file', () => {
    const store = mapStore();
    const t = writeTranscript('turn-uuid-6');
    const env = { RAZOR_FILE_BUDGET: '1' };
    assert.strictEqual(meter(input(t, newFile(30)), env, store), null);
    assert.match(meter(input(t, newFile(31)), env, store), /razor: new file #2/);
  });

  test('an explicit budget is a raw ceiling: tests and docs count too', () => {
    const store = mapStore();
    const t = writeTranscript('turn-uuid-raw');
    const env = { RAZOR_FILE_BUDGET: '2' };
    const files = [
      path.join(REPO, 'tests', 'raw1.test.js'),
      path.join(REPO, 'docs', 'raw1.md'),
      path.join(REPO, 'config', 'raw1.yaml'),
    ];
    assert.strictEqual(meter(input(t, files[0]), env, store), null);
    assert.strictEqual(meter(input(t, files[1]), env, store), null);
    assert.match(meter(input(t, files[2]), env, store), /razor: new file #3/);
  });
});
