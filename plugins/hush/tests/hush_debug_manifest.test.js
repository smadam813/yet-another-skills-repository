'use strict';

// HUSH_DEBUG=1 decision manifest. The transform hands session scratch one
// JSON line per handled tool output, including every do-nothing path. It
// hands nothing over without the env gate, and the gate never changes what
// any compression path produces (see the `decision` side-channel comments
// in hooks/lib/transform.js).
//
// The cases here call the transform with an in-memory scratch and assert on
// the records that scratch received. Only the adapter's own gates (the Core
// switch, the watched-tools check) still spawn the hook.

const { test, describe } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const { runHook, hookOutput, memoryDeps, withDebug, fire } = require('./helpers');
const { transform, deliver } = require('../hooks/lib/transform');
const { buildRecord, recoveryGap } = require('../hooks/lib/transform-manifest');
const { manifestPath, removeSession } = require('../hooks/lib/session-scratch');

// A spawned hook with the gate on, for the adapter's own gates. Returns the
// hook's stdout and whether a manifest file appeared under `label`.
function spawnGated(label, payload, env) {
  const id = `hush-debug-test-${label}-${process.pid}-${Date.now()}`;
  try {
    const r = runHook('compress-tool-output.js', { ...payload, session_id: id }, { HUSH_DEBUG: '1', ...env });
    return { out: hookOutput(r), manifest: fs.existsSync(manifestPath(id)) };
  } finally {
    removeSession(id);
  }
}

// The one record scratch received for the fire.
function received(calls) {
  assert.strictEqual(calls.manifest.length, 1, `expected exactly one record, got ${calls.manifest.length}`);
  return calls.manifest[0].record;
}

const uniqueLines = (n) => Array.from({ length: n }, (_, i) => `line ${i} of the fixture, unique content`).join('\n');

describe('HUSH_DEBUG manifest: gate', () => {
  test('off by default — no record reaches scratch', () => {
    const deps = memoryDeps();
    const { record } = withDebug(undefined, () => transform({ tool_name: 'Bash', session_id: 'gate-off', tool_response: uniqueLines(300) }, deps));
    const { calls } = deps.scratch;
    assert.ok(record, 'the record is still built and checked');
    assert.deepStrictEqual(calls.manifest, []);
  });

  test('HUSH_DEBUG=0 (or anything but "1") still stays off', () => {
    const { calls } = fire({ tool_name: 'Bash', session_id: 'gate-zero', tool_response: uniqueLines(300) }, {}, { debug: '0' });
    assert.deepStrictEqual(calls.manifest, []);
  });

  test('unwatched, unhandled tools never get a line, even with the gate on', () => {
    const { out, manifest } = spawnGated('gate-unhandled', { tool_name: 'Glob', tool_response: 'x'.repeat(500) });
    assert.strictEqual(out, null);
    assert.strictEqual(manifest, false);
  });

  test('HUSH_DISABLE=1 suppresses the manifest too — nothing was handled', () => {
    const { out, manifest } = spawnGated('gate-disabled', { tool_name: 'Bash', tool_response: uniqueLines(300) }, { HUSH_DISABLE: '1' });
    assert.strictEqual(out, null);
    assert.strictEqual(manifest, false);
  });
});

