## What this repo is

A Claude Code **plugin marketplace**. There is no application code, no build step, and
no test suite — the deliverable is Markdown. Every file that ships is either a manifest
(JSON) or a skill body (Markdown) that Claude reads at runtime.

## Commands

Validation is the only build-like step. Run both before pushing:

```
claude plugin validate .
claude plugin validate ./plugins/builder-tools --strict
```

Try a change without installing the marketplace:

```
claude --plugin-dir ./plugins/builder-tools
```

## Structure

`marketplace.json` and `plugin.json` duplicate `description`, `license`, and `keywords`.
Change one, change the other. `README.md` also lists every skill in a table and a credits
table — adding or renaming a skill means editing README, NOTICE, and the frontmatter.

## Skill conventions

**Frontmatter.** `name` and `description` are required. `description` is what Claude
matches against to decide whether to fire the skill, so it should name the situations
that should trigger it, not just what the skill does.

**Invocation mode.** `disable-model-invocation: true` makes a skill slash-only — the
model will not fire it on its own. Eight skills use it: the ones with side effects
(`to-spec`, `to-tickets`, `triage`, `wayfinder`, `implement`, `setup-builder-tools`,
`improve-codebase-architecture`, `grill-with-docs`). Auto-invocable skills are the ones
that are safe to enter unasked. Keep that split when adding a skill.

**Progressive disclosure.** SKILL.md stays short and links to siblings with relative
Markdown links (`[tests.md](./tests.md)`). The linked file is not in context until the
skill follows the link, so put detail there, not in SKILL.md.

## Provenance — the main constraint here

Most skills are vendored from other MIT-licensed repos. Three places must agree for
every vendored skill:

1. `metadata` in its SKILL.md frontmatter — `vendored: verbatim|modified`,
   `upstream_source`, `upstream_path`, `upstream_author`, `upstream_copyright`,
   `upstream_license`, and `local_changes` when modified.
2. The verbatim/modified lists in `NOTICE`.
3. The credits table in `README.md`.

`vendored: verbatim` is a claim that the body is byte-identical to upstream. Editing
such a body means flipping it to `modified` and writing `local_changes` — do not edit
one silently.

`receiving-code-review` (from obra/superpowers) is eval-tuned upstream. Its wording
should not change without evidence.

## Per-repo configuration the skills read

Five skills (`to-spec`, `to-tickets`, `triage`, `wayfinder`, `review-changes`) read
config from `docs/agents/` **in the user's repo**, not this one:

- `docs/agents/issue-tracker.md` — GitHub / local-markdown / freeform
- `docs/agents/triage-labels.md` — the five triage role labels
- `docs/agents/domain.md` — where `CONTEXT.md` and ADRs live

`setup-builder-tools` writes those files from the seed templates that sit beside it in
its own skill folder. If you change a config file's shape, change the seed template and
every skill that reads it.
