'use strict';

// The reconsideration ledger: the record of the dependencies that already got
// a nudge. The dep, manifest, and import guards share it. A dependency gets one
// nudge, whether it arrives as an install, a manifest edit, or an import:
// `pip install pyyaml` and `import yaml` are one dependency.
//
// This module also owns the identity rule. Two names are one dependency when
// the rule that decides "declared" links them. So the import guard's declared
// check and the reconsideration ledger always agree. The rule matches in the
// SUPPRESSING direction only: over-matching costs one missed nudge, never a
// false deny.

// A declared dependency name can differ from its import name (python-dotenv
// -> dotenv, pyyaml -> yaml).
// razor: a static alias list for the common odd pairs; full metadata-derived
// mapping if these ever prove too few.
const KNOWN_IMPORT_NAMES = {
  pillow: 'pil',
  beautifulsoup4: 'bs4',
  'opencv-python': 'cv2',
  'scikit-learn': 'sklearn',
  pymupdf: 'fitz',
  grpcio: 'grpc',
  protobuf: 'google',
  dnspython: 'dns',
  attrs: 'attr',
};

function declaredNameForms(name) {
  const n = String(name).toLowerCase();
  // A wheel-flavour suffix is packaging, not a name: psycopg2-binary and
  // psycopg2 import identically, and only the flavour reaches the manifest.
  const forms = new Set([
    n, n.replace(/-/g, '_'), n.replace(/^python-/, ''), n.replace(/^py/, ''), n.replace(/-binary$/, ''),
  ]);
  if (KNOWN_IMPORT_NAMES[n]) forms.add(KNOWN_IMPORT_NAMES[n]);
  return forms;
}

function isDeclared(root, deps) {
  const r = root.toLowerCase();
  const rUnderscore = r.replace(/-/g, '_');
  for (const d of deps || []) {
    const forms = declaredNameForms(d);
    if (forms.has(r) || forms.has(rUnderscore)) return true;
  }
  return false;
}

function sameDependency(a, b) {
  return isDeclared(a, [b]) || isDeclared(b, [a]);
}

// Returns the names that still owe a nudge in this ecosystem, and claims them
// in the same call. An empty result means pass.
function claim(state, eco, names) {
  state.reconsidered = state.reconsidered || {};
  const seen = (state.reconsidered[eco] = state.reconsidered[eco] || []);
  const owed = [];
  for (const n of names) {
    if (seen.some((s) => sameDependency(n, s))) continue;
    seen.push(n);
    owed.push(n);
  }
  return owed;
}

module.exports = { claim, isDeclared };