describe('HUSH_DEBUG manifest: one honest line per decision path', () => {
  test('cap — a big passing shell output gets truncated', () => {
    const body = uniqueLines(200); // well under sidecar's 15000 chars, well over the 60-line pass cap
    // uniqueLines shares one shape (only the number token varies) — pin
    // template-collapse off so this isolates capLines specifically.
    const { record, calls } = fire({ tool_name: 'Bash', session_id: 'cap', tool_response: body }, { HUSH_TEMPLATE: 'off' });
    const entry = received(calls);
    assert.strictEqual(entry, record, 'scratch received the record the transform returned');
    assert.strictEqual(entry.tool, 'Bash');
    assert.strictEqual(entry.action, 'cap');
    assert.strictEqual(entry.bytesIn, body.length);
    assert.ok(entry.bytesOut < entry.bytesIn);
  });

  test('template-collapse — a run of same-shaped lines collapses but stays under the cap', () => {
    const lines = [
      ...Array.from({ length: 20 }, (_, i) => `INFO worker-${i} processing job ${8000 + i}`),
      'one-off line a', 'one-off line b',
    ];
    const { calls } = fire({ tool_name: 'Bash', session_id: 'template', tool_response: lines.join('\n') });
    const entry = received(calls);
    assert.strictEqual(entry.action, 'template-collapse');
    assert.ok(entry.bytesOut < entry.bytesIn);
  });

  test('enumerate-passthrough — a completeness prompt keeps a big-but-under-2000-line log whole', () => {
    const body = Array.from({ length: 900 }, (_, i) => `[${i}] compile mod_${i} ... ok`).join('\n');
    const { calls } = fire(
      { tool_name: 'Bash', session_id: 'enum', tool_input: { command: 'node build.js' }, tool_response: body },
      {},
      { promptText: 'Report every warning: list each one, with file and code.' }
    );
    assert.strictEqual(received(calls).action, 'enumerate-passthrough');
  });

  test('scrub-only — ANSI stripped, nothing structural cut', () => {
    const { calls } = fire({ tool_name: 'Bash', session_id: 'scrub', tool_response: '\x1b[32mok\x1b[0m all good' });
    const entry = received(calls);
    assert.strictEqual(entry.action, 'scrub-only');
    assert.ok(entry.bytesOut < entry.bytesIn);
  });

  test('passthrough — short clean Bash output, byte-identical', () => {
    const { calls } = fire({ tool_name: 'Bash', session_id: 'pass-bash', tool_response: 'ok\ndone' });
    const entry = received(calls);
    assert.strictEqual(entry.action, 'passthrough');
    assert.strictEqual(entry.bytesIn, entry.bytesOut);
  });

  test('passthrough — a Read of an ordinary source file (not log/generated-shaped)', () => {
    const content = Array.from({ length: 500 }, (_, i) => `const x${i} = ${i};`).join('\n');
    const { calls } = fire({
      tool_name: 'Read', session_id: 'pass-read',
      tool_input: { file_path: 'C:\\repo\\src\\big.js' },
      tool_response: { type: 'text', file: { filePath: 'C:\\repo\\src\\big.js', content, numLines: 500, startLine: 1, totalLines: 500 } },
    });
    const entry = received(calls);
    assert.strictEqual(entry.tool, 'Read');
    assert.strictEqual(entry.action, 'passthrough');
    assert.strictEqual(entry.bytesIn, content.length);
    assert.strictEqual(entry.bytesOut, content.length);
  });

  test('sidecar — a very large shell output moves to a file behind a digest', () => {
    const body = uniqueLines(500); // ~18KB: over the sidecar floor, under the shell bound
    const { calls } = fire({ tool_name: 'Bash', session_id: 'sidecar', tool_response: body });
    const entry = received(calls);
    assert.strictEqual(entry.action, 'sidecar');
    assert.strictEqual(entry.bytesIn, body.length);
    assert.ok(entry.bytesOut < entry.bytesIn);
    assert.strictEqual(calls.parked[0].content, body, 'the whole input went to scratch');
  });

  // Past the host-truncation size the host parks the result itself and shows a
  // 2KB preview, so stepping aside here left the model reading the parked file
  // back into context. The recovery copy goes out instead, and only the header
  // changes: "as hush received it" rather than "in full".
  test('sidecar — a shell output past the host-truncation size still gets a recovery copy', () => {
    const body = uniqueLines(900); // ~31KB: over the shell bound
    assert.ok(body.length >= 28000, 'fixture must clear the shell bound for this test to mean anything');
    const { updated, calls } = fire({ tool_name: 'Bash', session_id: 'guard', tool_response: body });
    const entry = received(calls);
    assert.strictEqual(entry.action, 'sidecar');
    assert.ok(entry.sidecarPath, 'the parked file is recorded');
    assert.ok(entry.bytesOut < entry.bytesIn / 2, 'and the digest is what reaches the model');
    assert.match(updated, /as hush received it/);
  });

  // A failing run is the one output whose detail is evidence, so it takes the
  // recovery copy even past the host-truncation size the guard above steps
  // aside at — otherwise the inline cap is the only surviving record of it.
  test('sidecar — a FAILING shell output past the host-truncation size still gets a recovery copy', () => {
    const lines = Array.from({ length: 900 }, (_, i) => `line ${i} of the fixture, unique content`);
    lines[400] = "src/boot.ts(41,7): error TS2304: Cannot find name 'configure'.";
    lines.push('Build failed with exit code 1');
    const body = lines.join('\n');
    assert.ok(body.length >= 28000, 'fixture must clear the shell bound for this test to mean anything');

    const { updated, calls } = fire({ tool_name: 'Bash', session_id: 'fail-sidecar', tool_response: body });
    const entry = received(calls);
    assert.strictEqual(entry.action, 'sidecar');
    assert.strictEqual(entry.recovery, 'sidecar');
    assert.strictEqual(entry.retention, 'session');
    assert.strictEqual(entry.retrieval, false);
    assert.ok(entry.recoveryPath, 'the record names where the full failure output went');
    assert.ok(entry.omitted > 0);
    assert.strictEqual(entry.preserved + entry.omitted, entry.linesIn);
    assert.strictEqual(calls.parked[0].path, entry.recoveryPath, 'the record names the parked copy');
    assert.strictEqual(calls.parked[0].content, body, 'the complete failure output went to scratch');

    // The header claims only what it can: at this size the host may have cut
    // the tail before hush ever saw it, so "in full" is not on offer.
    assert.match(updated, /was saved to \S+ as hush received it/);
    assert.doesNotMatch(updated, /saved in full/);
  });

  test('object response (stdout/stderr) still emits exactly one combined line', () => {
    const body = uniqueLines(200);
    const { calls } = fire({
      tool_name: 'PowerShell', session_id: 'object', tool_response: { stdout: body, stderr: '', interrupted: false },
    }, { HUSH_TEMPLATE: 'off' });
    assert.strictEqual(calls.manifest.length, 1, 'one line for the whole tool output, not one per field');
    assert.strictEqual(calls.manifest[0].record.action, 'cap');
  });
});

