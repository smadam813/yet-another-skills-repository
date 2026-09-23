'use strict';

// The manifest: the file that declares a project's dependencies for one
// ecosystem. The dep, manifest, and import guards and the unused-deps audit
// all read manifests through this module, so they can never disagree about
// what a manifest is or what it declares.
//
// It owns the manifest names per ecosystem, one text parser per manifest
// kind, one reader per ecosystem, and the one walk up the tree. Whether a
// name matches a declared dependency is the reconsideration ledger's rule.
//
// Line-scan extraction for TOML/Gemfile/csproj on purpose — pulling in a
// parser to police dependency additions would be rung-5 irony.
// razor: naive section scanning, real parsers if extraction ever misleads.

const fs = require('fs');
const path = require('path');

// Manifest names per ecosystem, in the order a directory's manifest is named.
// dotnet has no fixed name, so a leading `*` matches by extension.
const MANIFESTS = {
  node: ['package.json'],
  python: ['pyproject.toml', 'requirements.txt'],
  rust: ['Cargo.toml'],
  go: ['go.mod'],
  php: ['composer.json'],
  ruby: ['Gemfile'],
  dotnet: ['*.csproj', '*.fsproj'],
};

function readText(file) {
  try {
    return fs.readFileSync(file, 'utf-8').replace(/^﻿/, '');
  } catch {
    return null;
  }
}

function specName(spec) {
  return spec.split(/[<>=!~;\[\s@(]/)[0].trim();
}

// ---- text parsers: manifest text in, declared names out ----

// Every section that names a package declares it. Optional and peer entries
// are in the manifest exactly as much as a plain dependency is, so leaving
// them out denied ordinary imports as new dependencies and printed an
// "Already declared" list that omitted the very package being imported.
// Null = unparseable.
function packageJsonDepNames(text) {
  try {
    const pkg = JSON.parse(text);
    return Object.keys({
      ...pkg.dependencies,
      ...pkg.devDependencies,
      ...pkg.optionalDependencies,
      ...pkg.peerDependencies,
    });
  } catch {
    return null;
  }
}

// TOML comments start at a # outside quotes. A quoted name inside the
// comment is not a declaration, and reading it as one silences the guard
// for a package nobody installed.
function stripTomlComment(line) {
  let quote = null;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quote) {
      if (c === quote) quote = null;
    } else if (c === '"' || c === "'") {
      quote = c;
    } else if (c === '#') {
      return line.slice(0, i);
    }
  }
  return line;
}

