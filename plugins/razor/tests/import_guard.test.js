'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { mapStore, preToolUse, dispatch } = require('./helpers');
const {
  jsImportRoots, pyImportRoots, newImports, isTestFile, ecosystemOf, findManifest,
} = require('../hooks/import-guard');

describe('unit: jsImportRoots', () => {
  // `@/x` and `~/x` are the path-alias forms nearly every modern TS/JS setup
  // points at its own source. Read as packages they became `@/components` and
  // `~`, and razor denied ordinary internal imports as new dependencies.
  test('path aliases are local, never packages', () => {
    const src = [
      "import Button from '@/components/Button';",
      "import { db } from '~/server/db';",
      "const cfg = require('~');",
      "import z from '@scope/pkg';",
      "import lodash from 'lodash';",
    ].join('\n');
    assert.deepStrictEqual([...jsImportRoots(src)].sort(), ['@scope/pkg', 'lodash']);
  });

  test('finds require/import/export-from/dynamic-import roots', () => {
    const src = [
      "const axios = require('axios');",
      "import express from 'express';",
      "import { chunk } from 'lodash/fp';",
      "export { x } from '@scope/pkg/sub';",
      "const z = await import('zod');",
      "import 'polyfill-lib';",
    ].join('\n');
    assert.deepStrictEqual(
      [...jsImportRoots(src)].sort(),
      ['@scope/pkg', 'axios', 'express', 'lodash', 'polyfill-lib', 'zod'],
    );
  });

  test('builtins, node:/bun: prefixes, and local paths never count', () => {
    const src = [
      "const fs = require('fs');",
      "const fsp = require('node:fs/promises');",
      "import { db } from 'bun:sqlite';",
      "const local = require('./util');",
      "import x from '../lib/x';",
      "import y from '#internal/y';",
    ].join('\n');
    assert.strictEqual(jsImportRoots(src).size, 0);
  });

  test('type-only imports never ship, never count', () => {
    assert.strictEqual(jsImportRoots("import type { Foo } from 'some-types-pkg';").size, 0);
  });

  test('a semicolon-less type import never swallows the imports after it', () => {
    const src = "import type { A } from 'pkg-a'\nimport axios from 'axios'\nconst z = require('zod')";
    assert.deepStrictEqual([...jsImportRoots(src)].sort(), ['axios', 'zod']);
  });

  test('imports inside comments never count', () => {
    const src = [
      "// example: const axios = require('axios')",
      "/* import left from 'left-pad' */",
      '/**',
      " * import docs from 'doc-lib'",
      ' */',
      "const z = require('zod');",
    ].join('\n');
    assert.deepStrictEqual([...jsImportRoots(src)], ['zod']);
  });

  test('a `/*` inside a glob string never starts a comment strip', () => {
    const src = [
      'const src = "src/*.js";',
      'const axios = require("axios");',
      'const fixtures = "tests/*/fixtures";',
    ].join('\n');
    assert.deepStrictEqual([...jsImportRoots(src)], ['axios']);
  });

  test('a URL specifier survives the line-comment strip intact', () => {
    const src = "import x from 'https://esm.sh/react'\nconst a = 1\nconst b = 'hello'";
    assert.deepStrictEqual([...jsImportRoots(src)], ['https:']);
  });

  test('type-only re-exports never count either', () => {
    assert.strictEqual(jsImportRoots("export type { T } from 'undeclared-types'").size, 0);
  });
});

describe('unit: pyImportRoots', () => {
  test('finds import/from roots, first dotted segment', () => {
    const src = 'import requests\nimport numpy as np, pandas\nfrom flask import Flask\nfrom django.http import Http404';
    assert.deepStrictEqual([...pyImportRoots(src)].sort(), ['django', 'flask', 'numpy', 'pandas', 'requests']);
  });

  test('stdlib and relative imports never count', () => {
    const src = 'import os\nimport json, sys\nfrom pathlib import Path\nfrom . import sibling\nfrom __future__ import annotations';
    assert.strictEqual(pyImportRoots(src).size, 0);
  });

  // These ship with CPython and none of them is installable from PyPI, so a
  // nudge here can only ever be answered with a command that fails.
  test('the GUI, path and platform stdlib modules never count', () => {
    const src = 'import tkinter\nimport turtle\nfrom turtledemo import clock\nimport ntpath\nimport msvcrt\nimport idlelib\nimport ensurepip';
    assert.strictEqual(pyImportRoots(src).size, 0);
  });
});

describe('unit: classification helpers', () => {
  test('newImports counts only roots absent from both manifest and existing content', () => {
    const existing = "const axios = require('axios');";
    const incoming = "const axios = require('axios');\nconst dayjs = require('dayjs');\nconst _ = require('lodash');";
    assert.deepStrictEqual(newImports('node', incoming, existing, ['lodash']), ['dayjs']);
  });

  test('isTestFile and ecosystemOf', () => {
    assert.strictEqual(isTestFile('src/foo.test.js'), true);
    assert.strictEqual(isTestFile('tests/helper.py'), true);
    assert.strictEqual(isTestFile('src/foo.js'), false);
    assert.strictEqual(ecosystemOf('a/b.ts'), 'node');
    assert.strictEqual(ecosystemOf('a/b.py'), 'python');
    assert.strictEqual(ecosystemOf('a/b.rs'), null);
  });
});

