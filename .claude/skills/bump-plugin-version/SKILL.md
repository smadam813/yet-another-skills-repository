---
name: bump-plugin-version
description: Bump a plugin's version in both of its plugin.json manifests. Use after a skill under plugins/<plugin>/skills is added, removed, or edited on a branch, before the PR opens.
---

Bump the version of every plugin whose skills changed on this branch. When the user names a plugin or a size, use that instead of deciding.

1. Find the changed plugins: `git diff --name-only main -- plugins`. Skip a plugin whose `version` already differs from `main` on this branch.
2. Pick the size per plugin: **minor** when a skill directory was added or removed, **patch** when only existing skills changed.
3. Set `version` to the same new value in `plugins/<plugin>/.claude-plugin/plugin.json` and `plugins/<plugin>/.cursor-plugin/plugin.json`.
4. Run `node scripts/check-marketplace.mjs`. Done when it reports 0 errors.
5. Commit those two files alone, subject `Bump <plugin> plugin to <version>`. Leave pushing to the user.
