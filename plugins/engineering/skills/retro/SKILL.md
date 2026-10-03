---
name: retro
description: "Run a retrospective on a coding session and suggest changes to the agent's environment."
disable-model-invocation: true
---

The user asks for a **retrospective**. Suggest changes to the coding agent's **environment** that improve future runs. Do not suggest changes to the code itself.

## Steps

1. Read the primary sources for the session the user names. This can mean a search through the session logs on this machine. If the user names no session, use the current one.

2. Look for candidates for improvement in these categories:

   Caution: the Style axis of `review-changes` reads the `## Agent behaviors` section of CLAUDE.md or AGENTS.md. Do not suggest moving the writing-style rules out of that section.

   - **Navigation**: how easily did the agent find the right files? Are there hidden dependencies between files? Would a **navigation pointer** help? _Use when_ the session took a long time to find a piece of information.
   - **Automated checks**: could an automated check catch the errors the agent made? Think of linting, typing, tests, and filesystem linters. _Use when_ the agent made a mistake an automated check could catch, or the repo has no guardrail at all.
     - First read the repo's own check command: its `package.json` or build-tool `lint` and `check` scripts, and its CI workflow.
     - If a check exists but is unwired or silently broken, report that as the finding. Do not write a new one.
     - A repo with no **guardrail** is itself a finding. A guardrail is a pre-commit hook or a CI job that runs the repo's lint, typecheck, or test command.
   - **Coding standards**: should the **reviewer agent** (`review-changes`) get a new rule to enforce? Should you remove an existing rule or make it clearer? _Use when_ the reviewer agent missed a mistake.
     - Classify the violation first.
     - A **mechanical** violation gets a deterministic check, such as a fixed syntax pattern, a banned API, an import shape, or a file-location rule. Use the cheapest check for the repo: a custom linter rule, a pre-commit hook, or a CI job. Prefer the check to the rule.
     - Keep `CODING_STANDARDS.md` for **judgment calls**: cross-file consistency, "matches the surrounding style", anything no guardrail can replace.
   - **Global AGENTS.md**: should some steering instructions move to coding standards or to automated checks? _Use when_ the AGENTS.md or CLAUDE.md file is large, in the repo or in the user's global scope.
   - **Tool economy**: did the agent make expensive tool calls that could be cheaper? Does custom tooling (a CLI, an MCP server) waste tokens? _Use when_ the agent made an expensive tool call.
   - **No-ops**: find instructions in steering files that do not change the agent's behavior. _Use when_ the steering files are large and hard to manage.
   - **Information access**: find ways to give the agent more information, such as dev server logs written to a file, or read-only access to third-party services. _Use when_ the agent lacked a piece of information it needed.

3. Present the candidates to the user, most severe first.

## Reference

### Implementation and review

All work goes through two stages: implementation and review. The implementation agent carries the most **context pressure**. It explores, writes code, and debugs failures.

The review agent carries the least context pressure. It receives a diff, so it does not explore, and it seldom writes code or debugs.

So the review agent, not the implementation agent, enforces the coding standards.

### Files

- `CLAUDE.md` and `AGENTS.md` go into the context window of every agent that works in the repo. Use them sparingly, mostly for **navigation pointers** to other files.
- The review agent reads `CODING_STANDARDS.md`; the implementation agent does not. When it grows past 1,000 lines, add navigation pointers to docs folders.
- Docs are reference files that other files point to. Look for existing docs before you write new ones.
- Skills hold docs whose description belongs in the agent's context window, or commands the user types. A model-invoked skill needs a "Use when ..." description. A user-invoked skill needs a one-line summary.
