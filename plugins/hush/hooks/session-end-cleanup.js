#!/usr/bin/env node
"use strict";

// SessionEnd hook: session scratch lives as long as the session, so this is
// where it goes. The hook deletes the session's directory whole: sidecars,
// running total, note sentinel, react counter and debug manifest alike (see
// lib/session-scratch.js for the layout). The age-graced sweep catches what a
// crashed session left behind. It never touches a directory a live session
// wrote to recently.
//
// Deletion happens only at session end, never at compaction: the PreCompact
// summary hands the model those exact paths, and a within-session compaction
// must leave every one of them readable.
//
// Emits nothing — cleanup is a side effect, and SessionEnd output has nowhere
// to land. Always exits 0: a session that is already over must not be handed
// an error, and a sidecar left on disk costs nothing but temp space.

const { readInputOrNull: readInput } = require("./lib/harness");
const { removeSession, sweepStale } = require("./lib/session-scratch");
const { coreOff } = require("./lib/gate");

function main() {
  try {
    if (coreOff()) return;
    const data = readInput();
    if (data === null) return; // malformed stdin
    if (typeof data.session_id === "string" && data.session_id) removeSession(data.session_id);
    sweepStale();
  } catch {
    /* fail-open: never break a session over cleanup */
  }
}

if (require.main === module) main();

module.exports = { readInput };
