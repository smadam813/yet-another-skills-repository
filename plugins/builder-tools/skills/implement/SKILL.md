---
name: implement
description: "Implement a piece of work based on a spec or set of tickets."
disable-model-invocation: true
license: MIT
metadata:
  vendored: modified
  upstream_source: https://github.com/mattpocock/skills
  upstream_path: skills/engineering/implement/SKILL.md
  upstream_author: Matt Pocock
  upstream_copyright: Copyright (c) 2026 Matt Pocock
  upstream_license: MIT
  local_changes: >-
    Points at /review-changes, this plugin's name for upstream's code-review
    skill. Prose edited for plain English per the /orwell-writing skill:
    active voice and direct instructions.
  note: >-
    See NOTICE at the repository root.
---

Build the work the user described in the spec or tickets.

Use `/tdd` where you can, at seams agreed in advance.

Run the typechecker often. Run single test files often. Run the full test suite once, at the end.

When the work is done, use `/review-changes` to review it.

Commit your work to the current branch.