// Line-scan state machine: PEP 621 dependency arrays (which may span lines and
// contain "]" inside extras like flask[async]) plus poetry dependency tables.
// Bracket counting survives quoted extras because their brackets are balanced.
function pyprojectDepNames(text) {
  const names = new Set();
  let section = '';
  let arrayDepth = 0;
  for (const line of String(text || '').split(/\r?\n/)) {
    if (arrayDepth === 0) {
      const header = line.match(/^\s*\[(.+)\]\s*$/);
      if (header) {
        section = header[1];
        continue;
      }
    }
    if (/^tool\.poetry(\.group\.[^.\]]+)?\.(dev-)?dependencies$/.test(section)) {
      const kv = line.match(/^\s*([A-Za-z0-9_.-]+)\s*=/);
      if (kv && kv[1].toLowerCase() !== 'python') names.add(kv[1].toLowerCase());
      continue;
    }
    const startsArray =
      (section === 'project' && /^\s*dependencies\s*=\s*\[/.test(line)) ||
      ((section === 'project.optional-dependencies' || section === 'dependency-groups') &&
        /^\s*[A-Za-z0-9_.-]+\s*=\s*\[/.test(line));
    if (arrayDepth > 0 || startsArray) {
      // A PEP 735 group can pull in another group by name; that name is not
      // a package, so quoting it must not declare a phantom dependency.
      if (/include-group/.test(line)) {
        arrayDepth += (line.match(/\[/g) || []).length - (line.match(/\]/g) || []).length;
        if (arrayDepth < 0) arrayDepth = 0;
        continue;
      }
      for (const q of stripTomlComment(line).matchAll(/["']([^"']+)["']/g)) {
        const name = specName(q[1]);
        if (name) names.add(name.toLowerCase());
      }
      arrayDepth += (line.match(/\[/g) || []).length - (line.match(/\]/g) || []).length;
      if (arrayDepth < 0) arrayDepth = 0;
    }
  }
  return [...names];
}

// The names one requirements file writes inline. Options, includes among
// them, are skipped; the reader follows the includes.
function requirementsDepNames(text) {
  const names = new Set();
  for (const line of String(text || '').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#') || t.startsWith('-')) continue;
    const name = specName(t);
    if (name) names.add(name);
  }
  return [...names];
}

function cargoDepNames(text) {
  const names = new Set();
  let inDeps = false;
  for (const line of String(text || '').split(/\r?\n/)) {
    const header = line.match(/^\s*\[(.+)\]\s*$/);
    if (header) {
      const table = header[1].match(/^(?:workspace\.)?(?:dev-|build-)?dependencies(?:\.(.+))?$/);
      inDeps = Boolean(table && !table[1]);
      if (table && table[1]) names.add(table[1]); // [dependencies.foo] form
      continue;
    }
    if (!inDeps) continue;
    const kv = line.match(/^\s*([A-Za-z0-9_-]+)\s*=/);
    if (kv) names.add(kv[1]);
  }
  return [...names];
}

function goModDepNames(text) {
  const names = new Set();
  let inBlock = false;
  for (const line of String(text || '').split(/\r?\n/)) {
    const t = line.trim();
    if (t.startsWith('require (')) {
      inBlock = true;
      continue;
    }
    if (inBlock && t.startsWith(')')) {
      inBlock = false;
      continue;
    }
    const single = t.match(/^require\s+(\S+)\s+v/);
    if (single) names.add(single[1]);
    else if (inBlock) {
      const entry = t.match(/^(\S+)\s+v/);
      if (entry) names.add(entry[1]);
    }
  }
  return [...names];
}

// Null = unparseable.
function composerDepNames(text) {
  try {
    const j = JSON.parse(text);
    return Object.keys({ ...j.require, ...j['require-dev'] }).filter(
      (n) => n !== 'php' && !n.startsWith('ext-')
    );
  } catch {
    return null;
  }
}

function gemfileDepNames(text) {
  return [...String(text || '').matchAll(/^\s*gem\s+['"]([^'"]+)['"]/gm)].map((m) => m[1]);
}

function csprojDepNames(text) {
  return [...String(text || '').matchAll(/PackageReference\s+Include="([^"]+)"/g)].map((m) => m[1]);
}

const PARSERS = {
  'package.json': packageJsonDepNames,
  'pyproject.toml': pyprojectDepNames,
  'requirements.txt': requirementsDepNames,
  'Cargo.toml': cargoDepNames,
  'go.mod': goModDepNames,
  'composer.json': composerDepNames,
  Gemfile: gemfileDepNames,
  '*.csproj': csprojDepNames,
  '*.fsproj': csprojDepNames,
};

// The text parser for a manifest file name, or undefined when razor does not
// read that file.
function parserFor(fileName) {
  return PARSERS[fileName] || PARSERS[`*${path.extname(fileName)}`];
}

// ---- file readers: one per ecosystem ----
//
// A reader returns null for "no manifest here" and [] for "a manifest that
// declares nothing". A manifest that fails to parse declares nothing.

// The manifest files of this ecosystem in one directory, in MANIFESTS order.
function manifestFiles(eco, dir) {
  const files = [];
  for (const name of MANIFESTS[eco]) {
    if (!name.startsWith('*')) {
      files.push(name);
      continue;
    }
    try {
      files.push(...fs.readdirSync(dir).filter((f) => f.endsWith(name.slice(1))));
    } catch { /* unreadable dir — no manifest here */ }
  }
  return files;
}

// Names declared by one requirements file, following `-r other.txt` and
// `--requirement other.txt` includes: a dependency pinned in an included file
// is just as declared as one written inline. Depth- and cycle-bounded.
function requirementsNames(file, names, seen) {
  const resolved = path.resolve(file);
  if (seen.has(resolved) || seen.size > 16) return;
  seen.add(resolved);
  const text = readText(resolved);
  if (text === null) return;
  for (const name of requirementsDepNames(text)) names.add(name);
  for (const line of text.split(/\r?\n/)) {
    const include = line.trim().match(/^(?:-r|--requirement)[=\s]+(\S+)/);
    if (include) requirementsNames(path.join(path.dirname(resolved), include[1]), names, seen);
  }
}

// pyproject.toml and requirements.txt in one directory count as one manifest.
// pyproject.toml names it, and its names win when it declares any.
function readPython(dir) {
  const toml = readText(path.join(dir, 'pyproject.toml'));
  const names = new Set(toml === null ? [] : pyprojectDepNames(toml));
  if (names.size) return { name: 'pyproject.toml', deps: [...names] };
  const reqPath = path.join(dir, 'requirements.txt');
  if (readText(reqPath) === null) return toml === null ? null : { name: 'pyproject.toml', deps: [] };
  requirementsNames(reqPath, names, new Set());
  return { name: toml === null ? 'requirements.txt' : 'pyproject.toml', deps: [...names] };
}

// Every other ecosystem: the union of the manifest files present, named by
// the first one.
function readManifest(eco, dir) {
  if (eco === 'python') return readPython(dir);
  let name = null;
  const names = new Set();
  for (const file of manifestFiles(eco, dir)) {
    const text = readText(path.join(dir, file));
    if (text === null) continue;
    name = name || file;
    for (const n of parserFor(file)(text) || []) names.add(n);
  }
  return name === null ? null : { name, deps: [...names] };
}

// Declared names of the manifest in exactly this directory. Null = none here.
function readDeps(eco, dir) {
  if (!MANIFESTS[eco] || !dir) return null;
  const found = readManifest(eco, dir);
  return found && found.deps;
}

// ---- the walk ----

// Walk up from startDir to the nearest manifest for this ecosystem. The walk
// stops at that manifest even when it declares nothing: a root dependency
// that a nested package does not declare is new for it. Returns
// { dir, name, deps }, or null when no manifest exists up the tree.
function nearestManifest(eco, startDir) {
  if (!MANIFESTS[eco] || !startDir) return null;
  let dir = path.resolve(startDir);
  for (let i = 0; i < 12; i++) {
    const found = readManifest(eco, dir);
    if (found) return { dir, ...found };
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

module.exports = { MANIFESTS, parserFor, readDeps, nearestManifest, pyprojectDepNames };
