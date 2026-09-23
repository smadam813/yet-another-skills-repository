'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { mapStore, preToolUse, dispatch } = require('./helpers');
const { parseInstallCommand, parseInstallCommands, check, packageName, pyprojectDepNames, ADD_SUBCOMMANDS, MANAGER_ECO } = require('../hooks/dep-guard');

// A chained command used to be checkpointed for its first install alone, and
// the retry that cleared that one carried the rest in unexamined.
describe('unit: every install on the line', () => {
  const CHAINED = 'npm install axios && npm install lodash';

  test('parseInstallCommands returns each install, in order', () => {
    const hits = parseInstallCommands(CHAINED);
    assert.deepStrictEqual(hits.map((h) => h.packages), [['axios'], ['lodash']]);
  });

  test('parseInstallCommand still answers with the first one', () => {
    assert.deepStrictEqual(parseInstallCommand(CHAINED).packages, ['axios']);
  });

  test('each package is checkpointed once, then the command passes', () => {
    const state = {};
    const data = { tool_name: 'Bash', cwd: os.tmpdir(), tool_input: { command: CHAINED } };
    assert.match(check(data, state, { env: {} }), /axios/);
    assert.match(check(data, state, { env: {} }), /lodash/);
    assert.strictEqual(check(data, state, { env: {} }), null);
  });
});

// The ledger files each record under an ecosystem and a name, so every
// manager needs an ecosystem.
describe('unit: one ledger record for every manager', () => {
  const run = (command, state) => check({ tool_name: 'Bash', cwd: os.tmpdir(), tool_input: { command } }, state, { env: {} });
  const ONE_PER_MANAGER = [
    ...Object.keys(ADD_SUBCOMMANDS).map((m) => `${m} ${ADD_SUBCOMMANDS[m][0]} a`),
    'dotnet add package a',
  ];

  test('every manager the dep guard recognizes maps to an ecosystem', () => {
    for (const command of ONE_PER_MANAGER) {
      const { manager } = parseInstallCommand(command);
      assert.ok(MANAGER_ECO[manager], `${manager} has no ecosystem`);
    }
  });

  test('cargo add a b, then cargo add a, gives one nudge', () => {
    const state = {};
    assert.match(run('cargo add a b', state), /razor:/);
    assert.strictEqual(run('cargo add a', state), null);
  });

  test('session state holds one ledger record for each ecosystem', () => {
    const state = {};
    for (const command of ONE_PER_MANAGER) run(command, state);
    assert.deepStrictEqual(Object.keys(state), ['reconsidered']);
    assert.deepStrictEqual(
      Object.keys(state.reconsidered).sort(),
      [...new Set(Object.values(MANAGER_ECO))].sort()
    );
  });
});

