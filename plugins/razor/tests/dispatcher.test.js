'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { mapStore, preToolUse, dispatch } = require('./helpers');
const { gateStateId, turnKey } = require('../hooks/razor-lib');

// Non-exempt (outside tmpdir/scratchpad), nonexistent, not under a tests/ dir.
const newFile = (i) => path.join(__dirname, '..', 'does-not-exist', `d${i}.js`);

const write = (i, extra) => preToolUse('Write', { file_path: newFile(i) }, { prompt_id: 'p1', ...extra });

describe('unit: state scoping helpers', () => {
  test('gateStateId namespaces by agent_id and falls back to the session', () => {
    assert.strictEqual(gateStateId({ session_id: 's1' }), 's1');
    assert.strictEqual(gateStateId({ session_id: 's1', agent_id: 'a9' }), 's1--a9');
  });

  test('turnKey prefers the harness prompt_id over the transcript', () => {
    assert.strictEqual(turnKey({ prompt_id: 'p-123', transcript_path: '/nope' }), 'p-123');
    assert.strictEqual(turnKey({ transcript_path: '' }), 'no-transcript');
  });
});

describe('integration: one call, one state', () => {
  test('a single Write books the file meter turn state', () => {
    const store = mapStore();
    assert.strictEqual(dispatch(write(1), {}, store), null);
    assert.strictEqual(store.read('s1').turn.count, 1);
  });

  test('one deny per call, and every gate records its nudge, so the retry passes', () => {
    // Workspace at the plugin root: outside tmpdir (file meter live) and
    // outside tests/ (import guard live), with its own manifest.
    const ws = fs.mkdtempSync(path.join(__dirname, '..', 'disp-ws-'));
    try {
      fs.writeFileSync(path.join(ws, 'package.json'), JSON.stringify({ dependencies: { lodash: '^4' } }));
      const store = mapStore();
      const env = { RAZOR_FILE_BUDGET: '1' };

      const first = preToolUse('Write', { file_path: path.join(ws, 'a.js'), content: 'const x = 1;\n' }, { prompt_id: 'p1' });
      assert.strictEqual(dispatch(first, env, store), null);

      const both = preToolUse(
        'Write',
        { file_path: path.join(ws, 'b.js'), content: "const axios = require('axios');\n" },
        { prompt_id: 'p1' }
      );
      const reason = dispatch(both, env, store);
      assert.match(reason, /adds a new node dependency/);
      assert.doesNotMatch(reason, /new file #/);

      // The file meter records its nudge although the import guard denies.
      const state = store.read('s1');
      assert.deepStrictEqual(state.reconsidered, { node: ['axios'] });
      assert.strictEqual(state.turn.fired, true);

      assert.strictEqual(dispatch(both, env, store), null);
    } finally {
      fs.rmSync(ws, { recursive: true, force: true });
    }
  });
});

describe('integration: subagent budget isolation', () => {
  test('a subagent gets its own file budget', () => {
    const store = mapStore();
    const env = { RAZOR_FILE_BUDGET: '1' };
    const agent = { agent_id: 'agent-2' };
    assert.strictEqual(dispatch(write(10, agent), env, store), null);
    assert.match(dispatch(write(11, agent), env, store), /new file #2/);

    // Main thread's budget untouched by the agent's writes.
    assert.strictEqual(dispatch(write(12), env, store), null);
    assert.strictEqual(store.read('s1').turn.count, 1);
    assert.strictEqual(store.read('s1--agent-2').turn.count, 2);
  });

  test('the session-wide /razor off toggle silences subagent-scoped calls too', () => {
    const store = mapStore();
    store.write('s1', { off: true });
    const call = preToolUse('Bash', { command: 'npm i left-pad' }, { agent_id: 'agent-3' });
    assert.strictEqual(dispatch(call, {}, store), null);
    assert.strictEqual(store.map.has('s1--agent-3'), false);
  });

  test('RAZOR_DISABLE silences every gate', () => {
    const call = preToolUse('Bash', { command: 'npm i left-pad' });
    assert.strictEqual(dispatch(call, { RAZOR_DISABLE: '1' }), null);
  });
});

describe('integration: prompt_id turn boundaries', () => {
  test('a new prompt_id resets the file budget without any transcript', () => {
    const store = mapStore();
    const env = { RAZOR_FILE_BUDGET: '1' };
    assert.strictEqual(dispatch(write(20, { prompt_id: 'turn-a' }), env, store), null);
    assert.match(dispatch(write(21, { prompt_id: 'turn-a' }), env, store), /new file #2/);
    assert.strictEqual(dispatch(write(22, { prompt_id: 'turn-b' }), env, store), null);
  });
});

describe('integration: the tmpDir the caller passes', () => {
  test('the file meter exempts writes under the given tmpDir only', () => {
    const tmpDir = path.join(__dirname, '..', 'does-not-exist');
    const env = { RAZOR_FILE_BUDGET: '1' };
    const exempt = mapStore();
    assert.strictEqual(dispatch(write(30), env, exempt, tmpDir), null);
    assert.strictEqual(dispatch(write(31), env, exempt, tmpDir), null);

    const counted = mapStore();
    assert.strictEqual(dispatch(write(30), env, counted), null);
    assert.match(dispatch(write(31), env, counted), /new file #2/);
  });
});
