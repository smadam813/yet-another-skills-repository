---
name: receiving-code-review
description: "Use when you receive code review feedback — a PR review, inline comments, or notes from the user — before you implement any of it."
---

Every review comment is a **claim** about the code. A claim holds until you check it against the codebase. Your job is to check it, not to agree with it.

## The loop

1. **Read the whole review** before you change anything.
2. **Restate each claim** in your own words. When you cannot, ask.
3. **Check the claim** against the code: does the problem occur, and does the fix work here?
4. **Answer** the claim: implement it, or say why it is wrong.
5. **Fix one item at a time** and test each one.

## Ask before you start

When any item is unclear, ask about it before you implement any of them. The items relate to each other, so a partial reading produces the wrong fix. Ask about every unclear item in one message, then work the whole list.

> "I understand items 1, 2, 3, and 6. Explain 4 and 5 before I start."

## Checking a claim

Check every claim against this codebase, whoever wrote it:

- Does the problem the reviewer describes actually occur?
- Does the current code work this way for a reason? Read the history.
- Does the suggested fix break something that passes today?
- Does it hold on every platform and version the project supports?
- Does the reviewer have the context you have?

Trust the user's claims further: implement them once you understand the scope. Check a claim from anyone else first. When you cannot check one, say so and name what you need: "I cannot confirm this without a Windows runner. Should I investigate, or take it on trust?"

When a claim contradicts a decision the user has already made, raise it with the user before you change the code.

## YAGNI

When a reviewer asks you to "implement this properly", grep for callers first. When nothing calls it, propose deleting it instead: "Nothing calls this endpoint. Remove it?" You and the reviewer both work for the user, and a feature the project does not need stays unbuilt.

## Order of work

1. Clarify every unclear item.
2. Fix what blocks: crashes, data loss, security.
3. Fix what is small: typos, imports, names.
4. Fix what is large: logic, refactors.
5. Run the tests after each fix, and run the whole suite at the end.

## Push back

Push back when the claim breaks working code, misses context, adds an unused feature, is wrong for this stack, ignores a compatibility constraint, or contradicts the user's architecture. Argue from the code: name the file, the test, the build target, the version. Ask a specific question. Take an architectural disagreement to the user.

When pushing back feels uncomfortable, say that to the user and describe what you found anyway. The user wants the finding.

## What to write

Answer with the technical content:

- "Fixed. The loop now closes the file handle before it returns."
- "Checked: the build targets 10.15 and this API needs 13, so the legacy path stays. Its bundle ID is wrong though. Fix that, or drop support below 13?"
- The commit itself.

Praise and thanks report nothing about the code. Open with what you checked and what you changed instead. "You're absolutely right" claims agreement you have not yet earned, so never open with it.

When you pushed back and the check proved you wrong, say so in one line and carry on: "Checked, and you are right: `readFile` does throw on an empty path. Fixing." No apology, and no defense of the original pushback.

## GitHub

Reply to an inline review comment inside its own thread:

```
gh api repos/{owner}/{repo}/pulls/{pr}/comments/{id}/replies
```

A top-level PR comment loses the thread.
