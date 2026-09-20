#!/usr/bin/env node
"use strict";

// PostCompact hook: re-arms the once-per-session note after compaction.
// compress-tool-output.js's note fires once per session, guarded by a
// sentinel that session scratch holds — but compaction summarizes the note
// away while the sentinel still says "delivered", so notes appearing after
// compaction arrive unexplained and risk being read as prompt injection.
// Re-arming makes the next note deliver again, and is harmless if nothing
// was ever claimed.
//
// Emits nothing: re-injecting the note unconditionally on every compaction
// would spend tokens on sessions that never emit another marker. Silence is
// the design — the existing marker-triggered path re-delivers the note only
// when a marker is actually about to be shown.

const { readInputOrNull: readInput } = require("./lib/harness");
const { rearmNote } = require("./lib/session-scratch");
const { coreOff } = require("./lib/gate");

// Re-arming is total: the sentinel is dropped so the next note can claim it
// again, never carried forward as still live. Nothing here trusts state
// content. session_id arrives from stdin raw; session scratch flattens it to
// one path segment, so a traversal-shaped id names a directory hush owns,
// never someone else's file.
function main() {
  try {
    if (coreOff()) return;
    const data = readInput();
    if (data === null) return; // malformed stdin
    if (typeof data.session_id !== "string" || !data.session_id) return;
    rearmNote(data.session_id);
  } catch {
    /* fail-open: never break a session over re-arming a note */
  }
}

if (require.main === module) main();

module.exports = { readInput };
