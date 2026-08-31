---
name: implement
description: "Implement a piece of work based on a spec or set of tickets."
disable-model-invocation: true
---

Implement the work described in the spec or tickets.

Before you start, record the fixed point: note the current commit (`git rev-parse HEAD`) and the path or id of the spec or ticket you are building from.

Use /tdd where you can, at pre-agreed seams.

Run typechecking and single test files as you go. Run the full test suite once at the end.

When the work is done, commit to the current branch.

Then run /review-changes, naming the recorded commit as the fixed point and the spec or ticket as the spec source. Commit any fixes it produces.