// Seeded workspace: a manifest + a stub, mirroring the shape agents actually
// meet (an existing project with declared deps).
function makeWorkspace() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'razor-ig-'));
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({
    name: 'ws', version: '1.0.0', dependencies: { express: '^4.19.2', lodash: '^4.17.21' },
  }));
  fs.writeFileSync(path.join(dir, 'http_client.js'), 'async function fetchJson(url) {}\nmodule.exports = { fetchJson };\n');
  return dir;
}

describe('integration: import gate', () => {
  test('Write that imports an undeclared package: denied once with evidence, retry passes', () => {
    const ws = makeWorkspace();
    const store = mapStore();
    const write = preToolUse('Write', {
      file_path: path.join(ws, 'http_client.js'),
      content: "const axios = require('axios');\nasync function fetchJson(url) {}\nmodule.exports = { fetchJson };\n",
    });
    const first = dispatch(write, {}, store);
    assert.match(first, /adds a new node dependency/);
    assert.match(first, /`axios`/);
    assert.match(first, /express, lodash/);

    assert.strictEqual(dispatch(write, {}, store), null);
  });

  test('Edit whose new_string imports an undeclared package is gated the same way', () => {
    const ws = makeWorkspace();
    const store = mapStore();
    const edit = preToolUse('Edit', {
      file_path: path.join(ws, 'http_client.js'),
      old_string: 'async function fetchJson(url) {}',
      new_string: "const axios = require('axios');\nasync function fetchJson(url) {}",
    });
    assert.match(dispatch(edit, {}, store), /`axios`/);
    assert.strictEqual(dispatch(edit, {}, store), null);
  });

  test('declared deps, builtins, and local imports pass silently', () => {
    const ws = makeWorkspace();
    const write = preToolUse('Write', {
      file_path: path.join(ws, 'http_client.js'),
      content: "const _ = require('lodash');\nconst fs = require('node:fs');\nconst u = require('./util');\nmodule.exports = {};\n",
    });
    assert.strictEqual(dispatch(write, {}), null);
  });

  test('an import the file already has on disk is grandfathered', () => {
    const ws = makeWorkspace();
    fs.writeFileSync(path.join(ws, 'http_client.js'), "const axios = require('axios');\nmodule.exports = {};\n");
    const write = preToolUse('Write', {
      file_path: path.join(ws, 'http_client.js'),
      content: "const axios = require('axios');\nasync function fetchJson(url) { return (await axios.get(url)).data; }\nmodule.exports = { fetchJson };\n",
    });
    assert.strictEqual(dispatch(write, {}), null);
  });

  test('test files are exempt', () => {
    const ws = makeWorkspace();
    const write = preToolUse('Write', {
      file_path: path.join(ws, 'http_client.test.js'),
      content: "const request = require('supertest');\n",
    });
    assert.strictEqual(dispatch(write, {}), null);
  });

  test('python: vibe-named dep denied, dotenv suppressed when python-dotenv is declared', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'razor-igpy-'));
    fs.writeFileSync(path.join(dir, 'requirements.txt'), 'python-dotenv==1.0.0\n');
    const store = mapStore();
    const declared = preToolUse('Write', { file_path: path.join(dir, 'env.py'), content: 'import dotenv\n' });
    assert.strictEqual(dispatch(declared, {}, store), null);

    const undeclared = preToolUse('Write', { file_path: path.join(dir, 'env.py'), content: 'import requests\n' });
    assert.match(dispatch(undeclared, {}, store), /adds a new python dependency/);
  });

  // Regression: a package declared only in optionalDependencies was denied as
  // a new dependency, and the deny's own evidence list left it out.
  test('an optional-only dependency imports freely and shows up as evidence', () => {
    const ws = fs.mkdtempSync(path.join(os.tmpdir(), 'razor-igopt-'));
    fs.writeFileSync(path.join(ws, 'package.json'), JSON.stringify({
      name: 'ws', version: '1.0.0',
      dependencies: { express: '^4.19.2' },
      optionalDependencies: { sharp: '^0.33.4' },
    }));
    const optional = preToolUse('Write', {
      file_path: path.join(ws, 'thumb.js'),
      content: "const sharp = require('sharp');\nmodule.exports = sharp;\n",
    });
    assert.strictEqual(dispatch(optional, {}), null);

    const undeclared = preToolUse('Write', {
      file_path: path.join(ws, 'thumb.js'),
      content: "const axios = require('axios');\nmodule.exports = axios;\n",
    });
    assert.match(dispatch(undeclared, {}), /Already declared \(2\): express, sharp/);
  });

  test("python: the project's own package is local, not a dependency", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'razor-igloc-'));
    fs.writeFileSync(path.join(dir, 'requirements.txt'), 'requests==2.31\n');
    fs.mkdirSync(path.join(dir, 'src', 'myapp'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'sibling.py'), 'X = 1\n');

    const store = mapStore();
    const localImports = preToolUse('Write', {
      file_path: path.join(dir, 'main.py'),
      content: 'from myapp.utils import helper\nimport sibling\n',
    });
    assert.strictEqual(dispatch(localImports, {}, store), null);

    const external = preToolUse('Write', { file_path: path.join(dir, 'main.py'), content: 'import numpy\n' });
    assert.match(dispatch(external, {}, store), /razor:/);
  });

  test('no manifest up-tree: greenfield stays ungated', (t) => {
    const deep = fs.mkdtempSync(path.join(os.tmpdir(), 'razor-igg-'));
    // Guard the assumption instead of trusting the machine: a stray
    // package.json above tmpdir would make this test lie.
    if (findManifest('node', deep)) return t.skip('a manifest exists above tmpdir on this machine');
    const write = preToolUse('Write', {
      file_path: path.join(deep, 'app.js'),
      content: "const axios = require('axios');\n",
    });
    assert.strictEqual(dispatch(write, {}), null);
  });

  test('RAZOR_IMPORT_GUARD=off disables the gate', () => {
    const ws = makeWorkspace();
    const write = preToolUse('Write', {
      file_path: path.join(ws, 'http_client.js'),
      content: "const axios = require('axios');\n",
    });
    assert.strictEqual(dispatch(write, { RAZOR_IMPORT_GUARD: 'off' }), null);
  });
});

