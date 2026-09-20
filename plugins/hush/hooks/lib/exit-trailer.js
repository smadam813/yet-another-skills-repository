"use strict";

// The exit trailer: the one wire format between preserve-exit-code.js (which
// writes it) and compress-tool-output.js (which reads it). Both hooks import
// this module, and tests/exit_trailer.test.js round-trips the pair, so a
// change to the text cannot leave one side behind.
//
// The trailer is `[[hush:exit=`, the exit code, `]]`, each on its own line.
// The shells print it in three statements with no `$var` ever inside a
// quoted string and no parentheses around a variable: Claude Code's own
// command-safety layer rejects both of the more natural forms (see the
// header of preserve-exit-code.js). Single-quoted literals plus a bare
// variable expression statement is the most primitive construct that still
// gets through, on both shells.

const PREFIX = "[[hush:exit=";
const SUFFIX = "]]";

// The statements a bash wrapper appends after the command. `$?` is captured
// first, because `echo` itself resets it.
function bashTrailer() {
  return `__hush_exit=$?\necho '${PREFIX}'\necho $__hush_exit\necho '${SUFFIX}'`;
}

// The statements a PowerShell wrapper appends after the command. PowerShell
// auto-prints an unconsumed expression's value, so the bare `$LASTEXITCODE`
// line is the number. A pure-cmdlet command never sets it, and the trailer
// then comes back with an empty body: that is the malformed case below.
function powershellTrailer() {
  return `Write-Output '${PREFIX}'\n$LASTEXITCODE\nWrite-Output '${SUFFIX}'`;
}

// Real output splits the prefix, the number, and the suffix across three
// lines, CRLF or LF. `\s*` bridges the line breaks either way.
//
// Two patterns, deliberately: ANY has no digit requirement, so it also
// matches a MALFORMED trailer (empty body). That text must still be stripped,
// never leaked to the model raw, even though it carries no usable code.
// Every occurrence is removed, not just the last: Claude Code's "output too
// large, persisted to a sidecar file" mechanism captures RAW pre-hook output
// including a well-formed trailer, and a later `Get-Content -Tail` on that
// file gets wrapped again, so two trailers can land in one tool result.
//
// The body admits only whitespace and an optional integer: everything the
// wrapper can emit between the brackets, and nothing else. A looser body
// spans lines and eats real text when the trailer syntax appears as literal
// source, e.g. this file read back through the hook.
const ANY_RE = /\[\[hush:exit=\s*(?:-?\d+)?\s*\]\]/g;
const VALID_RE = /\[\[hush:exit=\s*(-?\d+)\s*\]\]/g;
// ANY without /g, for the caller that asks "is there a trailer here at all?"
// rather than replacing them. Derived from ANY's source so the two cannot
// drift, and non-global so a .test() carries no lastIndex state.
const PRESENT_RE = new RegExp(ANY_RE.source);

// null when no trailer text appears at all. Otherwise strips every trailer
// from cleanText; exitCode is the last WELL-FORMED trailer's value, or null
// when every trailer found was malformed. Callers treat a null exitCode as
// "no reliable exit code known" while still using the stripped cleanText.
function decode(text) {
  if (typeof text !== "string" || !text.includes(PREFIX)) return null;

  VALID_RE.lastIndex = 0;
  let match;
  let lastValid;
  while ((match = VALID_RE.exec(text))) lastValid = match;

  const cleanText = text.replace(ANY_RE, "").replace(/\n{3,}/g, "\n\n").replace(/\s+$/, "");
  return { exitCode: lastValid ? parseInt(lastValid[1], 10) : null, cleanText };
}

// True when a STRIPPABLE trailer is present. Keyed on that, not on the bare
// prefix: the host truncates raw output around 29KB and can cut a trailer
// mid-text, and hush's own source dumped to stdout carries the prefix as
// literal text. In both cases decode strips nothing.
function hasTrailer(text) {
  return typeof text === "string" && PRESENT_RE.test(text);
}

module.exports = { PREFIX, SUFFIX, bashTrailer, powershellTrailer, decode, hasTrailer };
