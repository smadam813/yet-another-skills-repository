---
name: tdd
description: Test-driven development. Use when the user wants to build features test-first, fix a bug whose cause is already understood, mentions "red-green-refactor", or wants integration tests. When something is broken and the cause is still unknown, use `diagnosing-bugs` instead.
---

TDD is the red → green → refactor loop. This skill covers what makes that loop produce tests worth keeping: what a good test is, where tests go, the anti-patterns, and the rules of the loop. Every section applies on every cycle. Read them before and during the loop, not after.

When you explore the codebase, read `CONTEXT.md` if it exists, so that test names and interface vocabulary match the project's domain language. Respect the ADRs in the area you touch.

## What a good test is

Tests verify behavior through public interfaces, not implementation details. The code can change entirely; the tests should not. A good test reads like a specification: "user can checkout with valid cart" tells you what capability exists, and it survives refactors because it does not care about internal structure.

See [tests.md](references/tests.md) for examples and [mocking.md](references/mocking.md) for mocking guidelines.

## Seams: where tests go

A **seam** is the public boundary you test at: the interface where you observe behavior without reaching inside. Tests live at seams, never against internals.

**Test only at pre-agreed seams.** Before you write any test, write down the seams under test and confirm them with the user. Write no test at an unconfirmed seam. You cannot test everything, so agreeing the seams up front is what puts the effort on the critical paths and the complex logic instead of on every edge case.

Ask: "What is the public interface, and which seams should we test?"

When the shape of that interface is itself in question — how deep the module is, where the seam belongs, what the interface should expose — call the Skill tool with "codebase-design" for the vocabulary. It defines the module, interface, depth, seam, adapter, leverage, and locality terms. Consult it as a reference; do not run it as a session.

## Anti-patterns

- **Implementation-coupled**: the test mocks internal collaborators, tests private methods, or verifies through a side channel, such as querying the database instead of using the interface. The tell: the test breaks when you refactor, but the behavior has not changed.
- **Tautological**: the assertion recomputes the expected value the way the code does (`expect(add(a, b)).toBe(a + b)`, a snapshot derived by hand the same way, a constant asserted equal to itself), so it passes by construction and can never disagree with the code. Expected values must come from an independent source of truth: a known-good literal, a worked example, the spec.
- **Horizontal slicing**: writing all the tests first, then all the implementation. Bulk tests verify _imagined_ behavior. You test the _shape_ of things instead of user-facing behavior, the tests stop responding to real changes, and you commit to a test structure before you understand the implementation. Work in **vertical slices** instead: one test → one implementation → repeat, each test a **tracer bullet** shaped by what the last cycle taught you.

## Rules of the loop

- **Red before green.** Write the failing test first, then only enough code to pass it. Do not anticipate future tests or add speculative features.
- **One slice at a time.** One seam, one test, one minimal implementation per cycle.
- **Refactor on green.** Once the test passes, clean up the code and the test while the loop stays green, then start the next slice.
