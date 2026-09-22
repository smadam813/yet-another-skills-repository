'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { mapStore } = require('./helpers');
const { gateStateId, turnKey } = require('../hooks/razor-lib');
const { run } = require('../hooks/pre-tool-use');

// Non-exempt (outside tmpdir/scratchpad), nonexistent, not under a tests/ dir.
const newFile = (i) => path.join(__dirname, '..', 'does-not-exist', `d${i}.js`);

const input = (toolName, toolInput, extra) => ({
  session_id: 's1',
  hook_event_name: 'PreToolUse',
  tool_name: toolName,
  tool_input: toolInput || {},
  ...extra,
});

const write = (i, extra) => input('Write', { file_path: newFile(i) }, { prompt_id: 'p1', ...extra });

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

describe('run: one call, one state', () => {
  test('a single Write books the file meter turn state', () => {
    const store = mapStore();
    assert.strictEqual(run(write(1), { env: {}, store, tmpDir: os.tmpdir() }), null);
    assert.strictEqual(store.read('s1').turn.count, 1);
  });

  test('one deny per call, and every gate records its nudge, so the retry passes', () => {
    // Workspace at the plugin root: outside tmpdir (file meter live) and
    // outside tests/ (import guard live), with its own manifest.
    const ws = fs.mkdtempSync(path.join(__dirname, '..', 'disp-ws-'));
    try {
      fs.writeFileSync(path.join(ws, 'package.json'), JSON.stringify({ dependencies: { lodash: '^4' } }));
      const store = mapStore();
      const ctx = { env: { RAZOR_FILE_BUDGET: '1' }, store, tmpDir: os.tmpdir() };

      const first = input('Write', { file_path: path.join(ws, 'a.js'), content: 'const x = 1;\n' }, { prompt_id: 'p1' });
      assert.strictEqual(run(first, ctx), null);

      const both = input(
        'Write',
        { file_path: path.join(ws, 'b.js'), content: "const axios = require('axios');\n" },
        { prompt_id: 'p1' }
      );
      const reason = run(both, ctx);
      assert.match(reason, /adds a new node dependency/);
      assert.doesNotMatch(reason, /new file #/);

      // The file meter recorded its nudge although the import guard answered.
      const state = store.read('s1');
      assert.deepStrictEqual(state.reconsidered, { node: ['axios'] });
      assert.strictEqual(state.turn.fired, true);

      assert.strictEqual(run(both, ctx), null);
    } finally {
      fs.rmSync(ws, { recursive: true, force: true });
    }
  });
});

describe('run: subagent budget isolation', () => {
  test('a subagent gets its own file budget', () => {
    const store = mapStore();
    const ctx = { env: { RAZOR_FILE_BUDGET: '1' }, store, tmpDir: os.tmpdir() };
    const agent = { agent_id: 'agent-2' };
    assert.strictEqual(run(write(10, agent), ctx), null);
    assert.match(run(write(11, agent), ctx), /new file #2/);

    // Main thread's budget untouched by the agent's writes.
    assert.strictEqual(run(write(12), ctx), null);
    assert.strictEqual(store.read('s1').turn.count, 1);
    assert.strictEqual(store.read('s1--agent-2').turn.count, 2);
  });

  test('the session-wide /razor off toggle silences subagent-scoped calls too', () => {
    const store = mapStore();
    store.write('s1', { off: true });
    const call = input('Bash', { command: 'npm i left-pad' }, { agent_id: 'agent-3' });
    assert.strictEqual(run(call, { env: {}, store, tmpDir: os.tmpdir() }), null);
    assert.strictEqual(store.map.has('s1--agent-3'), false);
  });

  test('RAZOR_DISABLE silences every gate', () => {
    const call = input('Bash', { command: 'npm i left-pad' });
    assert.strictEqual(run(call, { env: { RAZOR_DISABLE: '1' }, store: mapStore(), tmpDir: os.tmpdir() }), null);
  });
});

describe('run: prompt_id turn boundaries', () => {
  test('a new prompt_id resets the file budget without any transcript', () => {
    const ctx = { env: { RAZOR_FILE_BUDGET: '1' }, store: mapStore(), tmpDir: os.tmpdir() };
    assert.strictEqual(run(write(20, { prompt_id: 'turn-a' }), ctx), null);
    assert.match(run(write(21, { prompt_id: 'turn-a' }), ctx), /new file #2/);
    assert.strictEqual(run(write(22, { prompt_id: 'turn-b' }), ctx), null);
  });
});

describe('run: the injected tmpDir', () => {
  test('the file meter exempts writes under the injected tmpDir only', () => {
    const tmpDir = path.join(__dirname, '..', 'does-not-exist');
    const env = { RAZOR_FILE_BUDGET: '1' };
    const exempt = { env, store: mapStore(), tmpDir };
    assert.strictEqual(run(write(30), exempt), null);
    assert.strictEqual(run(write(31), exempt), null);

    const counted = { env, store: mapStore(), tmpDir: os.tmpdir() };
    assert.strictEqual(run(write(30), counted), null);
    assert.match(run(write(31), counted), /new file #2/);
  });
});