describe('adversarial no-op fixtures', () => {
  function sidecarFileFrom(digest) {
    const m = String(digest).match(/saved in full to ([^;]+);/);
    return m ? m[1].trim() : null;
  }

  test('a ~20KB single-line minified JSON string: no corruption, no sidecar overclaim, honest manifest', () => {
    const obj = { records: Array.from({ length: 400 }, (_, i) => ({ id: i, name: `item-${i}`, value: i * 3.14, flag: i % 2 === 0 })) };
    const minified = JSON.stringify(obj); // one line, no whitespace
    assert.strictEqual(minified.includes('\n'), false, 'fixture must be genuinely single-line');
    assert.ok(minified.length >= 20000, `fixture should be ~20KB (was ${minified.length})`);

    const { updated, calls } = fire({ tool_name: 'Bash', session_id: 'adv-json', tool_response: minified });
    assert.strictEqual(updated, undefined, 'a single line has nothing to cut — hush stays silent rather than growing the output');
    assert.doesNotThrow(() => JSON.parse(minified), 'the ORIGINAL fixture is unaffected by hush — no mutation of source data');

    const entry = received(calls);
    // A single-line payload leaves buildSidecarDigest's head/tail trim nothing
    // to cut, so maybeSidecar bails (digest would be larger than the source)
    // and compress() falls through to the ordinary inline cap — also a no-op
    // for one line. The transform parks nothing, and the manifest reflects
    // the true no-op instead of a digest that grew past the input.
    assert.strictEqual(entry.action, 'passthrough');
    assert.strictEqual(entry.bytesIn, minified.length);
    assert.strictEqual(entry.bytesOut, entry.bytesIn);
    assert.deepStrictEqual(calls.parked, []);
  });

  test('a dense multi-line base64 blob sidecars cleanly and is never corrupted', () => {
    const raw = Buffer.alloc(14000);
    for (let i = 0; i < raw.length; i++) raw[i] = (i * 2654435761) % 256; // deterministic pseudo-random bytes
    const b64 = raw.toString('base64'); // dense, no natural line breaks
    const wrapped = b64.match(/.{1,76}/g).join('\n'); // PEM-style wrapping
    assert.ok(wrapped.length >= 15000, `fixture should clear the sidecar floor (was ${wrapped.length})`);

    const { updated: out, calls } = fire({ tool_name: 'Bash', session_id: 'adv-b64', tool_response: wrapped });
    const updated = out === undefined ? wrapped : out;
    assert.ok(updated.length <= wrapped.length, 'output never grows beyond input');

    const entry = received(calls);
    assert.ok(['sidecar', 'shell-guard-skip', 'cap'].includes(entry.action), `expected a graceful action, got ${entry.action}`);
    if (entry.action === 'sidecar') {
      assert.strictEqual(sidecarFileFrom(updated), calls.parked[0].path, 'the digest names the parked copy');
      assert.strictEqual(calls.parked[0].content, wrapped, 'no sidecar overclaim — full original bytes, unmangled');
    }
  });

  test('a small single-line JSON blob (under the sidecar floor) passes through with nothing to cut', () => {
    const minified = JSON.stringify({ ok: true, items: Array.from({ length: 20 }, (_, i) => i) });
    const { updated, calls } = fire({ tool_name: 'Bash', session_id: 'adv-json-small', tool_response: minified }, { HUSH_SIDECAR: 'off' });
    assert.strictEqual(updated, undefined, 'a single line under any cap has nothing to trim — hush stays silent');
    const entry = received(calls);
    assert.strictEqual(entry.action, 'passthrough');
    assert.strictEqual(entry.bytesIn, entry.bytesOut);
  });
});

