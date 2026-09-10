---
name: new-skill
description: Scaffold a skill inside a plugin, index it, and validate.
argument-hint: "<plugin> <skill-name> [what the skill does]"
disable-model-invocation: true
---

Arguments: `$ARGUMENTS`, as `<plugin> <skill-name> [purpose]`. Ask for whatever is missing.

1. Settle invocation with the user. Default to user-invoked (`disable-model-invocation: true`, one-line human-facing description). Go model-invoked only when the agent or another skill must reach it on its own, and then write the "Use when ..." branches into the description.
2. Create `plugins/<plugin>/skills/<skill-name>/SKILL.md`. Frontmatter: `name` equal to the directory name, `description` (quoted when it contains a colon), and the invocation field. The body starts at its first real sentence, with no H1.
3. Add the skill to `plugins/<plugin>/README.md` in alphabetical position, in the existing entry format.
4. A user-invoked engineering skill also goes into `plugins/engineering/skills/ask-builder/SKILL.md`, the router a human reads to find it. Place it in the section it belongs to, usually Standalone, with one line on when to reach for it.
5. Run `node scripts/check-marketplace.mjs` and `npx markdownlint-cli2`. Done when both report 0 errors.
6. Commit the skill, the README line, and any router edit together, subject `Add the <skill-name> skill to the <plugin> plugin`. Then invoke `bump-plugin-version` with a minor bump; it commits the manifests on their own, so the bump stays a separate commit.
