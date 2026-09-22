# CLAUDE.md

## Agent behaviors

### Writing style

Applies to all prose the agent writes: responses, commit messages, PR descriptions, issue comments, and docs. Quoted rules text, API contracts, and other authoritative sources keep their original wording. Lead with the answer, keep caveats short, and give a summary unless asked for depth.

Follow ASD-STE100 (Simplified Technical English). STE has writing rules and a controlled dictionary. Use an approved word with its approved meaning when the dictionary is available. Do not claim strict STE conformance without checking the current ASD-STE100 issue and dictionary.

- Write one instruction per sentence. Keep instructions under 20 words and descriptions under 25.
- Use the active voice and the present tense. Write instructions as commands.
- Use one word for one thing, and the same word every time. Do not vary terms for style.
- Keep articles and connectors. Do not stack more than three nouns in a row.
- Keep paragraphs to one topic and no more than six sentences.
- Put a warning or caution before the step it applies to.

Follow Orwell's six rules:

1. Never use a metaphor, simile, or other figure of speech which you are used to seeing in print.
2. Never use a long word where a short one will do.
3. If it is possible to cut a word out, always cut it out.
4. Never use the passive where you can use the active.
5. Never use a foreign phrase, a scientific word, or a jargon word if you can think of an everyday English equivalent.
6. Break any of these rules sooner than say anything outright barbarous.

Documents written for agents (a SKILL.md, `AGENTS.md`, `CLAUDE.md`) may use a leading word, a figure of speech such as "fog of war", on purpose, because the model already knows what it means. Treat it as a rule 6 exception to rule 1 and to the STE ban on figurative language. Keep it. Do not flatten it to plain English when you draft or revise.

## Agent skills

### Issue tracker

Issues live in this repo's GitHub Issues. See `docs/agents/issue-tracker.md`.

### Triage labels

Uses the default five triage role names as label strings. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` and one `docs/adr/` at the repo root. See `docs/agents/domain.md`.

## What this repo is

A plugin marketplace of agent skills. Claude Code and Cursor both install the skills from the same directories.

Most of the content is Markdown. The repo has no `package.json`. The marketplace checker and the hook code in hush and razor are the only programs in it.

## Validate

```
node scripts/check-marketplace.mjs
```

The checker runs on plain Node and needs no dependencies. `.github/workflows/validate.yml` runs the same command on every push and pull request, and its `validate` job is the required status check on `main`. Run the checker after you change a manifest, a skill directory name, a SKILL.md frontmatter block, or a plugin README.

Lint Markdown with `npx markdownlint-cli2` (rules in `.markdownlint.jsonc`). CI runs it as the `lint` job, which advises and does not gate the merge.

Run a plugin's tests from its directory after you change its hooks:

```
node --test tests/*.test.js
```

CI runs them as the `test` job on Ubuntu and Windows with Node 22. `.gitattributes` forces LF on checkout because the tests compare hook output against golden files byte for byte.

## Packaging for both tools

Four manifests describe each plugin. The checker fails when they disagree:

- `.claude-plugin/marketplace.json` — each `source` is a path from the repo root (`./plugins/engineering`).
- `.cursor-plugin/marketplace.json` — each `source` is a path from `metadata.pluginRoot` (`engineering`). Both paths must point to the same directory.
- `plugins/<plugin>/.claude-plugin/plugin.json` and `plugins/<plugin>/.cursor-plugin/plugin.json` — `description`, `version`, `license`, and `keywords` must match between the two files, and each `description` must match the one in its marketplace entry. Cursor's manifest also carries `"skills": "./skills/"`.

A new description therefore changes four files for a plugin in both marketplaces, and two for a Claude-only one. A new version changes both plugin.json files. List a new plugin in both marketplaces: the checker fails on a plugin that only one marketplace names.

A plugin with no `.cursor-plugin/plugin.json` is Claude-only. It ships hooks or output styles that Cursor cannot load. The checker then requires it to stay out of the Cursor marketplace and skips the Cursor manifest checks. `hush` is Claude-only.

Both tools read a skill from the same path, in the same format: `plugins/<plugin>/skills/<name>/SKILL.md`.

## Versions

Bump a plugin's version in the same PR that changes its skills, as a separate commit: minor when a skill is added or removed, patch when an existing skill changes. The `bump-plugin-version` skill does the edit.

## Adding or editing a skill

- Name the directory with lowercase letters, numbers, and hyphens. Frontmatter `name` must match the directory name. Cursor rejects a mismatch that Claude Code accepts.
- Give the skill a `description`. Cursor does not load a skill without one. Quote the value when it contains a colon.
- Start the body at its first real sentence. The frontmatter `name` already titles the skill, so the checker errors on a body that opens with an H1.
- Keep skill names unique across plugins. The checker only warns about a repeated name, because Claude Code gives each plugin its own namespace. Cursor does not, so one skill there hides the other.
- Link the skill from `plugins/<plugin>/README.md` in alphabetical order. Nothing generates that index, and the checker errors on a skill directory the README does not link.
- Put supporting material beside the SKILL.md: `references/` for Markdown that a pointer reaches, `scripts/` for templates the skill copies.

## Forked plugins

`plugins/hush` and `plugins/razor` began as vendored copies and are now this repo's own plugins. See `docs/adr/0001-fork-hush.md` and `docs/adr/0002-fork-razor.md`. Repo conventions apply to all of their files. Each README names the upstream repo and the fork point. Port an upstream fix by hand when it matters.

## Invocation choice

`disable-model-invocation: true` makes a skill **user-invoked**. Only a human who types its name can start it, and no other skill can reach it. Its `description` then faces that human: a one-line summary, without the trigger phrases.

Leave the field out, and the skill stays **model-invoked**. Its description sits in context on every turn and works as the trigger, so it must carry the "Use when ..." branches. Choose model invocation only when the agent, or another skill, has to reach the skill on its own.

`ask-builder` is the router that helps a human find the user-invoked engineering skills.

## Branches and PRs

Work on a branch and open a pull request. Commits never land on `main` directly. PRs squash-merge, so the PR title becomes the commit subject: imperative mood, sentence case, no type prefix, no trailing period. Name the version bump in the PR body.
