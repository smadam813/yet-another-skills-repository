---
name: implement-spec
description: "Implement the result of /to-spec and /to-tickets in code, in one run."
disable-model-invocation: true
---

You have a spec, and the spec has tickets that describe how to implement it.

You need the issue tracker. If you do not have it, tell the user to run `/setup-builder-skills`.

The goal is the whole spec implemented on one **integration branch**, with every ticket resolved the way the issue tracker closes work.

The tickets are not a list of steps. They are a **task graph** with blocking edges between them, so there is always a **frontier** of tickets that are ready to start.

Keep communication to and from subagents sparse. Communicate through **context pointers**: to the spec, the tickets, the research notes, and earlier commits. Do not copy information that a pointer already reaches.

Run **implementer subagents** in the background where you can, for maximum concurrency.

## Steps

1. Read the spec and the tickets to learn the task graph.

2. (Optional) Use an **exploration subagent** for any exploration the tickets need: codebase files or external docs. The exploration subagent saves its Markdown notes in a directory outside the repo that every later subagent can read. The implementer subagents can then focus on implementation, not exploration.

3. Create the integration branch, and record its base commit (`git rev-parse HEAD`). This is the fixed point for the review in step 7. If the issue tracker closes work through PRs, or the user asks for one, open a draft PR after the first merge in step 5, marked as closing the spec and the tickets. A branch with no commits ahead of main cannot open one.

4. Use **implementer subagents** to implement each ticket, each in its own worktree on its own branch. Each implementer subagent:
   - confirms its worktree is based on the integration branch before it starts, and resets onto it if not;
   - calls the Skill tool with "tdd" to build the ticket, using the seams the ticket records;
   - merges the integration branch tip into its own branch before it reports done.

5. When an implementer subagent completes, merge its work into the integration branch with a **merger subagent**.

6. If the merge changes the frontier, start more implementer subagents on the new tickets.

7. When all tickets are complete, call the Skill tool with "review-changes" on the integration branch. Name the base commit from step 3 as the fixed point and the spec as the spec source. Review-changes reports findings and changes no code.

8. Check each finding against the code, as `receiving-code-review` describes. Fix the findings you accept in one implementer subagent, and merge its work.

9. If a draft PR exists, mark it ready for review. Otherwise, resolve each ticket the way the issue tracker closes work, and report the integration branch.

10. Remove every implementer subagent worktree.
