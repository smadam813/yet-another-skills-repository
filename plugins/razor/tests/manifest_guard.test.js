'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { mapStore, preToolUse, dispatch } = require('./helpers');
const { jsonDepNames, reqDepNames, simulate } = require('../hooks/manifest-guard');

const PKG = JSON.stringify(
  { name: 'ws', version: '1.0.0', dependencies: { express: '^4.19.2', lodash: '^4.17.21' } },
  null,
  2
);

function workspace(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'razor-mg-'));
  for (const [name, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(dir, name), content);
  }
  return dir;
}

describe('unit: dependency-name extraction', () => {
  test('package.json: dependencies + devDependencies, lowercased', () => {
    const names = jsonDepNames(JSON.stringify({
      dependencies: { Express: '^4' }, devDependencies: { jest: '^29' }, scripts: { test: 'x' },
    }));
    assert.deepStrictEqual([...names].sort(), ['express', 'jest']);
  });

  test('package.json: optional and peer sections count, lowercased', () => {
    const names = jsonDepNames(JSON.stringify({
      dependencies: { express: '^4' },
      optionalDependencies: { Sharp: '^0.33' },
      peerDependencies: { react: '^18' },
    }));
    assert.deepStrictEqual([...names].sort(), ['express', 'react', 'sharp']);
  });

  test('unparseable JSON yields null, not an empty set', () => {
    assert.strictEqual(jsonDepNames('{ not json'), null);
  });

  test('requirements.txt: names without specifiers, comments and flags skipped', () => {
    const names = reqDepNames('# deps\nrequests==2.31\nFlask[async]>=2\n-r other.txt\n\n');
    assert.deepStrictEqual([...names].sort(), ['flask', 'requests']);
  });

  test('simulate applies an Edit against on-disk content', () => {
    assert.strictEqual(simulate('Edit', { old_string: 'b', new_string: 'x' }, 'abc'), 'axc');
    assert.strictEqual(simulate('Edit', { old_string: 'zz', new_string: 'x' }, 'abc'), null);
    assert.strictEqual(simulate('Write', { content: 'new' }, 'abc'), 'new');
  });
});

describe('integration: manifest gate', () => {
  test('Write that adds a dependency to package.json: denied once with evidence, retry passes', () => {
    const ws = workspace({ 'package.json': PKG });
    const store = mapStore();
    const write = preToolUse('Write', {
      file_path: path.join(ws, 'package.json'),
      content: PKG.replace('"lodash": "^4.17.21"', '"lodash": "^4.17.21",\n    "pg": "^8.11.0"'),
    });
    const first = dispatch(write, {}, store);
    assert.match(first, /adds a new node dependency/);
    assert.match(first, /`pg`/);
    assert.match(first, /Already declared \(2\): express, lodash/);

    assert.strictEqual(dispatch(write, {}, store), null);
  });

  test('Edit fragment that adds a dependency is gated the same way', () => {
    const ws = workspace({ 'package.json': PKG });
    const store = mapStore();
    const edit = preToolUse('Edit', {
      file_path: path.join(ws, 'package.json'),
      old_string: '"lodash": "^4.17.21"',
      new_string: '"lodash": "^4.17.21",\n    "axios": "^1.7.0"',
    });
    assert.match(dispatch(edit, {}, store), /`axios`/);
    assert.strictEqual(dispatch(edit, {}, store), null);
  });

  test('version bumps of existing entries never fire', () => {
    const ws = workspace({ 'package.json': PKG });
    const edit = preToolUse('Edit', {
      file_path: path.join(ws, 'package.json'),
      old_string: '"express": "^4.19.2"',
      new_string: '"express": "^5.0.0"',
    });
    assert.strictEqual(dispatch(edit, {}), null);
  });

  test('creating a fresh manifest is scaffolding, not gated', () => {
    const ws = workspace({});
    const write = preToolUse('Write', {
      file_path: path.join(ws, 'package.json'),
      content: JSON.stringify({ name: 'new', dependencies: { pg: '^8' } }),
    });
    assert.strictEqual(dispatch(write, {}), null);
  });

  test('requirements.txt line adds are gated, python ecosystem named', () => {
    const ws = workspace({ 'requirements.txt': 'flask==3.0.3\nrequests==2.32.3\n' });
    const store = mapStore();
    const edit = preToolUse('Edit', {
      file_path: path.join(ws, 'requirements.txt'),
      old_string: 'requests==2.32.3\n',
      new_string: 'requests==2.32.3\ntenacity==8.3.0\n',
    });
    const first = dispatch(edit, {}, store);
    assert.match(first, /adds a new python dependency/);
    assert.match(first, /`tenacity`/);
    assert.strictEqual(dispatch(edit, {}, store), null);
  });

  test('RAZOR_MANIFEST_GUARD=off disables the gate', () => {
    const ws = workspace({ 'package.json': PKG });
    const write = preToolUse('Write', {
      file_path: path.join(ws, 'package.json'),
      content: PKG.replace('"lodash": "^4.17.21"', '"lodash": "^4.17.21",\n    "pg": "^8.11.0"'),
    });
    assert.strictEqual(dispatch(write, { RAZOR_MANIFEST_GUARD: 'off' }), null);
  });
});

