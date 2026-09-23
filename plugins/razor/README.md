# razor

Reuse-first checks: reconsider dependencies, file growth and unnecessary code before adding more.

Razor puts a short checklist in front of the agent before it writes code. Hooks ask whether the task needs the work, whether the project already has it, or whether the language covers it. One check can deny a tool call once. The retry then follows the host's normal permissions.

## What the hooks do

- **Checklist.** Injects the reuse ladder at session start, after compaction, on every prompt, and into each writing subagent.
- **Dependency guard.** Denies once before a command installs a new package, before code imports a package the manifest does not declare, and before an edit adds a package to a manifest.
- **File meter.** Asks once when a turn creates more new files than the budget allows.
- **Build ledger.** Asks once per session when a session adds a lot of code with almost no deletions.
- **Scope-drift note.** Says once per session when a request has left the task the session started on.

Send `razor off` or `razor on` to pause or resume the checks for the session. Settings and environment variables are in [docs/SETTINGS.md](docs/SETTINGS.md). The mechanics are in [docs/HOW-IT-WORKS.md](docs/HOW-IT-WORKS.md).

Hooks run in Claude Code only. Cursor loads the skills and none of the hooks.

## Skills

- [`unused`](skills/unused/SKILL.md) — report declared dependencies that no source file imports.

## Install

In Claude Code:

```text
/plugin marketplace add smadam813/yet-another-skills-repository
/plugin install razor@yet-another-skills-repository
```

Start a new session to load the plugin.

## Test

```text
node --test tests/*.test.js
```

The tests need Node 22 or later and run in CI on Ubuntu and Windows.
