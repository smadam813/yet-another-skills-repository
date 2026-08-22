# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

This repo is a plugin marketplace of agent skills. Claude Code and Cursor both install those skills from the same directories.

The content is Markdown. The repo holds no application code, no `package.json`, and no test suite. The marketplace checker is the only program in it.

## Validate

```
node scripts/check-marketplace.mjs
```

The checker runs on plain Node and needs no dependencies. `.github/workflows/validate.yml` runs the same command on every push and pull request. Its `validate` job is the required status check on `main`. Run the checker after you change a manifest, a skill directory name, or a SKILL.md frontmatter block.

## Packaging for both tools

Four manifests describe the two plugins. The checker fails when they disagree:

- `.claude-plugin/marketplace.json` — each `source` is a path from the repo root (`./plugins/engineering`).
- `.cursor-plugin/marketplace.json` — each `source` is a path from `metadata.pluginRoot` (`engineering`). Both paths must point to the same directory.
- `plugins/<plugin>/.claude-plugin/plugin.json` and `plugins/<plugin>/.cursor-plugin/plugin.json` — `description`, `version`, `license`, and `keywords` must match between the two files, and each `description` must match the one in its marketplace entry. Cursor's manifest also carries `"skills": "./skills/"`.

A new version number, or a new description, therefore changes four files. List a new plugin in both marketplaces: the checker fails on a plugin that only one marketplace names.

Both tools read a skill from the same path, in the same format: `plugins/<plugin>/skills/<name>/SKILL.md`.

## Adding or editing a skill

- Name the directory with lowercase letters, numbers, and hyphens. Frontmatter `name` must match the directory name. Cursor rejects a mismatch that Claude Code accepts.
- Give the skill a `description`. Cursor does not load a skill without one.
- Keep skill names unique across plugins. The checker only warns about a repeated name, because Claude Code gives each plugin its own namespace. Cursor does not, so one skill there hides the other.
- List the skill by hand in `plugins/<plugin>/README.md`. Nothing generates that index.
- Put supporting material beside the SKILL.md: `references/` for Markdown that a pointer reaches, `scripts/` for templates the skill copies.

## Invocation choice

`disable-model-invocation: true` makes a skill **user-invoked**. Only a human who types its name can start it, and no other skill can reach it. Its `description` then faces that human: a one-line summary, without the trigger phrases.

Leave the field out, and the skill stays **model-invoked**. Its description sits in context on every turn and works as the trigger, so it must carry the "Use when ..." branches. Choose model invocation only when the agent, or another skill, has to reach the skill on its own.

`ask-builder` is the router that helps a human find the user-invoked engineering skills.

## Writing standard

The skills here follow the repo's own rules. Read `plugins/productivity/skills/writing-for-agents/SKILL.md` and its `references/SKILL-MECHANICS.md` before you write or edit a SKILL.md, a `CLAUDE.md`, or an `AGENTS.md`. For prose style, read `plugins/productivity/skills/orwell-writing/SKILL.md`.
