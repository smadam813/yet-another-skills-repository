'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { runHook, freshSession, mapStore, preToolUse, dispatch, startSession, subagent, prompt } = require('./helpers');
const { shouldInject } = require('../hooks/subagent-start');
const { run: modeToggle, parseToggle } = require('../hooks/mode-toggle');
const { RULESET, DRIFT_NOTE, fileStore } = require('../hooks/razor-lib');

describe('unit: shouldInject', () => {
  test('default skip list covers read-only built-ins', () => {
    for (const t of ['Explore', 'Plan', 'claude-code-guide', 'statusline-setup']) {
      assert.strictEqual(shouldInject(t, {}), false, t);
    }
  });

  test('a built-in skip matches scoped or bare', () => {
    for (const t of ['explore', 'Explore', 'some-plugin:explore', 'SOME-PLUGIN:Explore']) {
      assert.strictEqual(shouldInject(t, {}), false, t);
    }
  });

  test('unknown and code-writing agents get the ruleset', () => {
    for (const t of [
      'general-purpose',
      'claude',
      'some-plugin:implementer',
      'some-plugin:reviser',
      'my-custom-agent',
    ]) {
      assert.strictEqual(shouldInject(t, {}), true, t);
    }
  });

  test('RAZOR_AGENT_SKIP extends the default list, bare or plugin-scoped', () => {
    const env = { RAZOR_AGENT_SKIP: 'code-reviewer, doc-checker' };
    assert.strictEqual(shouldInject('some-plugin:code-reviewer', env), false);
    assert.strictEqual(shouldInject('doc-checker', env), false);
    assert.strictEqual(shouldInject('Explore', env), false); // defaults kept
    assert.strictEqual(shouldInject('general-purpose', env), true);
  });

  test('RAZOR_AGENT_INJECT overrides any skip', () => {
    assert.strictEqual(shouldInject('Explore', { RAZOR_AGENT_INJECT: 'explore' }), true);
  });
});

describe('unit: parseToggle', () => {
  test('recognized forms', () => {
    assert.strictEqual(parseToggle('/razor off'), 'off');
    assert.strictEqual(parseToggle('/razor on'), 'on');
    assert.strictEqual(parseToggle('/razor:razor off'), 'off');
    assert.strictEqual(parseToggle('razor off'), 'off');
    assert.strictEqual(parseToggle('stop razor'), 'off');
    assert.strictEqual(parseToggle('Stop Razor!'), 'off');
  });

  test('unrelated prompts are ignored', () => {
    assert.strictEqual(parseToggle('sharpen the razor logic in utils.js'), null);
    assert.strictEqual(parseToggle('fix the login bug'), null);
    assert.strictEqual(parseToggle(''), null);
  });
});

describe('integration: injection lifecycle', () => {
  test('session-start emits the ladder as raw stdout', () => {
    const r = runHook('session-start.js', { session_id: freshSession(), hook_event_name: 'SessionStart' });
    assert.match(r.stdout, /RAZOR ACTIVE/);
    assert.match(r.stdout, /first rung that holds/);
    // rung 5 covers dependency-by-import, not just install commands
    assert.match(r.stdout, /IS adding a dependency/);
  });

  test('session-start is silent under RAZOR_DISABLE', () => {
    assert.strictEqual(startSession({ session_id: 's1' }, { RAZOR_DISABLE: '1' }), '');
  });

  test('subagent-start returns the ladder for a code-writing agent', () => {
    assert.strictEqual(subagent('general-purpose'), RULESET);
  });

  test('subagent-start is silent for skipped agent types', () => {
    assert.strictEqual(subagent('Explore'), null);
  });

  test('subagent-start reads RAZOR_AGENT_SKIP and RAZOR_AGENT_INJECT from the injected env', () => {
    assert.strictEqual(subagent('code-reviewer', { RAZOR_AGENT_SKIP: 'code-reviewer' }), null);
    assert.strictEqual(subagent('Explore', { RAZOR_AGENT_INJECT: 'explore' }), RULESET);
  });

  test('subagent-start is silent under RAZOR_DISABLE', () => {
    assert.strictEqual(subagent('general-purpose', { RAZOR_DISABLE: '1' }), null);
  });

  test('"/razor off" parks every hook for the session; "/razor on" re-arms', () => {
    const store = mapStore();
    assert.match(prompt('/razor off', {}, store), /RAZOR OFF/);
    assert.strictEqual(subagent('general-purpose', {}, store), null);
    assert.strictEqual(dispatch(preToolUse('Bash', { command: 'npm i lodash' }), {}, store), null);

    assert.strictEqual(prompt('/razor on', {}, store), RULESET);
    assert.strictEqual(subagent('general-purpose', {}, store), RULESET);
    assert.match(dispatch(preToolUse('Bash', { command: 'npm i axios' }), {}, store), /adds a new npm dependency/);
  });

  test('session-start reads the off state that "/razor off" writes to the state files', () => {
    const session = freshSession();
    const data = { session_id: session, hook_event_name: 'UserPromptSubmit', prompt: '/razor off' };
    modeToggle(data, { env: process.env, store: fileStore(process.env) });

    const r = runHook('session-start.js', { session_id: session, hook_event_name: 'SessionStart' });
    assert.strictEqual(r.stdout.trim(), '');
  });

  test('state fails safe to on when the subagent session is unknown', () => {
    // No hook wrote state for this session, so isActive defaults to on.
    assert.strictEqual(subagent('general-purpose'), RULESET);
  });

  test('an off state written directly silences the subagent hook', () => {
    const store = mapStore();
    store.write('s1', { off: true });
    assert.strictEqual(subagent('general-purpose', {}, store), null);
  });
});