// One manifest contract for every Core transform, and the
// recovery boundary that goes with it.
describe('transform manifest: the record contract', () => {
  const RECORD_KEYS = [
    'action', 'bytesIn', 'bytesOut', 'fallback', 'linesIn', 'omitted',
    'preserved', 'recovery', 'recoveryPath', 'retention', 'retrieval', 'session',
    'sidecarPath', 'tool',
  ];
  function only(calls, id) {
    const e = received(calls);
    assert.deepStrictEqual(Object.keys(e).sort(), RECORD_KEYS, 'every record carries the whole contract');
    assert.strictEqual(e.session, id, 'the record names the session that owns it');
    assert.strictEqual(calls.manifest[0].sessionId, id, 'and scratch files it under that session');
    assert.strictEqual(e.preserved + e.omitted, e.linesIn, 'preserved and omitted account for every input line');
    return e;
  }

  test('cap — omitted lines, recoverable by re-running the command', () => {
    const body = uniqueLines(200);
    const { calls } = fire({ tool_name: 'Bash', session_id: 'rec-cap', tool_response: body }, { HUSH_TEMPLATE: 'off' });
    const e = only(calls, 'rec-cap');
    assert.strictEqual(e.action, 'cap');
    assert.strictEqual(e.tool, 'Bash');
    assert.ok(e.omitted > 0, 'a capped view left lines out');
    assert.strictEqual(e.recovery, 'rerun-command');
    assert.strictEqual(e.retention, 'none');
    assert.strictEqual(e.fallback, null);
  });

  test('sidecar — the recovery location is the parked copy, with its retention state', () => {
    const body = uniqueLines(500);
    const { calls } = fire({ tool_name: 'Bash', session_id: 'rec-sidecar', tool_response: body });
    const e = only(calls, 'rec-sidecar');
    assert.strictEqual(e.action, 'sidecar');
    assert.strictEqual(e.recovery, 'sidecar');
    assert.ok(e.recoveryPath, 'the record names where the full output went');
    assert.strictEqual(e.recoveryPath, calls.parked[0].path, 'the named recovery copy is the one scratch parked');
    assert.strictEqual(calls.parked[0].content, body, 'and it holds the full input');
    assert.strictEqual(e.retention, 'session');
    assert.ok(e.omitted > 0);
  });

  test('a record is metadata only — no line of the output is ever in it', () => {
    const secretish = ['unmistakable-payload-marker-alpha', ...Array.from({ length: 400 }, (_, i) => `row ${i} unmistakable-payload-marker-beta`)].join('\n');
    const { calls } = fire({ tool_name: 'Bash', session_id: 'rec-metadata', tool_response: secretish });
    const e = only(calls, 'rec-metadata');
    const serialized = JSON.stringify(e);
    assert.doesNotMatch(serialized, /unmistakable-payload-marker/, 'counts and paths only, never content');
  });

  test('passthrough — nothing omitted, nothing to recover', () => {
    const content = Array.from({ length: 500 }, (_, i) => `const x${i} = ${i};`).join('\n');
    const { calls } = fire({
      tool_name: 'Read', session_id: 'rec-pass',
      tool_input: { file_path: 'C:\\repo\\src\\big.js' },
      tool_response: { type: 'text', file: { filePath: 'C:\\repo\\src\\big.js', content, numLines: 500, startLine: 1, totalLines: 500 } },
    });
    const e = only(calls, 'rec-pass');
    assert.strictEqual(e.action, 'passthrough');
    assert.strictEqual(e.omitted, 0);
    assert.strictEqual(e.preserved, e.linesIn);
  });

  test('a Read hush does compress names the file itself as the recovery location', () => {
    // Short lines on purpose: over the line cap, under the sidecar floor, so
    // this exercises the inline path rather than the sidecar's own recovery.
    const content = Array.from({ length: 300 }, (_, i) => `INFO request ${i}`).join('\n');
    assert.ok(content.length < 15000, 'fixture must stay under the sidecar floor');
    const { calls } = fire({
      tool_name: 'Read', session_id: 'rec-read',
      tool_input: { file_path: 'C:\\repo\\logs\\app.log' },
      tool_response: { type: 'text', file: { filePath: 'C:\\repo\\logs\\app.log', content, numLines: 300, startLine: 1, totalLines: 300 } },
    });
    const e = only(calls, 'rec-read');
    assert.ok(e.omitted > 0);
    assert.strictEqual(e.recovery, 'source-file');
    assert.strictEqual(e.recoveryPath, 'C:\\repo\\logs\\app.log');
  });

  test('grep-collapse — omitted match lines, parked where the view says they are', () => {
    const lines = [];
    for (const f of ['src/a.js', 'src/b.js']) {
      for (let i = 1; i <= 40; i++) lines.push(`${f}:${i}: const value_${i} = ${'x'.repeat(60)};`);
    }
    const content = lines.join('\n');
    const { calls } = fire({
      tool_name: 'Grep', session_id: 'rec-grep', tool_input: { pattern: 'value_', path: 'src' },
      tool_response: { mode: 'content', content, numLines: lines.length },
    });
    const e = only(calls, 'rec-grep');
    assert.strictEqual(e.action, 'grep-collapse');
    assert.strictEqual(e.omitted, 74, 'both files keep 3 of 40 matches');
    assert.strictEqual(e.recovery, 'sidecar');
    assert.strictEqual(e.retention, 'session');
    assert.strictEqual(e.recoveryPath, calls.parked[0].path);
    assert.strictEqual(calls.parked[0].content, content, 'the complete match list went to scratch');
  });

  test('grep-collapse — with nowhere to park the matches, the record falls back to the re-run', () => {
    const lines = [];
    for (const f of ['src/a.js', 'src/b.js']) {
      for (let i = 1; i <= 40; i++) lines.push(`${f}:${i}: const value_${i} = ${'x'.repeat(60)};`);
    }
    const { calls } = fire({
      tool_name: 'Grep', session_id: 'rec-grep-norun', tool_input: { pattern: 'value_', path: 'src' },
      tool_response: { mode: 'content', content: lines.join('\n'), numLines: lines.length },
    }, { HUSH_SIDECAR: 'off' });
    const e = only(calls, 'rec-grep-norun');
    assert.strictEqual(e.action, 'grep-collapse');
    assert.strictEqual(e.recovery, 'rerun-command');
    assert.strictEqual(e.recoveryPath, 'src');
    assert.strictEqual(e.retention, 'none');
    assert.deepStrictEqual(calls.parked, []);
  });

  // `sidecarPath` answers one question `recovery` cannot: did hush put bytes on
  // disk for this call? A park rate counted off the recovery kind is wrong in
  // both directions — it misses parks whose advised route is something else,
  // and it counts recoveryPaths naming files hush never wrote.
  test('a parked shell output names the file hush wrote, beside its recovery route', () => {
    const body = uniqueLines(500);
    const { calls } = fire({ tool_name: 'Bash', session_id: 'rec-side-path', tool_response: body });
    const e = only(calls, 'rec-side-path');
    assert.ok(e.sidecarPath, 'the record names the parked file');
    assert.strictEqual(e.sidecarPath, calls.parked[0].path, 'and that file is the one scratch parked');
    assert.strictEqual(calls.parked[0].content, body, 'holding the whole input');
  });

  test('a capped view parks nothing, so it names no sidecar', () => {
    const { calls } = fire({ tool_name: 'Bash', session_id: 'rec-side-none', tool_response: uniqueLines(200) }, { HUSH_TEMPLATE: 'off' });
    const e = only(calls, 'rec-side-none');
    assert.strictEqual(e.recovery, 'rerun-command');
    assert.strictEqual(e.sidecarPath, null);
    assert.deepStrictEqual(calls.parked, []);
  });

  // The field that proves the two are not the same thing: a Grep with the
  // sidecar off recovers by re-running, and its recoveryPath is the search
  // path — a directory hush never wrote a byte into.
  test('a recoveryPath hush did not write is not reported as a sidecar', () => {
    const lines = Array.from({ length: 400 }, (_, i) => `src/f${i % 20}.js:${i}:  value_${i}`);
    const { calls } = fire({
      tool_name: 'Grep', session_id: 'rec-side-alias', tool_input: { pattern: 'value_', path: 'src' },
      tool_response: { mode: 'content', content: lines.join('\n'), numLines: lines.length },
    }, { HUSH_SIDECAR: 'off' });
    const e = only(calls, 'rec-side-alias');
    assert.strictEqual(e.recoveryPath, 'src', 'the recovery route names where to search again');
    assert.strictEqual(e.sidecarPath, null, 'and nothing was parked');
    assert.deepStrictEqual(calls.parked, []);
  });

  test('a Grep that did park names both, and they agree', () => {
    const lines = Array.from({ length: 400 }, (_, i) => `src/f${i % 20}.js:${i}:  value_${i}`);
    const { calls } = fire({
      tool_name: 'Grep', session_id: 'rec-side-grep', tool_input: { pattern: 'value_', path: 'src' },
      tool_response: { mode: 'content', content: lines.join('\n'), numLines: lines.length },
    });
    const e = only(calls, 'rec-side-grep');
    assert.strictEqual(e.recovery, 'sidecar');
    assert.strictEqual(e.sidecarPath, e.recoveryPath);
    assert.strictEqual(e.sidecarPath, calls.parked[0].path);
  });
});