describe('integration: one reconsideration per dependency, across gates', () => {
  test('an install deny covers the later manifest edit for the same package', () => {
    const ws = workspace({ 'package.json': PKG });
    const store = mapStore();
    assert.match(dispatch(preToolUse('Bash', { command: 'npm install pg' }), {}, store), /razor:/);

    const edit = preToolUse('Edit', {
      file_path: path.join(ws, 'package.json'),
      old_string: '"lodash": "^4.17.21"',
      new_string: '"lodash": "^4.17.21",\n    "pg": "^8.11.0"',
    });
    assert.strictEqual(dispatch(edit, {}, store), null);
  });

  test('a manifest deny covers the later install and import for the same package', () => {
    const ws = workspace({ 'package.json': PKG });
    const store = mapStore();
    const edit = preToolUse('Edit', {
      file_path: path.join(ws, 'package.json'),
      old_string: '"lodash": "^4.17.21"',
      new_string: '"lodash": "^4.17.21",\n    "pg": "^8.11.0"',
    });
    assert.match(dispatch(edit, {}, store), /razor:/);

    assert.strictEqual(dispatch(preToolUse('Bash', { command: 'npm install pg' }), {}, store), null);
    // package.json on disk still lacks pg (hooks never write), so the import
    // guard would fire — the shared ledger keeps it silent instead.
    const code = preToolUse('Write', {
      file_path: path.join(ws, 'db.js'),
      content: "const { Pool } = require('pg');\nmodule.exports = {};\n",
    });
    assert.strictEqual(dispatch(code, {}, store), null);
  });
});

describe('pyproject.toml is gated like the other manifests', () => {
  const seed = [
    '[project]',
    'name = "app"',
    'dependencies = [',
    '  "flask>=2.1",',
    ']',
    '',
    '[tool.poetry.dependencies]',
    'python = "^3.11"',
    'click = "^8.1"',
  ].join('\n') + '\n';

  function workspace() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'razor-pyproj-'));
    fs.writeFileSync(path.join(dir, 'pyproject.toml'), seed);
    return dir;
  }

  test('a new PEP 621 dependency is denied once, and the retry passes', () => {
    const dir = workspace();
    const store = mapStore();
    const call = preToolUse('Edit', {
      file_path: path.join(dir, 'pyproject.toml'),
      old_string: '  "flask>=2.1",',
      new_string: '  "flask>=2.1",\n  "requests",',
    });
    assert.match(dispatch(call, {}, store), /requests/);
    assert.strictEqual(dispatch(call, {}, store), null);
  });

  test('a new poetry dependency is denied', () => {
    const dir = workspace();
    const call = preToolUse('Edit', {
      file_path: path.join(dir, 'pyproject.toml'),
      old_string: 'click = "^8.1"',
      new_string: 'click = "^8.1"\nhttpx = "^0.27"',
    });
    assert.match(dispatch(call, {}), /httpx/);
  });

  test('a version bump of a declared dependency stays silent', () => {
    const dir = workspace();
    const call = preToolUse('Edit', {
      file_path: path.join(dir, 'pyproject.toml'),
      old_string: '  "flask>=2.1",',
      new_string: '  "flask>=3.0",',
    });
    assert.strictEqual(dispatch(call, {}), null);
  });

  test('the python version pin is never treated as a dependency', () => {
    const dir = workspace();
    const call = preToolUse('Edit', {
      file_path: path.join(dir, 'pyproject.toml'),
      old_string: 'python = "^3.11"',
      new_string: 'python = "^3.12"',
    });
    assert.strictEqual(dispatch(call, {}), null);
  });
});

// The manifest walk stops at the nearest manifest, even one that declares
// nothing, so the deny for a nested manifest never lists the root's dependencies.
describe('nested manifest: evidence comes from the edited manifest only', () => {
  test('an edit to an empty nested package.json lists no root dependencies', () => {
    const root = workspace({ 'package.json': PKG });
    const app = path.join(root, 'packages', 'app');
    fs.mkdirSync(app, { recursive: true });
    fs.writeFileSync(path.join(app, 'package.json'), JSON.stringify({ name: 'app' }));
    const write = preToolUse('Write', {
      file_path: path.join(app, 'package.json'),
      content: JSON.stringify({ name: 'app', dependencies: { axios: '^1' } }),
    });
    const reason = dispatch(write, {});
    assert.match(reason, /axios/);
    assert.doesNotMatch(reason, /Already declared/);
    assert.doesNotMatch(reason, /express|lodash/);
  });
});
