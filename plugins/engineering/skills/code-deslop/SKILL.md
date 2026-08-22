---
name: code-deslop
description: "Remove AI-generated slop from the branch diff and match the surrounding code style. Use when a branch reads like an AI wrote it: redundant comments, defensive scaffolding, or naming that does not match the repo."
---

# Remove AI slop

Read the diff against main. Remove the AI slop the branch introduced. Slop is code that works but does not match how the rest of the codebase is written.

## What to remove

- Comments that state what the code already says, or that break the comment style of the file.
- Defensive checks and `try`/`catch` blocks on code paths the codebase already trusts.
- Casts to `any` that exist only to silence the type checker.
- Deep nesting. Flatten it with early returns.
- Anything else that does not match the file or the code around it.

## Guardrails

- Do not change behavior unless you are fixing a clear bug.
- Make small, focused edits. Do not rewrite whole files.
- Keep the final summary to 1-3 sentences.
