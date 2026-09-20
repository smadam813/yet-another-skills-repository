#!/usr/bin/env node
"use strict";

// PostCompact hook: re-arms the once-per-session note after compaction.
// compress-tool-output.js delivers the note once per session, guarded by a
// sentinel that session scratch holds. Compaction summarizes the note away
// while the sentinel still says "delivered". A note that appears after
// compaction then arrives unexplained, and the model may read it as prompt
// injection. Re-arming makes the next note deliver again. It is harmless if
// nothing was ever claimed.
//
// Emits nothing: re-injecting the note on every compaction would spend
// tokens on sessions that never emit another note. The note-triggered path
// in compress-tool-output.js delivers the note again only when a note is
// about to be shown.

const { readInputOrNull: readInput } = require("./lib/harness");
const { rearmNote } = require("./lib/session-scratch");
const { coreOff } = require("./lib/gate");

// Re-arming drops the sentinel whole, so the next note can claim it again.
// Nothing here trusts state content. session_id arrives from stdin raw.
// Session scratch flattens it to one path segment, so a traversal-shaped id
// names a directory hush owns, never someone else's file.
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
