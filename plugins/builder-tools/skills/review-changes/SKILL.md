---
name: review-changes
description: Review the changes since a fixed point (commit, branch, tag, or merge-base) along two axes — Standards (does the code follow this repo's documented coding standards?) and Spec (does the code match what the originating issue/spec asked for?). Runs both reviews in parallel sub-agents and reports them side by side. Use when the user wants to review a branch, a PR, work-in-progress changes, or asks to "review since X".
license: MIT
metadata:
  vendored: modified
  upstream_source: https://github.com/mattpocock/skills
  upstream_path: skills/engineering/code-review/SKILL.md
  upstream_author: Matt Pocock
  upstream_copyright: Copyright (c) 2026 Matt Pocock
  upstream_license: MIT
  local_changes: >-
    Renamed from upstream's code-review. Setup reference retargeted to
    /setup-builder-tools; GitLab merge-request example dropped. Prose edited
    for plain English per the /orwell-writing skill: American spelling,
    active voice, shorter sentences. Fowler's smell names and the git
    commands are unchanged.
  note: >-
    See NOTICE at the repository root.
---

Review the diff between `HEAD` and a fixed point the user supplies, along two axes:

- **Standards** — does the code follow this repo's documented coding standards?
- **Spec** — does the code faithfully implement the originating issue or spec?

Run both axes as **parallel sub-agents**, so neither one's context affects the other. This skill then aggregates their findings.

You should already have the issue tracker configuration. Run `/setup-builder-tools` if `docs/agents/issue-tracker.md` is missing.

## Process

### 1. Pin the fixed point

The fixed point is whatever the user said: a commit SHA, a branch name, a tag, `main`, `HEAD~5`, and so on. If they did not name one, ask for it.

Capture the diff command once: `git diff <fixed-point>...HEAD`. Use three dots, so the comparison runs against the merge-base. Also note the list of commits: `git log <fixed-point>..HEAD --oneline`.

Before you go further, confirm that the fixed point resolves (`git rev-parse <fixed-point>`) and that the diff is not empty. Fail here on a bad ref or an empty diff, not inside two parallel sub-agents.

### 2. Identify the spec source

Look for the originating spec, in this order:

1. Issue references in the commit messages (`#123`, `Closes #45`). Fetch them via the workflow in `docs/agents/issue-tracker.md`.
2. A path the user passed as an argument.
3. A spec file under `docs/`, `specs/`, or `.scratch/` that matches the branch name or the feature.
4. If you find nothing, ask the user where the spec is. If they say there is none, the **Spec** sub-agent skips and reports "no spec available".

### 3. Identify the standards sources

Use anything in the repo that documents how code should be written, such as `CODING_STANDARDS.md` or `CONTRIBUTING.md`.

On top of whatever the repo documents, the Standards axis always carries the **smell baseline** below: a fixed set of Fowler code smells (_Refactoring_, ch.3) that applies even when a repo documents nothing. Two rules govern it:

- **The repo overrides.** A documented repo standard always wins. Where it endorses something the baseline would flag, suppress the smell.
- **Always a judgment call.** Each smell is a labeled heuristic ("possible Feature Envy"), never a hard violation. As with any standard here, skip anything the tooling already enforces.

Each smell reads *what it is* → *how to fix it*. Match each one against the diff:

- **Mysterious Name** — a function, variable, or type whose name does not reveal what it does or holds. → rename it. If no honest name comes, the design is murky.
- **Duplicated Code** — the same logic shape appears in more than one hunk or file in the change. → extract the shared shape and call it from both.
- **Feature Envy** — a method that reaches into another object's data more than its own. → move the method onto the data it envies.
- **Data Clumps** — the same few fields or params keep traveling together, which means they are asking to be one type. → bundle them into a single type and pass that.
- **Primitive Obsession** — a primitive or string standing in for a domain concept that deserves its own type. → give the concept its own small type.
- **Repeated Switches** — the same `switch` or `if`-cascade on the same type recurs across the change. → replace it with polymorphism, or with one map that both sites share.
- **Shotgun Surgery** — one logical change forces scattered edits across many files in the diff. → gather what changes together into one module.
- **Divergent Change** — one file or module is edited for several unrelated reasons. → split it, so each module changes for one reason.
- **Speculative Generality** — abstraction, parameters, or hooks added for needs the spec does not have. → delete it. Inline it back until a real need appears.
- **Message Chains** — long `a.b().c().d()` navigation that the caller should not depend on. → hide the walk behind one method on the first object.
- **Middle Man** — a class or function that mostly delegates onward. → cut it and call the real target directly.
- **Refused Bequest** — a subclass or implementer that ignores or overrides most of what it inherits. → drop the inheritance and use composition.

### 4. Start both sub-agents in parallel

**Standards sub-agent prompt** — include:

- The full diff command and the commit list.
- The list of standards-source files you found in step 3, **plus the smell baseline from step 3 pasted in full**. The sub-agent has no other access to it.
- The brief: "Report — per file or hunk where relevant — (a) every place the diff breaks a documented standard: cite the standard, giving the file and the rule; and (b) any baseline smell you spot: name it and quote the hunk. Distinguish hard violations from judgment calls. A documented-standard breach can be hard; baseline smells are always judgment calls, and a documented repo standard overrides the baseline. Skip anything the tooling enforces. Under 400 words."

**Spec sub-agent prompt** — include:

- The diff command and the commit list.
- The path to the spec, or its fetched contents.
- The brief: "Report (a) requirements the spec asked for that are missing or partial; (b) behavior in the diff that nobody asked for, meaning scope creep; and (c) requirements that look implemented but where the implementation looks wrong. Quote the spec line for each finding. Under 400 words."

If the spec is missing, skip the Spec sub-agent and say so in the final report.

### 5. Aggregate

Present the two reports under `## Standards` and `## Spec` headings, verbatim or lightly cleaned. Do **not** merge or rerank the findings. The two axes are deliberately separate — see _Why two axes_.

End with a one-line summary: the total findings per axis, and the worst issue _within each axis_, if there is one. Do not pick a single winner across axes. That is the reranking the separation exists to prevent.

## Why two axes

A change can pass one axis and fail the other:

- Code that follows every standard but implements the wrong thing → **Standards pass, Spec fail.**
- Code that does exactly what the issue asked but breaks the project's conventions → **Spec pass, Standards fail.**

Reporting them separately stops one axis from masking the other.
