---
name: setup-builder-skills
description: "Configure this repo for the engineering skills: set up its issue tracker, triage label vocabulary, and domain doc layout. Run this once before you use the other engineering skills."
disable-model-invocation: true
---

Create the per-repo configuration that the engineering skills read:

- **Issue tracker**: where issues live. GitHub by default; GitLab and local markdown also have templates.
- **Triage labels**: the label strings for the five triage roles
- **Domain docs**: where `CONTEXT.md` and ADRs live, and the rules for reading them

This skill is a prompt, not a script. Explore the repo, present what you found, confirm with the user, then write the files.

## Process

### 1. Explore

Read the repo's current state. Check each item; do not assume:

- `git remote -v` and `.git/config`: is this a GitHub repo? Which one?
- `AGENTS.md` and `CLAUDE.md` at the repo root: does either exist? Does either already have an `## Agent skills` section?
- `CONTEXT.md` and `CONTEXT-MAP.md` at the repo root
- `docs/adr/` and any `src/*/docs/adr/` directories
- `docs/agents/`: did an earlier run of this skill already write here?
- `.scratch/`: if it exists, the repo may already track issues as local markdown
- Is the `triage` skill installed? Look for a `triage` skill folder next to this one, or `triage` in your available skills. This decides whether Section B runs.
- Monorepo signals: a `pnpm-workspace.yaml`, a `workspaces` field in `package.json`, or a populated `packages/*` with its own `src/`. Only a large multi-package repo has these. If none are present, the repo is single-context, which is the usual case.

### 2. Present findings and ask

Summarize what is present and what is missing. Then take the sections in order. One section, one answer, then the next.

Start each section with the recommended answer, so the user can accept it in one word. Add a one-line explanation only when the choice is real. Skip a section when exploration already settled it: Section B when `triage` is not installed, Section C when the repo is not a monorepo.

**Section A: Issue tracker.**

> The issue tracker is where this repo's issues live. Skills such as `to-tickets`, `triage`, and `to-spec` read it and write to it. They need to know whether to run `gh issue create`, write a markdown file under `.scratch/`, or follow another workflow that you describe. Pick the place where you track work for this repo.

These skills were designed for GitHub. If a `git remote` points at GitHub, propose GitHub. If a `git remote` points at GitLab (`gitlab.com` or a self-hosted host), propose GitLab. If neither applies, or if the user asks, offer these options:

- **GitHub**: issues live in the repo's GitHub Issues (uses the `gh` CLI)
- **GitLab**: issues live in the repo's GitLab Issues (uses the [`glab`](https://gitlab.com/gitlab-org/cli) CLI)
- **Local markdown**: issues live as files under `.scratch/<feature>/` in this repo (good for solo projects or repos without a remote)
- **Other**, such as Jira or Linear: ask the user to describe the workflow in one paragraph, then record that description as prose

Record the choice in `docs/agents/issue-tracker.md`. The GitHub and GitLab templates contain a "PRs as a request surface" flag, set to **off**. Leave it off and do not ask about it. A user who wants external PRs in the triage queue can change the flag in the file later.

**Section B: Triage label vocabulary.** Skip this section if exploration found that the `triage` skill is not installed. A skill that is not installed needs no labels.

If it is installed, ask exactly one question:

> Do you want to keep the default triage labels? (recommended: **yes**)

The defaults are the five roles, where each label string is the same as the role name: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. If the user answers yes, write them unchanged. If the user answers no, collect the replacement names. Users usually answer no because their tracker already uses other names, such as `bug:triage` for `needs-triage`. The replacement names let `triage` apply the existing labels instead of creating duplicates.

**Section C: Domain docs.** Default to **single-context**: one `CONTEXT.md` and one `docs/adr/` at the repo root. This fits almost every repo. Write it without asking.

Offer **multi-context**, a root `CONTEXT-MAP.md` that points to one `CONTEXT.md` per context, only when exploration found monorepo signals. Then ask the user which layout they want.

### 3. Confirm and edit

Show the user a draft of:

- The `## Agent skills` block to add to whichever of `CLAUDE.md` / `AGENTS.md` you are editing (see step 4 for the selection rules)
- The contents of `docs/agents/issue-tracker.md`, `docs/agents/domain.md`, and `docs/agents/triage-labels.md`. Draft the last file only when `triage` is installed.

Let them edit before you write.

### 4. Write

**Pick the file to edit:**

- If `CLAUDE.md` exists, edit it.
- Else if `AGENTS.md` exists, edit it.
- If neither exists, ask the user which one to create; do not pick for them.

Never create `AGENTS.md` when `CLAUDE.md` exists, and never create `CLAUDE.md` when `AGENTS.md` exists. Always edit the file that is already there.

If the chosen file already has an `## Agent skills` block, update that block in place. Do not append a second one. Do not overwrite the user's edits to the other sections.

The block:

```markdown
## Agent skills

### Issue tracker

[one-line summary of where issues are tracked]. See `docs/agents/issue-tracker.md`.

### Triage labels

[one-line summary of the label vocabulary]. See `docs/agents/triage-labels.md`.

### Domain docs

[one-line summary of layout: "single-context" or "multi-context"]. See `docs/agents/domain.md`.
```

Include the `### Triage labels` sub-block, and write `docs/agents/triage-labels.md`, only when `triage` is installed and Section B ran. If `triage` is not installed, omit both.

Then write the docs files. Start from the templates in this skill folder:

- [issue-tracker-github.md](references/issue-tracker-github.md): GitHub issue tracker
- [issue-tracker-gitlab.md](references/issue-tracker-gitlab.md): GitLab issue tracker
- [issue-tracker-local.md](references/issue-tracker-local.md): local-markdown issue tracker
- [triage-labels.md](references/triage-labels.md): label mapping (only if `triage` is installed)
- [domain.md](references/domain.md): domain doc reading rules and layout

For an "other" issue tracker, write `docs/agents/issue-tracker.md` from the user's description.

### 5. Done

Tell the user that setup is complete, and name the engineering skills that now read these files. Tell them they can edit `docs/agents/*.md` later. They need to run this skill again only to change issue trackers or to start again.