describe('unit: parseInstallCommand', () => {
  const adds = [
    ['npm install lodash', 'npm', ['lodash']],
    ['npm i lodash', 'npm', ['lodash']],
    ['npm install --save-dev jest', 'npm', ['jest']],
    ['pnpm add -D typescript', 'pnpm', ['typescript']],
    ['yarn add axios', 'yarn', ['axios']],
    ['yarn global add serve', 'yarn', ['serve']],
    ['bun add zod', 'bun', ['zod']],
    ['pip install requests', 'pip', ['requests']],
    ['pip3 install requests flask', 'pip3', ['requests', 'flask']],
    ['python -m pip install numpy', 'pip', ['numpy']],
    ['uv pip install httpx', 'pip', ['httpx']],
    ['uv add httpx', 'uv', ['httpx']],
    ['poetry add pydantic', 'poetry', ['pydantic']],
    ['pipenv install django', 'pipenv', ['django']],
    ['cargo add serde', 'cargo', ['serde']],
    ['go get github.com/gorilla/mux', 'go', ['github.com/gorilla/mux']],
    ['composer require monolog/monolog', 'composer', ['monolog/monolog']],
    ['gem install rails', 'gem', ['rails']],
    ['dotnet add package Newtonsoft.Json', 'dotnet', ['Newtonsoft.Json']],
    ['dotnet add MyProj.csproj package Serilog', 'dotnet', ['Serilog']],
    ['sudo npm install -g http-server', 'npm', ['http-server']],
    ['env PIP_NO_CACHE_DIR=1 pip install requests', 'pip', ['requests']],
    ['command pip install requests', 'pip', ['requests']],
    ['cd api && npm i express', 'npm', ['express']],
    ['git pull; pip install requests', 'pip', ['requests']],
    // shell redirects are not package names
    ['cargo add serde 2>&1', 'cargo', ['serde']],
    ['npm install lodash > install.log 2>&1', 'npm', ['lodash']],
    ['pip install requests 2>$null', 'pip', ['requests']],
    ['npm i axios >> build.log', 'npm', ['axios']],
  ];
  for (const [cmd, manager, packages] of adds) {
    test(`add: ${cmd}`, () => {
      assert.deepStrictEqual(parseInstallCommand(cmd), { manager, packages });
    });
  }

  const passes = [
    'npm install', // lockfile restore
    'npm ci',
    'pnpm install',
    'yarn install',
    'bun install',
    'pip install -r requirements.txt',
    'pip install -e .',
    'pip install .',
    'poetry install',
    'pipenv install',
    'dotnet restore',
    'dotnet add reference ../Other.csproj',
    'git status',
    'npm run build',
    'npm test',
    'apt install jq', // system managers out of scope
    'brew install ripgrep',
    'winget install nodejs',
    'echo "npm is great"',
    'npm install > build.log', // bare restore, redirect target is not a package
    'npm install 2>&1',
  ];
  for (const cmd of passes) {
    test(`pass: ${cmd}`, () => {
      assert.strictEqual(parseInstallCommand(cmd), null);
    });
  }

  test('packageName strips version specs and extras, keeps npm scopes', () => {
    assert.strictEqual(packageName('axios@^1.8'), 'axios');
    assert.strictEqual(packageName('@scope/pkg@2.0.0'), '@scope/pkg');
    assert.strictEqual(packageName('@scope/pkg'), '@scope/pkg');
    assert.strictEqual(packageName('flask==2.0'), 'flask');
    assert.strictEqual(packageName('requests[socks]>=2.28'), 'requests');
    assert.strictEqual(packageName('github.com/gorilla/mux@v1.8.0'), 'github.com/gorilla/mux');
    assert.strictEqual(packageName('serde'), 'serde');
  });

  test('shell quotes come off the token', () => {
    assert.deepStrictEqual(parseInstallCommand("pip install 'flask>=2.1'").packages, ['flask>=2.1']);
    assert.deepStrictEqual(parseInstallCommand('npm install "axios@^1.9"').packages, ['axios@^1.9']);
  });
});

describe('integration: soft gate', () => {
  const input = (command) => preToolUse('Bash', { command });

  test('first install denied with reason, identical retry passes', () => {
    const store = mapStore();
    const first = dispatch(input('npm install lodash'), {}, store);
    assert.match(first, /razor:/);
    assert.match(first, /lodash/);
    assert.strictEqual(dispatch(input('npm install lodash'), {}, store), null);
  });

  test('reworded retry with same packages passes too', () => {
    const store = mapStore();
    dispatch(input('npm i lodash'), {}, store);
    assert.strictEqual(dispatch(input('npm install --save lodash'), {}, store), null);
  });

  test('a different package is a fresh gate', () => {
    const store = mapStore();
    dispatch(input('npm i lodash'), {}, store);
    assert.match(dispatch(input('npm i axios'), {}, store), /axios/);
  });

  test('non-install commands stay silent', () => {
    assert.strictEqual(dispatch(input('git status'), {}), null);
  });

  test('installing an already-declared dependency never checkpoints', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'razor-dg-'));
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ dependencies: { lodash: '^4' } }));
    assert.strictEqual(dispatch({ ...input('npm install lodash'), cwd: dir }, {}), null);

    const py = fs.mkdtempSync(path.join(os.tmpdir(), 'razor-dg-'));
    fs.writeFileSync(path.join(py, 'requirements.txt'), 'python-dotenv==1.0\nflask>=2.0\n');
    assert.strictEqual(dispatch({ ...input('pip install python_dotenv'), cwd: py }, {}), null);
    // the realistic shell spelling of a spec'd reinstall: quoted
    assert.strictEqual(dispatch({ ...input("pip install 'flask>=2.1'"), cwd: py }, {}), null);
  });

  // A nested manifest that fails to parse declares nothing. The manifest walk
  // stops there, so the root's dependencies are not a restore for it.
  test('a nested manifest that fails to parse stops the manifest walk', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'razor-dg-'));
    fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ dependencies: { lodash: '^4' } }));
    fs.writeFileSync(path.join(root, 'composer.json'), JSON.stringify({ require: { 'monolog/monolog': '^3' } }));
    const app = path.join(root, 'packages', 'app');
    fs.mkdirSync(app, { recursive: true });
    fs.writeFileSync(path.join(app, 'package.json'), '{ not json');
    fs.writeFileSync(path.join(app, 'composer.json'), '{ not json');

    const npm = dispatch({ ...input('npm install lodash'), cwd: app }, {});
    assert.match(npm, /lodash/);
    assert.doesNotMatch(npm, /Already declared/);
    const composer = dispatch({ ...input('composer require monolog/monolog'), cwd: app }, {});
    assert.match(composer, /monolog\/monolog/);
    assert.doesNotMatch(composer, /Already declared/);
  });

  test('the hyphen and underscore spellings of a pip package share one nudge', () => {
    const store = mapStore();
    assert.match(dispatch(input('pip install python_dotenv'), {}, store), /razor:/);
    assert.strictEqual(dispatch(input('pip install python-dotenv'), {}, store), null);
  });

  test('a versioned install denied once passes on the bare-name retry', () => {
    const store = mapStore();
    assert.match(dispatch(input('npm i axios@^1.8'), {}, store), /razor:/);
    assert.strictEqual(dispatch(input('npm install axios'), {}, store), null);
  });

  test('RAZOR_DEP_GUARD=off disables the gate', () => {
    assert.strictEqual(dispatch(input('npm i lodash'), { RAZOR_DEP_GUARD: 'off' }), null);
  });

  test('RAZOR_DISABLE=1 disables the gate', () => {
    assert.strictEqual(dispatch(input('npm i lodash'), { RAZOR_DISABLE: '1' }), null);
  });
});