describe('integration: the session-start state sweep', () => {
  test('session-start sweeps razor state files older than a week, keeps fresh ones', () => {
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'razor-data-'));
    const stale = path.join(dataDir, 'razor-dead-session.json');
    const fresh = path.join(dataDir, 'razor-live-session.json');
    fs.writeFileSync(stale, '{}');
    fs.writeFileSync(fresh, '{}');
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
    fs.utimesSync(stale, eightDaysAgo, eightDaysAgo);

    runHook(
      'session-start.js',
      { session_id: freshSession(), hook_event_name: 'SessionStart' },
      { CLAUDE_PLUGIN_DATA: dataDir }
    );
    assert.strictEqual(fs.existsSync(stale), false);
    assert.strictEqual(fs.existsSync(fresh), true);
  });
});

describe('RAZOR_DISABLE silences every hook, not just the gates', () => {
  test('mode-toggle emits nothing for "/razor on" under the kill switch', () => {
    assert.strictEqual(prompt('/razor on', { RAZOR_DISABLE: '1' }), null);
  });

  test('mode-toggle still answers "/razor on" without the kill switch', () => {
    assert.strictEqual(prompt('/razor on', { RAZOR_DISABLE: '' }), RULESET);
  });

  test('mode-toggle writes no state under RAZOR_DISABLE', () => {
    const store = mapStore();
    prompt('/razor off', { RAZOR_DISABLE: '1' }, store);
    assert.deepStrictEqual(store.read('s1'), {});
  });
});

// The ladder is frozen by owner decision and the published benchmark numbers
// are tied to its exact text, but nothing detected a change to it: the only
// assertion compared the emitted string to the same constant it came from.
// These pin the content itself, with literals, so a drift fails here.
describe('the frozen ladder', () => {
  test('opens with the marker the harness matches on', () => {
    assert.ok(RULESET.startsWith('RAZOR ACTIVE\n'), RULESET.slice(0, 40));
  });

  test('carries exactly seven rungs, in order, each with its own first words', () => {
    const openings = [
      '1. Not genuinely needed?',
      '2. Already in this codebase?',
      '3. Stdlib does it?',
      '4. Native platform feature does it?',
      '5. An already-installed dependency does it?',
      '6. Fits in one line?',
      '7. Only then: the minimum code that works',
    ];
    let at = -1;
    for (const opening of openings) {
      const next = RULESET.indexOf(opening);
      assert.notStrictEqual(next, -1, `missing rung: ${opening}`);
      assert.ok(next > at, `out of order: ${opening}`);
      at = next;
    }
    assert.strictEqual(RULESET.match(/^\d\. /gm).length, 7);
  });

  test('keeps the three clauses the measured behaviour rests on', () => {
    assert.match(RULESET, /Never narrate or deliberate the rungs/);
    assert.match(RULESET, /One check is enough, anywhere in this task/);
    assert.match(RULESET, /Never cut: validation at trust boundaries/);
  });
});

describe('the ladder does not depend on git finishing', () => {
  test('session-start emits the ladder even where git cannot run', () => {
    // cwd points nowhere, so every git() call fails and no ledger is recorded.
    const out = startSession({ session_id: 's1', cwd: '/definitely/not/a/repo/anywhere' }, {});
    assert.match(out, /RAZOR ACTIVE/);
  });
});

describe('the drift note', () => {
  test('an ordinary prompt carries the note, and nothing else', () => {
    assert.strictEqual(prompt('fix the login bug'), DRIFT_NOTE);
  });

  test('the say-once sentence is present — without it the note repeats after a drift', () => {
    assert.match(DRIFT_NOTE, /Say it at most once in a session/);
  });

  test('it is a note, not a gate: it never asks and never refuses', () => {
    assert.match(DRIFT_NOTE, /do the work anyway/);
    assert.match(DRIFT_NOTE, /Never stop to ask, never refuse/);
    assert.match(DRIFT_NOTE, /never say it when the request is still the same job/);
  });

  test('a toggle prompt answers the toggle instead', () => {
    const off = prompt('/razor off');
    assert.match(off, /RAZOR OFF/);
    assert.doesNotMatch(off, /Stay on the task/);

    assert.strictEqual(prompt('/razor on'), RULESET);
  });

  test('"/razor off" silences it for the rest of the session', () => {
    const store = mapStore();
    store.write('s1', { off: true });
    assert.strictEqual(prompt('add a retry helper', {}, store), null);
  });

  test('the setting and the kill switch each silence it', () => {
    assert.strictEqual(prompt('add a retry helper', { RAZOR_DRIFT_NOTE: 'off' }), null);
    assert.strictEqual(prompt('add a retry helper', { CLAUDE_PLUGIN_OPTION_DRIFT_NOTE: 'false' }), null);
    assert.strictEqual(prompt('add a retry helper', { RAZOR_DISABLE: '1' }), null);
  });
});
