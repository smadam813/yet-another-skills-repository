'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { run } = require('../hooks/pre-tool-use');
const sessionStart = require('../hooks/session-start');
const buildLedger = require('../hooks/build-ledger');
const subagentStart = require('../hooks/subagent-start');
const modeToggle = require('../hooks/mode-toggle');

/**
 * A Map holds the gate state for the dispatcher's run(). Each read returns a
 * copy, as the file store does, so a test sees only what run() wrote back.
 */
function mapStore() {
  const map = new Map();
  return {
    map,
    read: (id) => structuredClone(map.get(id) || {}),
    write: (id, state) => map.set(id, structuredClone(state)),
    sweep: () => {},
  };
}

/** A PreToolUse payload for session s1. */
function preToolUse(toolName, toolInput, extra) {
  return { session_id: 's1', hook_event_name: 'PreToolUse', tool_name: toolName, tool_input: toolInput || {}, ...extra };
}

/** Runs one call through the dispatcher's run(), with a new Map store unless the caller passes one. */
function dispatch(data, env, store = mapStore(), tmpDir = os.tmpdir()) {
  return run(data, { env, store, tmpDir });
}

/** Runs session-start's run() and returns the ladder it wrote, or '' when it wrote nothing. */
function startSession(data, env, store = mapStore()) {
  let out = '';
  sessionStart.run(data, { env, store, emit: (text) => (out += text) });
  return out;
}

/** Runs build-ledger's run() and returns the ledger question, or null. */
function stopTurn(data, env, store = mapStore()) {
  return buildLedger.run(data, { env, store });
}

/** Runs the SubagentStart hook's run() for one agent type in session s1. */
function subagent(agentType, env = {}, store = mapStore()) {
  return subagentStart.run({ session_id: 's1', hook_event_name: 'SubagentStart', agent_type: agentType }, { env, store });
}

/** Runs the UserPromptSubmit hook's run() for one prompt in session s1. */
function prompt(text, env = {}, store = mapStore()) {
  return modeToggle.run({ session_id: 's1', hook_event_name: 'UserPromptSubmit', prompt: text }, { env, store });
}

/** Minimal transcript containing one real user prompt with the given uuid. */
function writeTranscript(uuid) {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'razor-t-')), 't.jsonl');
  const line = JSON.stringify({
    type: 'user',
    uuid,
    message: { role: 'user', content: 'do the thing' },
  });
  fs.writeFileSync(file, line + '\n');
  return file;
}

module.exports = {
  mapStore,
  preToolUse,
  dispatch,
  startSession,
  stopTurn,
  subagent,
  prompt,
  writeTranscript,
};