describe('locations, flag values, and self-upgrades are not dependencies', () => {
  const cases = [
    ['npm install ./local-lib', 'a relative path'],
    ['npm install ../sibling', 'a parent-relative path'],
    ['pip install ..', 'the bare parent directory'],
    ['npm install .', 'the bare current directory'],
    ['npm install file:../lib', 'a file: spec'],
    ['npm install https://example.com/pkg.tgz', 'a URL archive'],
    ['go get ./...', "go's own package wildcard"],
    ['pip install --upgrade pip', 'pip upgrading itself'],
    ['npm install --prefix /tmp/app', 'a flag value that is a path'],
  ];
  for (const [command, why] of cases) {
    test(`no install parsed from ${why}: ${command}`, () => {
      assert.strictEqual(parseInstallCommand(command), null);
    });
  }

  test('a flag value is never reported as the package', () => {
    const hit = parseInstallCommand('npm install --tag next axios');
    assert.deepStrictEqual(hit && hit.packages, ['axios']);
  });

  test('a real package alongside a path is still caught', () => {
    const hit = parseInstallCommand('pip install -t ./vendor requests');
    assert.deepStrictEqual(hit && hit.packages, ['requests']);
  });

  // -p names the workspace member being edited, not something being added.
  test('a workspace selector is never reported as the package', () => {
    assert.deepStrictEqual(parseInstallCommand('cargo add -p mycrate serde').packages, ['serde']);
    assert.deepStrictEqual(parseInstallCommand('cargo add --package mycrate serde').packages, ['serde']);
  });
});

describe('PowerShell is gated exactly like Bash', () => {
  test('an install issued through PowerShell is denied once, and the retry passes', () => {
    const store = mapStore();
    const call = preToolUse('PowerShell', { command: 'npm install axios' });
    assert.match(dispatch(call, {}, store), /axios/);
    assert.strictEqual(dispatch(call, {}, store), null);
  });

  test('an ordinary PowerShell command is never gated', () => {
    assert.strictEqual(dispatch(preToolUse('PowerShell', { command: 'Get-ChildItem -Recurse' }), {}), null);
  });
});

describe('unit: pyproject comments', () => {
  test('a quoted word inside a trailing comment is not a declared dependency', () => {
    const toml = [
      '[project]',
      'dependencies = [',
      '  "flask>=2.0",  # replaces "django" from the old app',
      '  "requests", # see "urllib3" notes',
      ']',
    ].join('\n');
    assert.deepStrictEqual([...pyprojectDepNames(toml)].sort(), ['flask', 'requests']);
  });

  test('a # inside a quoted spec is not a comment', () => {
    const toml = '[project]\ndependencies = ["pkg @ git+https://x/y.git#egg=pkg"]\n';
    assert.deepStrictEqual([...pyprojectDepNames(toml)], ['pkg']);
  });
});
