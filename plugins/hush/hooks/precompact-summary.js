#!/usr/bin/env node
"use strict";

// PreCompact hook: shapes the compaction summarizer's own instructions — the
// one recurring payload hush's PostToolUse compression can never touch,
// since a summary replaces prior messages and is re-sent on every later API
// call. Claude Code builds these instructions from this hook's RAW STDOUT
// (trimmed, newline-joined across all PreCompact hooks), not from
// hookSpecificOutput JSON — so this prints plain text only, and always
// exits 0 even on failure (fail-open: a hush crash must never break a
// session, especially not at the one moment a summary is about to replace
// the conversation).
//
// Two blocks, both format-shaping only — never information-dropping:
// (a) a static directive: structured list, preserve every path/identifier/
//     decision/error verbatim, drop narration and tool-output restatement.
// (b) only when this session has recovery files on disk: their paths, so the
//     summary can carry the reference instead of the content. Session scratch
//     lists the sidecars still live (see lib/session-scratch.js), each
//     stat-verified at summary time, and a listing longer than the cap says
//     how many it left out instead of dropping them silently.

const { readInputOrNull: readInput, emitRaw } = require("./lib/harness");
const path = require("path");
const { listSidecars } = require("./lib/session-scratch");
const { coreOff } = require("./lib/gate");

const SIDECAR_CAP = 20;

const STATIC_BLOCK =
  "Summary format: a compact structured list, not prose. Preserve verbatim every file path, " +
  "identifier, command, version number, error message, decision, and open thread — losing one " +
  "forces re-exploration that costs more than the summary saves. Drop narration, pleasantries, " +
  "step-by-step retellings, and content restated from tool outputs. One fact per line.";

// This session's live sidecars only, forward-slashed, or null when there's
// nothing to point at. These paths stay valid across the compaction this hook
// is announcing: sidecars are removed at session end, never at compaction.
//
// What the list knows: which sidecars are live, and how many. What it does
// NOT know: which tool produced each one, or whether a given file backs a
// digest (a long output parked whole) or a collapsed match list (the complete
// matches parked whole) — both are content-hash names in the same directory,
// and no per-file metadata is persisted (manifest records are HUSH_DEBUG-only
// by design). So the block names both shapes rather than claiming one per
// path.
function buildSidecarBlock(sessionId) {
  if (typeof sessionId !== "string" || !sessionId) return null;
  const live = listSidecars(sessionId);
  if (!live.length) return null;
  const paths = live.slice(0, SIDECAR_CAP).map((f) => f.replace(/\\/g, "/"));
  // Over SIDECAR_CAP the remainder is named by count and directory rather
  // than path — the summary stays bounded and the drop is explicit.
  const rest = live.length - paths.length;
  const tail = rest > 0 ? ` and ${rest} more in ${path.dirname(paths[0])}` : "";
  return (
    `Recovery files this session parked on disk — the conversation shows only a shortened view of ` +
    `each, either a digest of a long output or a collapsed list of matches: ${paths.join(", ")}${tail}. ` +
    `Keep these paths in the summary; do not reproduce their content. Reading one back returns the ` +
    `detail its shortened view left out. If a file is gone, re-running a search over unchanged files ` +
    `reproduces its matches; no other command is guaranteed to produce the same output twice.`
  );
}

function main() {
  try {
    if (coreOff()) return;
    if (process.env.HUSH_COMPACT === "off") return;
    const data = readInput();
    if (data === null) return; // malformed stdin

    const blocks = [STATIC_BLOCK];
    const sidecarBlock = buildSidecarBlock(data.session_id);
    if (sidecarBlock) blocks.push(sidecarBlock);
    emitRaw(blocks.join("\n\n"));
  } catch {
    /* fail-open: never break a session over a summary hint */
  }
}

if (require.main === module) main();

module.exports = { STATIC_BLOCK, buildSidecarBlock, readInput, SIDECAR_CAP };
