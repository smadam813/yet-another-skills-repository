---
name: setup-builder-tools
description: Configure this repo for the engineering skills — set up its issue tracker, triage label vocabulary, and domain doc layout. Run once before first use of the other engineering skills.
disable-model-invocation: true
license: MIT
metadata:
  vendored: modified
  upstream_source: https://github.com/mattpocock/skills
  upstream_path: skills/engineering/setup-matt-pocock-skills/SKILL.md
  upstream_author: Matt Pocock
  upstream_copyright: Copyright (c) 2026 Matt Pocock
  upstream_license: MIT
  local_changes: >-
    Renamed from upstream's setup-matt-pocock-skills. GitLab tracker option
    and issue-tracker-gitlab.md removed; triage-labels table rebranded to
    this repository. Prose edited for plain English per the /orwell-writing
    skill: American spelling, shorter sentences, active voice. The Agent
    skills block, the file-selection rules, and the seed-template links are
    unchanged.
  note: >-
    See NOTICE at the repository root.
---

# Setup Builder Tools

Scaffold the per-repo configuration that the engineering skills assume:

- **Issue tracker** — where issues live. GitHub is the default; local markdown also works out of the box.
- **Triage labels** — the strings used for the five canonical triage roles
- **Domain docs** — where `CONTEXT.md` and the ADRs live, and the rules for reading them

This is a prompt-driven skill, not a deterministic script. Explore, present what you found, confirm with the user, then write.

## Process

### 1. Explore

Look at the current repo to understand its starting state. Read whatever exists. Do not assume:

- `git remote -v` and `.git/config` — is this a GitHub repo? Which one?
- `AGENTS.md` and `CLAUDE.md` at the repo root — does either exist? Does either already have an `## Agent skills` section?
- `CONTEXT.md` and `CONTEXT-MAP.md` at the repo root
- `docs/adr/` and any `src/*/docs/adr/` directories
- `docs/agents/` — does this skill's earlier output already exist?
- `.scratch/` — a sign that the repo already uses a local-markdown issue tracker
- Is the `triage` skill installed? Look for a `triage` skill folder alongside this one, or `triage` in your available skills. This decides whether Section B runs at all.
- Monorepo signals — a `pnpm-workspace.yaml`, a `workspaces` field in `package.json`, or a populated `packages/*` with its own `src/`. These appear only in a large multi-package repo. If they are absent, the repo is single-context, which is true of almost every repo.

### 2. Present findings and ask

Summarize what is present and what is missing. Then take the sections in order: one section, one answer, then the next.

Lead each section with the recommended answer, so the user can accept it in a word. Give a one-line explainer only when the choice genuinely branches. Skip a section entirely when exploration already settled it — Section B when `triage` is not installed, Section C when there is no monorepo.

**Section A — Issue tracker.**

> Explainer: The "issue tracker" is where issues live for this repo. Skills like `to-tickets`, `triage`, and `to-spec` read from it and write to it, so they need to know whether to call `gh issue create`, write a markdown file under `.scratch/`, or follow some other workflow you describe. Pick the place you actually track work for this repo.

Default: these skills were designed for GitHub. If a `git remote` points at GitHub, propose that. Otherwise, or if the user prefers, offer:

- **GitHub** — issues live in the repo's GitHub Issues (uses the `gh` CLI)
- **Local markdown** — issues live as files under `.scratch/<feature>/` in this repo. Good for solo projects, or repos with no remote.
- **Other** (Jira, Linear, and so on) — ask the user to describe the workflow in one paragraph. The skill records it as freeform prose.

Record the choice in `docs/agents/issue-tracker.md`. The GitHub template carries a "PRs as a request surface" flag, which defaults to **off**. Leave it off and do not raise it. A user who wants external PRs in the triage queue can flip the flag in the file later.

**Section B — Triage label vocabulary.** Skip this section entirely if the `triage` skill is not installed, which exploration will have told you. A skill that is not installed needs no labels.

If it is installed, ask exactly one question:

> Do you want to keep the default triage labels? (recommended: **yes**)

The defaults are the five canonical roles, and each label string equals its name: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. On **yes**, write them as they are. Collect overrides only if the user says no — usually because their tracker already uses other names, such as `bug:triage` for `needs-triage`. Overrides let `triage` apply the existing labels instead of creating duplicates.

**Section C — Domain docs.** Default to **single-context**: one `CONTEXT.md` and one `docs/adr/` at the repo root. This fits almost every repo, so write it without asking.

Offer **multi-context** — a root `CONTEXT-MAP.md` pointing to per-context `CONTEXT.md` files — only when exploration found monorepo signals. Then confirm which layout they want.

### 3. Confirm and edit

Show the user a draft of:

- The `## Agent skills` block to add to whichever of `CLAUDE.md` or `AGENTS.md` you are editing (see step 4 for the selection rules)
- The contents of `docs/agents/issue-tracker.md`, `docs/agents/domain.md`, and `docs/agents/triage-labels.md` — the last one only when `triage` is installed

Let them edit before you write.

### 4. Write

**Pick the file to edit:**

- If `CLAUDE.md` exists, edit it.
- Otherwise, if `AGENTS.md` exists, edit it.
- If neither exists, ask the user which one to create. Do not pick for them.

Never create `AGENTS.md` when `CLAUDE.md` already exists, or the reverse. Always edit the one that is already there.

If an `## Agent skills` block already exists in the chosen file, update its contents in place rather than appending a duplicate. Do not overwrite the user's edits to the surrounding sections.

The block:

```markdown
## Agent skills

### Issue tracker

[one-line summary of where issues are tracked]. See `docs/agents/issue-tracker.md`.

### Triage labels

[one-line summary of the label vocabulary]. See `docs/agents/triage-labels.md`.

### Domain docs

[one-line summary of layout — "single-context" or "multi-context"]. See `docs/agents/domain.md`.
```

Include the `### Triage labels` sub-block, and write `docs/agents/triage-labels.md`, only when `triage` is installed and Section B ran. When it is not, omit both.

Then write the docs files, using the seed templates in this skill folder as a starting point:

- [issue-tracker-github.md](./issue-tracker-github.md) — GitHub issue tracker
- [issue-tracker-local.md](./issue-tracker-local.md) — local-markdown issue tracker
- [triage-labels.md](./triage-labels.md) — label mapping (only if `triage` is installed)
- [domain.md](./domain.md) — domain doc rules and layout

For "other" issue trackers, write `docs/agents/issue-tracker.md` from scratch, using the user's description.

### 5. Done

Tell the user the setup is complete, and which engineering skills will now read from these files. Mention that they can edit `docs/agents/*.md` directly later. They only need to re-run this skill to switch issue trackers or to start over.