describe('transform manifest: the recovery boundary', () => {
  test('a lossy transform that omitted lines without a recovery location is a gap', () => {
    const gap = recoveryGap(buildRecord({ tool: 'Bash', action: 'cap', linesIn: 100, omitted: 40 }));
    assert.match(gap, /cap omitted 40 lines with no recovery location/);
  });

  test('naming a file-backed recovery without the path is a gap too', () => {
    assert.match(
      recoveryGap(buildRecord({ action: 'sidecar', linesIn: 100, omitted: 90, recovery: 'sidecar' })),
      /no path/
    );
    assert.match(
      recoveryGap(buildRecord({ action: 'cap', linesIn: 100, omitted: 90, recovery: 'source-file' })),
      /no path/
    );
  });

  test('no gap when the record backs the view', () => {
    assert.strictEqual(recoveryGap(buildRecord({ action: 'cap', linesIn: 100, omitted: 40, recovery: 'rerun-command' })), null);
    assert.strictEqual(recoveryGap(buildRecord({ action: 'sidecar', linesIn: 100, omitted: 90, recovery: 'sidecar', recoveryPath: '/tmp/x.txt' })), null);
  });

  test('a lossy transform that happened to omit nothing has nothing to recover', () => {
    assert.strictEqual(recoveryGap(buildRecord({ action: 'cap', linesIn: 100, omitted: 0 })), null);
  });

  test('a dedupe-only view is lossy too — a line stated as a count is not in the view', () => {
    assert.match(recoveryGap(buildRecord({ action: 'scrub-only', linesIn: 100, omitted: 3 })), /no recovery location/);
    assert.match(recoveryGap(buildRecord({ action: 'enumerate-passthrough', linesIn: 100, omitted: 3 })), /no recovery location/);
  });

  test('the action that keeps every input line never needs recovery metadata', () => {
    assert.strictEqual(recoveryGap(buildRecord({ action: 'passthrough', linesIn: 100, omitted: 5 })), null);
  });

  // deliver() straight, with a hand-built decision: the boundary, and the
  // record scratch receives for a dropped view.
  const payload = { tool_name: 'Bash', session_id: 'boundary' };
  const unbacked = { action: 'cap', bytesIn: 400, bytesOut: 90, linesIn: 100, omitted: 40 };

  test('deliver drops the view when the record cannot back it', () => {
    const deps = memoryDeps();
    const result = withDebug('1', () => deliver(unbacked, 'a view with detail removed', payload, deps));
    assert.strictEqual(result.updated, undefined, 'deliver dropped the view — the original stands');
    assert.strictEqual(result.record.action, 'rejected-no-recovery');
    const e = received(deps.scratch.calls);
    assert.strictEqual(e.action, 'rejected-no-recovery');
    assert.match(e.fallback, /no recovery location/);
    assert.strictEqual(e.bytesOut, e.bytesIn, 'nothing was delivered, so nothing was saved');
  });

  test('deliver returns the same view once the record names where the detail went', () => {
    const deps = memoryDeps();
    const result = withDebug('1', () => deliver({ ...unbacked, recovery: 'rerun-command' }, 'a view with detail removed', payload, deps));
    assert.strictEqual(result.updated, 'a view with detail removed');
    assert.strictEqual(received(deps.scratch.calls).action, 'cap');
  });

  test('records are built and checked with the debug gate off — only the hand-over is gated', () => {
    const deps = memoryDeps();
    const result = withDebug(undefined, () => deliver(unbacked, 'a view with detail removed', payload, deps));
    assert.strictEqual(result.updated, undefined, 'the boundary still holds without HUSH_DEBUG');
    assert.strictEqual(result.record.action, 'rejected-no-recovery');
    assert.deepStrictEqual(deps.scratch.calls.manifest, [], 'and scratch received nothing');
  });
});

