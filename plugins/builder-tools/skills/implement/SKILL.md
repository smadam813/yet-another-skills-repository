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
    skill.
  note: >-
    See NOTICE at the repository root.
---

Implement the work described by the user in the spec or tickets.

Use /tdd where possible, at pre-agreed seams.

Run typechecking regularly, single test files regularly, and the full test suite once at the end.

Once done, use /review-changes to review the work.

Commit your work to the current branch.
