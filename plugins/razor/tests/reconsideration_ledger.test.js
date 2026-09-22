'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { runHook, hookOutput, freshSession } = require('./helpers');
const { claim, isDeclared } = require('../hooks/reconsideration-ledger');

describe('unit: claim', () => {
  test('returns the names that owe a nudge and marks them', () => {
    const state = {};
    assert.deepStrictEqual(claim(state, 'node', ['axios']), ['axios']);
    assert.deepStrictEqual(claim(state, 'node', ['axios']), []);
  });

  test('an empty result means the ledger holds every name', () => {
    const state = {};
    claim(state, 'python', ['flask', 'requests']);
    assert.deepStrictEqual(claim(state, 'python', ['requests', 'flask']), []);
    assert.deepStrictEqual(claim(state, 'python', ['flask', 'httpx']), ['httpx']);
  });

  test('case and separator spellings are one dependency', () => {
    const state = {};
    claim(state, 'python', ['python_dotenv']);
    assert.deepStrictEqual(claim(state, 'python', ['Python-Dotenv']), []);
  });

  test('an alias pair is one dependency, in both orders', () => {
    const a = {};
    claim(a, 'python', ['pyyaml']);
    assert.deepStrictEqual(claim(a, 'python', ['yaml']), []);

    const b = {};
    claim(b, 'python', ['PIL']);
    assert.deepStrictEqual(claim(b, 'python', ['pillow']), []);
  });

  test('ecosystems keep separate records', () => {
    const state = {};
    claim(state, 'node', ['yaml']);
    assert.deepStrictEqual(claim(state, 'python', ['yaml']), ['yaml']);
  });

  test('two spellings of one dependency in one call owe one nudge', () => {
    assert.deepStrictEqual(claim({}, 'python', ['pyyaml', 'yaml']), ['pyyaml']);
  });
});

describe('unit: isDeclared', () => {
  test('normalizes name/import mismatches in the suppressing direction', () => {
    assert.strictEqual(isDeclared('dotenv', ['python-dotenv']), true);
    assert.strictEqual(isDeclared('yaml', ['pyyaml']), true);
    assert.strictEqual(isDeclared('PIL', ['pillow']), true);
    assert.strictEqual(isDeclared('bs4', ['beautifulsoup4']), true);
    assert.strictEqual(isDeclared('cv2', ['opencv-python']), true);
    assert.strictEqual(isDeclared('sklearn', ['scikit-learn']), true);
    assert.strictEqual(isDeclared('fitz', ['pymupdf']), true);
    assert.strictEqual(isDeclared('grpc', ['grpcio']), true);
    assert.strictEqual(isDeclared('google', ['protobuf']), true);
    assert.strictEqual(isDeclared('dns', ['dnspython']), true);
    assert.strictEqual(isDeclared('attr', ['attrs']), true);
    assert.strictEqual(isDeclared('axios', ['express', 'lodash']), false);
    assert.strictEqual(isDeclared('lodash', ['express', 'lodash']), true);
  });

  test('sees through a -binary wheel flavour', () => {
    assert.strictEqual(isDeclared('psycopg2', ['psycopg2-binary']), true);
  });
});

describe('integration: one nudge per dependency across gates, through an alias', () => {
  const input = (sessionId, toolName, toolInput) => ({
    session_id: sessionId,
    hook_event_name: 'PreToolUse',
    tool_name: toolName,
    tool_input: toolInput,
  });

  function pyWorkspace(files) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'razor-rl-'));
    for (const [name, content] of Object.entries(files)) fs.writeFileSync(path.join(dir, name), content);
    return dir;
  }

  const denied = (r) => hookOutput(r).hookSpecificOutput.permissionDecision === 'deny';

  test('pip install pyyaml, then import yaml: one nudge', () => {
    const ws = pyWorkspace({ 'requirements.txt': 'flask>=2.0\n' });
    const session = freshSession();
    assert.ok(denied(runHook('pre-tool-use.js', input(session, 'Bash', { command: 'pip install pyyaml' }))));
    const code = input(session, 'Write', { file_path: path.join(ws, 'app.py'), content: 'import yaml\n' });
    assert.strictEqual(hookOutput(runHook('pre-tool-use.js', code)), null);
  });

  test('import yaml, then pip install pyyaml: one nudge', () => {
    const ws = pyWorkspace({ 'requirements.txt': 'flask>=2.0\n' });
    const session = freshSession();
    const code = input(session, 'Write', { file_path: path.join(ws, 'app.py'), content: 'import yaml\n' });
    assert.ok(denied(runHook('pre-tool-use.js', code)));
    assert.strictEqual(
      hookOutput(runHook('pre-tool-use.js', input(session, 'Bash', { command: 'pip install pyyaml' }))),
      null
    );
  });

  test('a manifest edit that adds pillow, then import PIL: one nudge', () => {
    const ws = pyWorkspace({ 'requirements.txt': 'flask>=2.0\n' });
    const session = freshSession();
    const edit = input(session, 'Edit', {
      file_path: path.join(ws, 'requirements.txt'),
      old_string: 'flask>=2.0\n',
      new_string: 'flask>=2.0\npillow>=10\n',
    });
    assert.ok(denied(runHook('pre-tool-use.js', edit)));
    const code = input(session, 'Write', { file_path: path.join(ws, 'img.py'), content: 'from PIL import Image\n' });
    assert.strictEqual(hookOutput(runHook('pre-tool-use.js', code)), null);
  });

  test('the deny names only the packages that still owe a nudge', () => {
    const session = freshSession();
    runHook('pre-tool-use.js', input(session, 'Bash', { command: 'npm install axios' }));
    const reason = hookOutput(runHook('pre-tool-use.js', input(session, 'Bash', { command: 'npm install axios dayjs' })))
      .hookSpecificOutput.permissionDecisionReason;
    assert.match(reason, /'dayjs' adds/);
  });

  test('a cargo install nudges once per crate, not once per command line', () => {
    const session = freshSession();
    assert.ok(denied(runHook('pre-tool-use.js', input(session, 'Bash', { command: 'cargo add serde tokio' }))));
    assert.strictEqual(
      hookOutput(runHook('pre-tool-use.js', input(session, 'Bash', { command: 'cargo add serde' }))),
      null
    );
  });
});