// The adapter on the wire: what a spawned hook emits for output it leaves
// alone, whatever the transform would have said.
describe('passthrough invariant (byte-identical, end to end)', () => {
  test('short clean Bash output: hook stays silent, nothing enters the tool result', () => {
    const r = runHook('compress-tool-output.js', { tool_name: 'Bash', tool_response: 'all good\n3 tests passed' });
    assert.strictEqual(hookOutput(r), null);
  });

  test('a Read of an ordinary (non-log, non-generated) file: content is the exact same object shape, byte-identical text', () => {
    const content = 'export function add(a, b) {\n  return a + b;\n}\n';
    const r = runHook('compress-tool-output.js', {
      tool_name: 'Read',
      tool_input: { file_path: 'C:\\repo\\src\\math.js' },
      tool_response: { type: 'text', file: { filePath: 'C:\\repo\\src\\math.js', content, numLines: 3, startLine: 1, totalLines: 3 } },
    });
    assert.strictEqual(hookOutput(r), null, 'no rewrite at all — untouched shape, untouched bytes');
  });

  test('a non-watched tool never gets touched, regardless of size', () => {
    const big = 'z'.repeat(50000);
    const r = runHook('compress-tool-output.js', { tool_name: 'TodoWrite', tool_response: big });
    assert.strictEqual(hookOutput(r), null);
  });

  test('an MCP tool response passes through untouched, whatever its size', () => {
    const big = JSON.stringify({ results: Array.from({ length: 50 }, (_, i) => ({ a: i, b: `x${i}` })) });
    const r = runHook('compress-tool-output.js', { tool_name: 'mcp__idea__read_file', tool_response: big });
    assert.strictEqual(hookOutput(r), null);
  });
});
