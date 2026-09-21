'use strict';

// The transform seam: one call from a raw PostToolUse payload and its
// dependencies to a view, a record, and an optional note. Every test here
// passes an in-memory scratch and a stub turn, so nothing spawns, nothing
// patches stdout, and nothing reads the environment.

const { test, describe } = require('node:test');
const assert = require('node:assert');
const { transform, settingsFromEnv, NOTE_TEXT } = require('../hooks/lib/transform');
const { memoryScratch, stubTurn } = require('./helpers');

function makeDeps(env = {}, scratchOpts) {
  return { scratch: memoryScratch(scratchOpts), turn: stubTurn(), settings: settingsFromEnv(env) };
}

const wideLines = (n) => Array.from({ length: n }, (_, i) => 'plain info line ' + i + ' padded out a bit for width here');

describe('transform: a shell payload through the sidecar path', () => {
  const payload = {
    tool_name: 'Bash',
    session_id: 'mem',
    transcript_path: '/no/such/transcript.jsonl',
    tool_input: { command: 'npm test' },
    tool_response: wideLines(700).join('\n'),
  };

  test('returns the digest as the view, a sidecar record, and the note', () => {
    const deps = makeDeps();
    const { updated, record, context } = transform(payload, deps);

    // The host may already have cut a shell output this size, so the digest
    // says "as hush received it" rather than "in full".
    assert.match(updated, /saved to \/memory\/mem\/parked\.txt as hush received it;/);
    assert.ok(updated.length < payload.tool_response.length, 'the view is smaller than the input');

    assert.strictEqual(record.tool, 'Bash');
    assert.strictEqual(record.session, 'mem');
    assert.strictEqual(record.action, 'sidecar');
    assert.strictEqual(record.recovery, 'sidecar');
    assert.strictEqual(record.recoveryPath, '/memory/mem/parked.txt');
    assert.strictEqual(record.sidecarPath, '/memory/mem/parked.txt');
    assert.strictEqual(record.retention, 'session');
    assert.strictEqual(record.bytesIn, payload.tool_response.length);
    assert.strictEqual(record.bytesOut, updated.length);
    assert.ok(record.omitted > 0);
    assert.strictEqual(record.fallback, null);

    assert.strictEqual(context, NOTE_TEXT);
  });

  test('parks the sidecar, adds the total, and claims the note through scratch', () => {
    const deps = makeDeps();
    const { record } = transform(payload, deps);
    const { calls } = deps.scratch;
    assert.deepStrictEqual(calls.parked.map((p) => p.sessionId), ['mem']);
    assert.strictEqual(calls.parked[0].content, payload.tool_response);
    assert.deepStrictEqual(calls.saved, [{ sessionId: 'mem', bytesIn: record.bytesIn, bytesOut: record.bytesOut }]);
    assert.deepStrictEqual(calls.claimed, ['mem']);
  });

  test('the note is undefined when scratch says another fire already claimed it', () => {
    const deps = makeDeps({}, { claim: false });
    const { updated, context } = transform(payload, deps);
    assert.ok(updated !== undefined);
    assert.strictEqual(context, undefined);
  });

  test('the note is undefined when the note switch is off', () => {
    const deps = makeDeps({ HUSH_NOTE: 'off' });
    const { updated, context } = transform(payload, deps);
    assert.ok(updated !== undefined);
    assert.strictEqual(context, undefined);
    assert.deepStrictEqual(deps.scratch.calls.claimed, []);
  });

  test('with the sidecar off the same payload takes the inline cap', () => {
    const deps = makeDeps({ HUSH_SIDECAR: 'off', HUSH_TEMPLATE: 'off' });
    const { updated, record } = transform(payload, deps);
    assert.strictEqual(record.action, 'cap');
    assert.strictEqual(record.recovery, 'rerun-command');
    assert.deepStrictEqual(deps.scratch.calls.parked, []);
    assert.ok(updated.length < payload.tool_response.length);
  });
});

describe('transform: silence and rejection carry a record', () => {
  test('short clean output: no view, a passthrough record, no note', () => {
    const deps = makeDeps();
    const { updated, record, context } = transform(
      { tool_name: 'Bash', session_id: 'mem', tool_response: 'all good\n3 tests passed' },
      deps
    );
    assert.strictEqual(updated, undefined);
    assert.strictEqual(context, undefined);
    assert.strictEqual(record.action, 'passthrough');
    assert.strictEqual(record.bytesOut, record.bytesIn);
    assert.deepStrictEqual(deps.scratch.calls.claimed, []);
    assert.strictEqual(deps.scratch.calls.saved.length, 1);
  });

  test('deliver drops a view the record cannot back, and the record says why', () => {
    // 300 empty lines: the capped-failure footer costs more than the lines it
    // stands for, so the view is not smaller and the boundary drops it.
    const deps = makeDeps({ HUSH_SIDECAR: 'off' });
    const { updated, record } = transform(
      { tool_name: 'Bash', session_id: 'mem', tool_response: { stdout: '\n'.repeat(300), stderr: '', exitCode: 1 } },
      deps
    );
    assert.strictEqual(updated, undefined);
    assert.strictEqual(record.action, 'rejected-not-smaller');
    assert.match(record.fallback, /bytes against/);
    assert.strictEqual(record.bytesOut, record.bytesIn);
    assert.strictEqual(record.omitted, 0);
  });

  test('the turn reader drives the enumeration carve-out', () => {
    const deps = { ...makeDeps({ HUSH_SIDECAR: 'off' }), turn: stubTurn('list every line of the output') };
    const lines = Array.from({ length: 200 }, (_, i) => `item ${i}`);
    const { record } = transform({ tool_name: 'Bash', session_id: 'mem', tool_response: lines.join('\n') }, deps);
    assert.strictEqual(record.action, 'enumerate-passthrough');
    assert.strictEqual(record.omitted, 0);
  });
});
