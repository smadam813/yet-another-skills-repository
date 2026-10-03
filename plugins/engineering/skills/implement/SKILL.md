---
name: implement
description: "Implement a piece of work based on a spec or set of tickets."
disable-model-invocation: true
---

Implement the work described in the spec or tickets.

If no spec or ticket exists, write the scope and the seams you agreed with the user to a scratch file outside the repo, such as your scratchpad directory. Use that file as the spec.

Before you start, record the fixed point: note the current commit (`git rev-parse HEAD`) and the path or id of the spec or ticket you are building from.

Use /tdd where you can, at pre-agreed seams.

Run typechecking and single test files as you go. Run the full test suite once at the end.

When the work is done, commit to the current branch.

Then run /review-changes, naming the recorded commit as the fixed point and the spec or ticket as the spec source. It reports findings and changes no code.

Check each finding against the code, as `receiving-code-review` describes. Fix the findings you accept, then commit.