describe('the test-file exemption covers the whole JS/TS family', () => {
  const exempt = [
    'src/Button.test.tsx', 'src/Button.spec.tsx', 'src/util.test.jsx',
    'src/util.test.mjs', 'src/util.spec.cjs', 'src/util_test.ts',
    'src/util.test.js', 'src/util.spec.ts', 'tests/anything.ts', 'test_thing.py',
    'src/thing_test.py',
  ];
  for (const p of exempt) {
    test(`exempt: ${p}`, () => assert.strictEqual(isTestFile(p), true, p));
  }

  const gated = ['src/latest.ts', 'src/protest.js', 'src/spectacle.tsx', 'src/index.ts'];
  for (const p of gated) {
    test(`still gated: ${p}`, () => assert.strictEqual(isTestFile(p), false, p));
  }
});

// A nested manifest that declares nothing is still the nearest manifest. The
// walk stops there, so the root's dependencies are neither declared for the
// nested package nor shown as evidence for it (#63).
describe('nested manifest: the nearest manifest decides', () => {
  function nestedWorkspace(rootFiles, nestedFiles) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'razor-ign-'));
    const app = path.join(root, 'packages', 'app');
    fs.mkdirSync(path.join(app, 'src'), { recursive: true });
    for (const [name, content] of Object.entries(rootFiles)) fs.writeFileSync(path.join(root, name), content);
    for (const [name, content] of Object.entries(nestedFiles)) fs.writeFileSync(path.join(app, name), content);
    return path.join(app, 'src');
  }

  const ROOT_PKG = JSON.stringify({ dependencies: { lodash: '^4' } });

  test('node: a root dependency the nested package does not declare is denied once', () => {
    const src = nestedWorkspace({ 'package.json': ROOT_PKG }, { 'package.json': JSON.stringify({ name: 'app' }) });
    const store = mapStore();
    const write = preToolUse('Write', { file_path: path.join(src, 'a.js'), content: "const _ = require('lodash');\n" });
    assert.match(dispatch(write, {}, store), /`lodash`/);
    assert.strictEqual(dispatch(write, {}, store), null);
  });

  test('node: the deny lists no root dependencies as evidence', () => {
    const src = nestedWorkspace({ 'package.json': ROOT_PKG }, { 'package.json': JSON.stringify({ name: 'app' }) });
    const write = preToolUse('Write', { file_path: path.join(src, 'a.js'), content: "const axios = require('axios');\n" });
    const reason = dispatch(write, {});
    assert.match(reason, /`axios`/);
    assert.doesNotMatch(reason, /Already declared/);
    assert.doesNotMatch(reason, /lodash/);
  });

  test("node: evidence is the nested manifest's names only", () => {
    const src = nestedWorkspace(
      { 'package.json': ROOT_PKG },
      { 'package.json': JSON.stringify({ dependencies: { zod: '^3' } }) }
    );
    const write = preToolUse('Write', { file_path: path.join(src, 'a.js'), content: "const axios = require('axios');\n" });
    const reason = dispatch(write, {});
    assert.match(reason, /Already declared \(1\): zod\./);
  });

  for (const nested of ['pyproject.toml', 'requirements.txt']) {
    test(`python: an empty nested ${nested} stops the walk`, () => {
      const empty = nested === 'pyproject.toml' ? '[project]\nname = "app"\n' : '';
      const src = nestedWorkspace({ 'requirements.txt': 'requests==2.31\n' }, { [nested]: empty });
      const store = mapStore();
      const write = preToolUse('Write', { file_path: path.join(src, 'a.py'), content: 'import requests\n' });
      const reason = dispatch(write, {}, store);
      assert.match(reason, /`requests`/);
      assert.doesNotMatch(reason, /Already declared/);
      assert.strictEqual(dispatch(write, {}, store), null);
    });
  }
});
