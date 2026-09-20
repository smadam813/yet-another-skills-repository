"use strict";

// The exit trailer is the wire format between two hooks. preserve-exit-code.js
// writes it and compress-tool-output.js reads it. Both import this module, and
// tests/exit_trailer.test.js sends the statements through decode. A change to
// the text that breaks one side therefore fails a test, not a session.
//
// The trailer is `[[hush:exit=`, the exit code, and `]]`, each on its own
// line. Each shell prints it in three statements. No `$var` sits inside a
// quoted string, and no parentheses sit around a variable, because Claude
// Code's command-safety layer rejects both forms. preserve-exit-code.js
// records what that layer said.

const PREFIX = "[[hush:exit=";
const SUFFIX = "]]";

// The statements a bash wrapper appends after the command. The first line
// saves `$?` because `echo` resets it.
function bashTrailer() {
  return `__hush_exit=$?\necho '${PREFIX}'\necho $__hush_exit\necho '${SUFFIX}'`;
}

// The statements a PowerShell wrapper appends after the command. PowerShell
// prints the value of a bare expression, so the `$LASTEXITCODE` line is the
// number. A pure-cmdlet command never sets it. The trailer then has an empty
// body, which is the malformed case below.
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

// True when the text holds a trailer that decode strips. The bare prefix is
// not enough. The host truncates raw output around 29KB and can cut a
// trailer in two, and hush's own source dumped to stdout holds the prefix as
// literal text. In both cases decode strips nothing.
function hasTrailer(text) {
  return typeof text === "string" && PRESENT_RE.test(text);
}

module.exports = { PREFIX, SUFFIX, bashTrailer, powershellTrailer, decode, hasTrailer };
