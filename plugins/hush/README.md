# hush

Quieter sessions for Claude Code: less narration, shorter tool output and concise answers focused on the result.

Hush ships an output style and a set of hooks. The style asks the agent to stay quiet during routine work and to finish with one short answer built around what changed, whether it worked, and what comes next. The hooks reinforce that and trim noisy tool output.

## What the hooks do

- **Compress tool output.** Shortens long Bash, PowerShell, Read, and Grep results. A large result goes to a temporary file, and the agent gets a reference to it.
- **Silence nudge.** Reminds the agent on each prompt and after each tool call to keep working without narration.
- **Preserve exit code.** Wraps a shell command so a failing command's output still reaches the trim, with its exit code reported.
- **Subagent brief.** Gives each subagent the same writing rules.
- **Compaction hooks.** Shape the compaction summary before it runs, and re-arm the one-time marker note after it.
- **Session end cleanup.** Removes the temporary files a session created.

Settings and switches are in [docs/SETTINGS.md](docs/SETTINGS.md). The mechanics are in [docs/HOW-IT-WORKS.md](docs/HOW-IT-WORKS.md).

Hush runs in Claude Code only. Cursor loads neither hooks nor output styles, so the plugin is not in the Cursor marketplace.

## Skills

- [`craft-style`](skills/craft-style/SKILL.md) — build a personal output style on hush's frame, in your own voice.
- [`pick-style`](skills/pick-style/SKILL.md) — list the available output styles and switch the active one.

## Install

In Claude Code:

```text
/plugin marketplace add smadam813/yet-another-skills-repository
/plugin install hush@yet-another-skills-repository
```

Start a new session to load the plugin.

## Test

```text
node --test tests/*.test.js
```

The tests need Node 22 or later and run in CI on Ubuntu and Windows.
