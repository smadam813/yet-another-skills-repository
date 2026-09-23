'use strict';

// Gate (Write|Edit, via pre-tool-use.js) — soft gate on dependencies entering
// through the manifest itself.
//
// The dep guard watches install commands and the import guard watches code,
// but a dependency can also arrive by editing package.json or
// requirements.txt directly — on some models that's the dominant path, and
// it reaches the project without either gate speaking. This gate watches
// that moment: a Write/Edit whose result adds a NEW name to the manifest's
// dependency sections is denied once with the reuse-first reason; re-issuing
// the same call passes. The reconsideration ledger is shared with the dep
// and import guards — one nudge per dependency however it enters.
//
// Bounded on purpose:
//   - package.json (every dependency section), requirements.txt, and
//     pyproject.toml (PEP 621 plus poetry tables) only; other manifests are
//     covered when their install is attempted,
//   - fires only when the manifest already exists on disk (creating a fresh
//     manifest is scaffolding a project, not sneaking a dependency in),
//   - version bumps of existing entries never fire — only new names count,
//   - Edits are simulated against the on-disk content (old_string →
//     new_string), so fragments are judged by the file they would produce;
//     anything unparseable stays silent — never a false deny.

const fs = require('fs');
const path = require('path');
const { settingOff } = require('./razor-lib');
const { evidenceReason } = require('./dep-guard');
const { parserFor, nearestManifest } = require('./manifest');
const { claim } = require('./reconsideration-ledger');

// The manifests this gate watches, by file name. A python project can
// declare every dependency in pyproject.toml and have no requirements.txt.
// This gate covers that manifest too.
const GUARDED = { 'package.json': 'node', 'requirements.txt': 'python', 'pyproject.toml': 'python' };

// Lowercased declared names in manifest text that is not on disk yet.
// null = unparseable (caller stays silent), Set otherwise.
function depNames(fileName, text) {
  const names = parserFor(fileName)(text);
  return names && new Set(names.map((n) => n.toLowerCase()));
}

function denyReason(tool, names, eco, manifestName, deps) {
  const what = names.map((n) => `\`${n}\``).join(', ');
  return evidenceReason(
    `razor: this ${tool} to ${manifestName} adds a new ${eco} dependency (${what}) without an install. `,
    deps,
    tool
  );
}

// The resulting manifest content this tool call would produce, or null when
// the call cannot land as written (the Edit would fail anyway).
function simulate(toolName, input, existing) {
  if (toolName === 'Write') return input.content || null;
  const oldStr = input.old_string;
  const newStr = input.new_string;
  if (!oldStr || newStr === undefined || !existing.includes(oldStr)) return null;
  return input.replace_all ? existing.split(oldStr).join(newStr) : existing.replace(oldStr, newStr);
}

// Dispatcher entry: mutates gate state, returns the deny reason or null.
function check(data, state, { env }) {
  if (settingOff('MANIFEST_GUARD', env)) return null;
  if (data.tool_name !== 'Write' && data.tool_name !== 'Edit') return null;

  const input = data.tool_input || {};
  const filePath = input.file_path;
  if (!filePath || /node_modules/.test(filePath)) return null;
  const fileName = path.basename(filePath).toLowerCase();
  const eco = GUARDED[fileName];
  if (!eco) return null;

  let existing;
  try {
    existing = fs.readFileSync(path.resolve(filePath), 'utf-8');
  } catch {
    return null; // no manifest on disk — greenfield scaffolding stays ungated
  }

  const resulting = simulate(data.tool_name, input, existing);
  if (!resulting) return null;

  const before = depNames(fileName, existing);
  const after = depNames(fileName, resulting);
  if (!before || !after) return null; // unparseable side — stay silent

  const fresh = [...after].filter((n) => !before.has(n)).sort();
  if (!fresh.length) return null;

  const unseen = claim(state, eco, fresh);
  if (!unseen.length) return null; // all already reconsidered — pass silently

  const manifest = nearestManifest(eco, path.dirname(path.resolve(filePath)));
  return denyReason(data.tool_name, unseen, eco, path.basename(filePath), manifest && manifest.deps);
}

module.exports = { check, depNames, simulate, GUARDED };
