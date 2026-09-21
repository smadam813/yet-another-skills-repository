#!/usr/bin/env node
"use strict";

// PostToolUse adapter. The Core gate and the watched-tools check run here,
// then the hook reads stdin, builds the transform's dependencies from the
// real modules, calls the transform, and emits. Everything that decides what
// the model sees lives in lib/transform.js. This file exports nothing.

const { readInput, emitToolOutput, readTurn } = require("./lib/harness");
const sessionScratch = require("./lib/session-scratch");
const { coreOff } = require("./lib/gate");
const { transform, settingsFromEnv } = require("./lib/transform");

const WATCHED_TOOLS = new Set(["Bash", "PowerShell", "Read", "Grep"]);

function main() {
  if (coreOff()) return;
  const payload = readInput();
  if (!WATCHED_TOOLS.has(payload.tool_name)) return;

  // The environment is read here and nowhere else.
  const deps = { scratch: sessionScratch, turn: readTurn, settings: settingsFromEnv(process.env) };
  const { updated, context } = transform(payload, deps);
  if (updated === undefined) return; // nothing shrank — stay silent
  emitToolOutput(updated, context ? { additionalContext: context } : null);
}

main();
