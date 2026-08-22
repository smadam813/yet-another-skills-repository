# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A plugin marketplace of agent skills, installable by **both Claude Code and Cursor** from the same directories. The content is Markdown. There is no application code, no `package.json`, and no test suite; the only executable is the marketplace checker.

## Validate

```
node scripts/check-marketplace.mjs
```

Plain Node, no dependencies. `.github/workflows/validate.yml` runs this same command on every push and pull request, and its `validate` job is the required status check on `main`. Run it after any change to a manifest, a skill directory name, or a SKILL.md frontmatter block.

## Dual-tool packaging

Four manifests describe the two plugins, and the checker fails on drift between them:

- `.claude-plugin/marketplace.json` — each `source` is a path from the repo root (`./plugins/engineering`).
- `.cursor-plugin/marketplace.json` — each `source` is relative to `metadata.pluginRoot` (`engineering`). Both must resolve to the same directory.
- `plugins/<plugin>/.claude-plugin/plugin.json` and `plugins/<plugin>/.cursor-plugin/plugin.json` — `description`, `version`, `license`, and `keywords` must match between them, and each `description` must match the one in its marketplace entry. Cursor's manifest also carries `"skills": "./skills/"`.

So a version bump or a description edit is a four-file change, and a new plugin listed in only one marketplace is an error, not a partial install.

Skills are the one thing both tools read identically, from `plugins/<plugin>/skills/<name>/SKILL.md`.

## Adding or editing a skill

- The directory name is lowercase letters, numbers, and hyphens, and frontmatter `name` must equal it. Cursor rejects a mismatch that Claude Code tolerates.
- `description` is required; Cursor will not load a skill without one.
- Keep skill names unique across plugins. A collision is only a warning, because Claude Code namespaces skills per plugin, but Cursor does not and one skill then shadows the other.
- List the skill in `plugins/<plugin>/README.md`. That index is maintained by hand.
- Supporting material sits beside the SKILL.md: `references/` for Markdown reached by a pointer, `scripts/` for templates the skill emits.

## Invocation choice

`disable-model-invocation: true` makes a skill **user-invoked**: only a human typing its name starts it, no other skill can reach it, and its `description` is a one-line human summary with the trigger phrases stripped. Omitting the field keeps the skill **model-invoked**, and its description stays in context on every turn as the trigger, so it carries the "Use when ..." branches. Pick model invocation only when the agent or another skill has to reach the skill on its own. `ask-builder` is the router that lets a human find the user-invoked engineering skills.

## Writing standard

The skills here are written to the repo's own rules. Before writing or editing a SKILL.md, a `CLAUDE.md`, or an `AGENTS.md`, read `plugins/productivity/skills/writing-for-agents/SKILL.md` and its `references/SKILL-MECHANICS.md`. For prose style, read `plugins/productivity/skills/orwell-writing/SKILL.md`.
