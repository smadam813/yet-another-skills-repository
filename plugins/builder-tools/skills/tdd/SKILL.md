---
name: tdd
description: Test-driven development. Use when the user wants to build features or fix bugs test-first, mentions "red-green-refactor", or wants integration tests.
license: MIT
metadata:
  vendored: modified
  upstream_source: https://github.com/mattpocock/skills
  upstream_path: skills/engineering/tdd/SKILL.md
  upstream_author: Matt Pocock
  upstream_copyright: Copyright (c) 2026 Matt Pocock
  upstream_license: MIT
  local_changes: >-
    Supporting-file links made explicitly relative; refactoring note
    retargeted to the /review-changes skill. Prose edited for plain English
    per the /orwell-writing skill: shorter sentences and active voice. The
    seam definition now says "public interface" rather than "public
    boundary", so it agrees with the /codebase-design glossary, which
    reserves "boundary" for DDD's bounded context.
  note: >-
    See NOTICE at the repository root.
---

# Test-Driven Development

TDD is the red → green loop. This skill is the reference that makes the loop produce tests worth keeping: what a good test is, where tests go, the anti-patterns, and the rules of the loop. Every section applies on every cycle. Consult them before and during the loop, not after.

When you explore the codebase, read `CONTEXT.md` if it exists, so test names and interface vocabulary match the project's domain language. Respect the ADRs in the area you are touching.

## What a good test is

Tests verify behavior through public interfaces, not through implementation details. The code can change entirely and the tests should not. A good test reads like a specification — "user can checkout with valid cart" tells you exactly what capability exists — and it survives refactors because it does not care about internal structure.

See [tests.md](./tests.md) for examples and [mocking.md](./mocking.md) for mocking guidelines.

## Seams — where tests go

A **seam** is the public interface you test at: the place where you observe behavior without reaching inside. Tests live at seams, never against internals.

**Test only at seams agreed in advance.** Before you write any test, write down the seams under test and confirm them with the user. Write no test at an unconfirmed seam. You cannot test everything. Agreeing the seams up front is how testing effort lands on the critical paths and the complex logic, instead of on every edge case.

Ask: "What's the public interface, and which seams should we test?"

When the shape of that interface is itself in question — how deep the module is, where the seam belongs, what the interface should expose — use the `/codebase-design` skill for the vocabulary. It is the shared source of the module, interface, depth, seam, adapter, leverage, and locality terms. Consult it as a reference; do not run it as a session.

## Anti-patterns

- **Implementation-coupled** — the test mocks internal collaborators, tests private methods, or verifies through a side channel, such as querying the database instead of using the interface. The tell: the test breaks when you refactor, but the behavior has not changed.
- **Tautological** — the assertion recomputes the expected value the way the code does. Examples: `expect(add(a, b)).toBe(a + b)`, a snapshot derived by hand the same way, or a constant asserted equal to itself. The test passes by construction and can never disagree with the code. Expected values must come from an independent source of truth: a known-good literal, a worked example, or the spec.
- **Horizontal slicing** — writing all the tests first, then all the implementation. Bulk tests verify _imagined_ behavior. You test the _shape_ of things rather than user-facing behavior, the tests stop reacting to real changes, and you commit to a test structure before you understand the implementation. Work in **vertical slices** instead: one test, one implementation, repeat. Each test is a **tracer bullet** that responds to what the last cycle taught you.

## Rules of the loop

- **Red before green.** Write the failing test first, then only enough code to pass it. Do not anticipate future tests or add speculative features.
- **One slice at a time.** One seam, one test, one minimal implementation per cycle.
- **Refactoring is not part of the loop.** It belongs to the review stage — see the `review-changes` skill — not to the red → green implementation cycle.
