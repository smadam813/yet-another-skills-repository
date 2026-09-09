---
name: new-skill
description: Scaffold a skill inside a plugin, index it in the plugin README, and validate.
argument-hint: "<plugin> <skill-name> [what the skill does]"
disable-model-invocation: true
---

Arguments: `$ARGUMENTS`, as `<plugin> <skill-name> [purpose]`. Ask for whatever is missing.

1. Read `plugins/productivity/skills/writing-for-agents/SKILL.md` and its `references/SKILL-MECHANICS.md`.
2. Settle invocation with the user. Default to user-invoked (`disable-model-invocation: true`, one-line human-facing description). Go model-invoked only when the agent or another skill must reach it on its own, and then write the "Use when ..." branches into the description.
3. Create `plugins/<plugin>/skills/<skill-name>/SKILL.md`. Frontmatter: `name` equal to the directory name, `description` (quoted when it contains a colon), and the invocation field. The body starts at its first real sentence, with no H1.
4. Add the skill to `plugins/<plugin>/README.md` in alphabetical position, in the existing entry format.
5. Run `node scripts/check-marketplace.mjs`. Done when it reports 0 errors and 0 warnings.
6. Invoke `bump-plugin-version` with a minor bump for the plugin.
