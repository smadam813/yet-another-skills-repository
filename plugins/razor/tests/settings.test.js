'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { mapStore, preToolUse, dispatch } = require('./helpers');
const { fileStore } = require('../hooks/razor-lib');
const { shouldFire } = require('../hooks/build-ledger');

const newFile = (i) => path.join(__dirname, '..', 'does-not-exist', `s${i}.js`);

const write = (i, extra) => preToolUse('Write', { file_path: newFile(i) }, { prompt_id: 'p1', ...extra });

describe('integration: plugin options (CLAUDE_PLUGIN_OPTION_*)', () => {
  test('file_budget option is honored', () => {
    const store = mapStore();
    const env = { CLAUDE_PLUGIN_OPTION_FILE_BUDGET: '1' };
    assert.strictEqual(dispatch(write(1), env, store), null);
    assert.match(dispatch(write(2), env, store), /budget 1/);
  });

  test('an explicit RAZOR_FILE_BUDGET env var overrides the option', () => {
    const store = mapStore();
    const env = { CLAUDE_PLUGIN_OPTION_FILE_BUDGET: '1', RAZOR_FILE_BUDGET: '2' };
    assert.strictEqual(dispatch(write(3), env, store), null);
    assert.strictEqual(dispatch(write(4), env, store), null);
    assert.match(dispatch(write(5), env, store), /budget 2/);
  });

  test('each call reads the budget from its own env', () => {
    const store = mapStore();
    assert.strictEqual(dispatch(write(6), { RAZOR_FILE_BUDGET: '1' }, store), null);
    assert.strictEqual(dispatch(write(7), { RAZOR_FILE_BUDGET: '5' }, store), null);
    assert.match(dispatch(write(8), { RAZOR_FILE_BUDGET: '1' }, store), /budget 1/);
  });

  test('an explicit RAZOR_DEP_GUARD env var wins over the option', () => {
    const call = preToolUse('Bash', { command: 'npm i lodash' });
    const env = { CLAUDE_PLUGIN_OPTION_DEP_GUARD: 'false', RAZOR_DEP_GUARD: 'on' };
    assert.match(dispatch(call, env), /adds a new npm dependency/);
  });
});

describe('integration: persistent state dir', () => {
  test('state lands in CLAUDE_PLUGIN_DATA, agent-scoped files included', () => {
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'razor-data-'));
    const env = { CLAUDE_PLUGIN_DATA: dataDir };
    const store = fileStore(env);

    dispatch(write(30), env, store);
    dispatch(write(31, { agent_id: 'ag1' }), env, store);
    const files = fs.readdirSync(dataDir).filter((f) => f.startsWith('razor-') && f.endsWith('.json'));
    assert.strictEqual(files.length, 2); // session state + agent-scoped state
  });
});

describe('the plugin-option wiring reaches every gate it declares', () => {
  const off = (key) => ({ [`CLAUDE_PLUGIN_OPTION_${key}`]: 'false' });

  test('dep_guard=false silences the install gate', () => {
    assert.strictEqual(dispatch(preToolUse('Bash', { command: 'npm i axios' }), off('DEP_GUARD')), null);
  });

  test('import_guard=false silences the import gate', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'razor-opt-imp-'));
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ dependencies: { lodash: '^4' } }));
    const call = preToolUse('Write', { file_path: path.join(dir, 'a.js'), content: "require('axios');\n" });
    assert.match(dispatch(call, {}), /importing `axios`/);
    assert.strictEqual(dispatch(call, off('IMPORT_GUARD')), null);
  });

  test('manifest_guard=false silences the manifest gate', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'razor-opt-man-'));
    const file = path.join(dir, 'package.json');
    fs.writeFileSync(file, JSON.stringify({ dependencies: { lodash: '^4' } }, null, 2));
    const call = preToolUse('Edit', {
      file_path: file, old_string: '"lodash": "^4"', new_string: '"lodash": "^4",\n    "axios": "^1"',
    });
    assert.match(dispatch(call, {}), /to package.json adds a new node dependency/);
    assert.strictEqual(dispatch(call, off('MANIFEST_GUARD')), null);
  });
});

describe('the ledger thresholds are readable knobs', () => {
  test('a generous budget does not fire on a diff a tight one would catch', () => {
    assert.strictEqual(shouldFire({ insertions: 600, deletions: 0, newFiles: 2 }, 500, 8), true);
    assert.strictEqual(shouldFire({ insertions: 600, deletions: 0, newFiles: 2 }, 5000, 8), false);
  });

  test('the new-file budget fires on its own', () => {
    assert.strictEqual(shouldFire({ insertions: 10, deletions: 5, newFiles: 9 }, 500, 8), true);
    assert.strictEqual(shouldFire({ insertions: 10, deletions: 5, newFiles: 9 }, 500, 20), false);
  });
});
