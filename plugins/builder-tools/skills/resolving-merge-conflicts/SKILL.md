---
name: resolving-merge-conflicts
description: "Use when you need to resolve an in-progress git merge/rebase conflict."
license: MIT
metadata:
  vendored: modified
  upstream_source: https://github.com/mattpocock/skills
  upstream_path: skills/engineering/resolving-merge-conflicts/SKILL.md
  upstream_author: Matt Pocock
  upstream_copyright: Copyright (c) 2026 Matt Pocock
  upstream_license: MIT
  local_changes: >-
    Prose edited for plain English per the /orwell-writing skill: American
    spelling and direct instructions. The five steps are unchanged in
    substance.
  note: >-
    See NOTICE at the repository root.
---

1. **See the current state** of the merge or rebase. Check the git history and the conflicting files.

2. **Find the primary sources** for each conflict. Work out why each change was made and what the original intent was. Read the commit messages, check the PRs, check the original issues or tickets.

3. **Resolve each hunk.** Preserve both intents where you can. Where they are incompatible, pick the one that matches the merge's stated goal and note the trade-off. Do **not** invent new behavior. Always resolve. Never use `--abort`.

4. Find the project's **automated checks** and run them — usually typecheck, then tests, then format. Fix anything the merge broke.

5. **Finish the merge or rebase.** Stage everything and commit. If you are rebasing, continue until every commit is rebased.
