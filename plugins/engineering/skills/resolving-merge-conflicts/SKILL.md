---
name: resolving-merge-conflicts
description: "Use when you need to resolve an in-progress git merge/rebase conflict."
---

1. **See the current state** of the merge/rebase. Check the git history and the conflicting files.

2. **Find the primary sources** for each conflict. Work out why each change was made and what it was meant to do. Read the commit messages, the PRs, and the original issues or tickets.

3. **Resolve each hunk.** Preserve both intents where possible. Where they are incompatible, pick the one that matches the merge's stated goal and note the trade-off. Do **not** invent new behavior. Always resolve; never `--abort`.

4. **Find the project's automated checks** and run them: typecheck, then tests, then format. Fix anything the merge broke.

5. **Finish the merge/rebase.** Stage everything and commit. If you are rebasing, repeat these steps until every commit is applied.
