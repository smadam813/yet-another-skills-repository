---
name: review-changes
description: "Review the changes since a fixed point (commit, branch, tag, or merge-base) along three axes: Standards (does the code follow this repo's documented coding standards?), Spec (does the code match what the originating issue/spec asked for?), and Style (does the diff follow the agent-behavior rules in CLAUDE.md or AGENTS.md?). Runs all three reviews in parallel subagents and reports them side by side. Use when the user wants to review a branch, a PR, work-in-progress changes, or asks to \"review since X\"."
---

Three-axis review of the diff between `HEAD` and a fixed point the user supplies:

- **Standards**: does the code follow this repo's documented coding standards?
- **Spec**: does the code faithfully implement the originating issue or spec?
- **Style**: does the diff follow the agent-behavior rules in CLAUDE.md or AGENTS.md?

Each axis runs as its own **parallel subagent**, so none of them sees another's context. This skill then combines their findings.

You should already have the issue tracker workflow. If `docs/agents/issue-tracker.md` is missing, tell the user to run `/setup-builder-skills`.

## Process

### 1. Pin the fixed point

Whatever the user names is the fixed point: a commit SHA, a branch name, a tag, `main`, `HEAD~5`. If they name nothing, ask for it.

Write the diff command once: `git diff <fixed-point>...HEAD` (three-dot, so the comparison runs against the merge-base). Also list the commits with `git log <fixed-point>..HEAD --oneline`.

Before you go further, confirm that the fixed point resolves (`git rev-parse <fixed-point>`) and that the diff is not empty. A bad ref or an empty diff must fail here, not inside two parallel subagents.

### 2. Identify the spec source

Look for the originating spec, in this order:

1. Issue references in the commit messages (`#123`, `Closes #45`, GitLab `!67`). Fetch them with the workflow in `docs/agents/issue-tracker.md`.
2. A path the user passed as an argument.
3. A spec file under `docs/`, `specs/`, or `.scratch/` that matches the branch name or the feature.
4. If you find nothing, ask the user where the spec is. If they say there is no spec, the **Spec** subagent skips its review and reports "no spec available".

### 3. Identify the standards sources

Anything in the repo that documents how to write code, such as `CODING_STANDARDS.md` or `CONTRIBUTING.md`.

On top of whatever the repo documents, the Standards axis always carries the **smell baseline** below: a fixed set of Fowler code smells (_Refactoring_, ch.3) that applies even when a repo documents nothing. Two rules apply:

- **The repo overrides.** A documented repo standard always wins. If it endorses something the baseline would flag, drop the smell.
- **Always a judgment call.** Each smell is a label you propose ("possible Feature Envy"), never a hard violation. As with any standard here, skip anything tooling already enforces.

Each smell below reads *what it is* → *how to fix it*. Match each one against the diff:

- **Mysterious Name**: a function, variable, or type whose name does not reveal what it does or holds. → rename it; if no honest name comes, the design is unclear.
- **Duplicated Code**: the same logic shape appears in more than one hunk or file in the change. → extract the shared shape, call it from both.
- **Feature Envy**: a method that reaches into another object's data more than its own. → move the method onto the data it envies.
- **Data Clumps**: the same few fields or parameters keep traveling together. → bundle them into one type, pass that.
- **Primitive Obsession**: a primitive or string standing in for a domain concept that deserves its own type. → give the concept its own small type.
- **Repeated Switches**: the same `switch` or `if`-cascade on the same type recurs across the change. → replace it with polymorphism, or with one map that both sites share.
- **Shotgun Surgery**: one logical change forces scattered edits across many files in the diff. → gather what changes together into one module.
- **Divergent Change**: one file or module is edited for several unrelated reasons. → split it, so each module changes for one reason.
- **Speculative Generality**: abstraction, parameters, or hooks added for needs the spec does not have. → delete it; inline it back until a real need appears.
- **Message Chains**: long `a.b().c().d()` navigation the caller should not depend on. → hide the chain behind one method on the first object.
- **Middle Man**: a class or function that mostly delegates onward. → cut it, call the real target directly.
- **Refused Bequest**: a subclass or implementer that ignores or overrides most of what it inherits. → drop the inheritance, use composition.

### 4. Identify the CLAUDE.md or AGENTS.md agent-behavior rules

Look for a `CLAUDE.md` in the repo root, in any directory the diff touches, and in every directory between the two. Where a directory has none, look for an `AGENTS.md` there instead. A directory with both uses its `CLAUDE.md` and ignores its `AGENTS.md`.

Pull the section that governs how the agent writes or behaves from each file you find this way. This repo's `CLAUDE.md` calls it "Agent behaviors". Another repo may name or shape it differently. If you find no such file, or none of them has this content, the **Style** subagent skips its review. It reports "no agent-behavior rules documented".

### 5. Spawn all three subagents in parallel

Include in the **Standards subagent** prompt:

- The full diff command and the commit list.
- The standards-source files you found in step 3, plus **the smell baseline from step 3 pasted in full**: the subagent cannot see it otherwise.
- The brief: "Report, per file or hunk where relevant, (a) every place the diff breaks a documented standard — cite the standard by file and rule; and (b) every baseline smell you spot — name it and quote the hunk. Separate hard violations from judgment calls: a broken documented standard can be hard, but a baseline smell is always a judgment call, and a documented repo standard overrides the baseline. Skip anything tooling enforces. Under 400 words."

Include in the **Spec subagent** prompt:

- The diff command and the commit list.
- The path to the spec, or the spec contents you fetched.
- The brief: "Report (a) requirements the spec asked for that are missing or partial; (b) behavior in the diff that nobody asked for (scope creep); and (c) requirements that look implemented but where the code looks wrong. Quote the spec line for each finding. Under 400 words."

If there is no spec, skip the Spec subagent and say so in the final report.

Include in the **Style subagent** prompt:

- The diff command and the commit list.
- The agent-behavior sections you found in step 4, pasted in full, one per source file: the subagent cannot see them otherwise.
- The brief: "Report every place the diff's prose — comments, docs, commit messages, whatever the pasted rules govern — breaks a stated rule. Cite the rule and the file it came from. Each of these rules is explicit and documented. Treat every finding as a violation, not a judgment call. Under 400 words."

If there is no agent-behavior content to check, skip the Style subagent and say so in the final report.

### 6. Aggregate

Present the three reports under `## Standards`, `## Spec`, and `## Style` headings, either word for word or lightly cleaned. Do **not** merge or rerank the findings. The three axes are deliberately separate (see _Why three axes_).

End with a one-line summary: the number of findings per axis, and the worst issue _within each axis_, if there is one. Do not pick one winner across the axes; that is the reranking this separation prevents.

## Why three axes

A change can pass one axis and fail another:

- Code that follows every standard but implements the wrong thing → **Standards pass, Spec fail.**
- Code that does exactly what the issue asked but breaks the project's conventions → **Spec pass, Standards fail.**
- Code that passes both but writes a comment the repo's agent-behavior rules forbid → **Standards and Spec pass, Style fail.**

Reporting them separately stops one axis from masking another.
