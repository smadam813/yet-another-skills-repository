## What this repo is

A Claude Code **plugin marketplace**. There is no application code, no build step, and
no test suite. Every file that ships is either a manifest (JSON) or a skill body
(Markdown) that Claude reads at runtime.

## Commands

Validation is the only build-like step. Run both commands before you push:

```
claude plugin validate .
claude plugin validate ./plugins/builder-tools --strict
```

Try a change without installing the marketplace:

```
claude --plugin-dir ./plugins/builder-tools
```

## Structure

`marketplace.json` and `plugin.json` both carry `description`, `license`, and `keywords`.
Change one, change the other. `README.md` lists every skill twice: once in the skill table
and once in the credits table. To add or rename a skill, edit `README.md`, `NOTICE`, and
the frontmatter.

## Skill conventions

**Frontmatter.** `name` and `description` are required. Claude reads `description` to
decide whether to fire the skill, so `description` must name the situations that should
trigger it, not just what the skill does.

**Invocation mode.** `disable-model-invocation: true` makes a skill slash-only: the model
will not fire it on its own. Eight skills set it, and all eight have side effects
(`to-spec`, `to-tickets`, `triage`, `wayfinder`, `implement`, `setup-builder-tools`,
`improve-codebase-architecture`, `grill-with-docs`). The other skills are safe to enter
unasked. Keep that split when you add a skill.

**Progressive disclosure.** Keep SKILL.md short. Link to sibling files with relative
Markdown links (`[tests.md](./tests.md)`). A linked file stays out of context until the
skill follows the link, so put the detail there, not in SKILL.md.

## Provenance — the main constraint here

Most skills come from other MIT-licensed repos. Three places must agree for every
vendored skill:

1. The `metadata` block in its SKILL.md frontmatter: `vendored: verbatim|modified`,
   `upstream_source`, `upstream_path`, `upstream_author`, `upstream_copyright`,
   `upstream_license`, and `local_changes` when modified.
2. The verbatim and modified lists in `NOTICE`.
3. The credits table in `README.md`.

`vendored: verbatim` claims that the body is byte-for-byte identical to upstream. If you
edit such a body, change the field to `modified` and write `local_changes`. Do not edit
one silently.

The upstream authors tuned `receiving-code-review` (from obra/superpowers) against evals,
which are scored test runs that measure how well a model follows the skill. Do not change
its wording without evidence.

## Per-repo configuration the skills read

Five skills (`to-spec`, `to-tickets`, `triage`, `wayfinder`, `review-changes`) read config
from `docs/agents/` **in the user's repo**, not in this one:

- `docs/agents/issue-tracker.md` — GitHub, local-markdown, or freeform
- `docs/agents/triage-labels.md` — the five triage role labels
- `docs/agents/domain.md` — where `CONTEXT.md` and the ADRs live

`setup-builder-tools` writes those files from the seed templates that sit beside it in its
own skill folder. If you change the shape of a config file, change the seed template and
every skill that reads it.
