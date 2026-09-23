#!/usr/bin/env node
'use strict';

// SubagentStart — inject the ladder into code-writing subagents only.
//
// SessionStart context never reaches subagents, so without this every
// Task-spawned agent runs razor-unaware. Rather than injecting into every
// spawn, razor gates by agent type — read-only exploration/planning agents
// never write code, so for them the ladder is pure injection tax (N× in a
// fan-out).
//
// Unknown agent types get the ruleset: most custom agents write code, and
// the fail-safe direction is guarded, not lean.

const { RULESET, readInput, emitContext, fileStore, isActive } = require('./razor-lib');

// Read-only / non-coding built-ins. Extend with RAZOR_AGENT_SKIP.
const DEFAULT_SKIP = [
  'explore',
  'plan',
  'claude-code-guide',
  'statusline-setup',
  'output-style-setup',
];

function parseList(value) {
  return String(value || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

// Skip entries match the full agent type ("forge:adversarial-critic") or
// its unscoped name ("adversarial-critic"), case-insensitive.
function matches(list, agentType) {
  const full = String(agentType || '').toLowerCase();
  const bare = full.includes(':') ? full.slice(full.indexOf(':') + 1) : full;
  return list.includes(full) || list.includes(bare);
}

function shouldInject(agentType, env) {
  if (matches(parseList(env.RAZOR_AGENT_INJECT), agentType)) return true;
  if (matches(DEFAULT_SKIP.concat(parseList(env.RAZOR_AGENT_SKIP)), agentType)) return false;
  return true;
}

// Returns the ladder for one subagent, or null to stay silent. Every
// setting, RAZOR_AGENT_SKIP and RAZOR_AGENT_INJECT included, comes from
// `env`.
function run(data, { env, store }) {
  if (!isActive(store.read(data.session_id), env)) return null;
  if (!shouldInject(data.agent_type, env)) return null;
  return RULESET;
}

function main() {
  const env = process.env;
  emitContext('SubagentStart', run(readInput(), { env, store: fileStore(env) }));
}

if (require.main === module) main();

module.exports = { run, main, shouldInject, DEFAULT_SKIP };
