# Hush Mode

An output style for Claude Code, built for tired and ADHD readers. Claude stays silent
while it works and writes one short, plain-spoken message once the work is done.

## What it does

`output-style.md` defines the **Hush Mode** style: short sentences, everyday words, no
narration between tool calls, and a final message capped at eight lines and ninety words.
It still says everything that matters — what changed, whether it worked, what's next —
without the mid-turn narration or the jargon.

`claude-instructions.md` goes with it. It tells the agent to check the codebase before
adding to it: search first, reuse before writing, stdlib before a dependency. It also tells
the agent to report once, at the end of the turn, instead of narrating progress.

## Files

- [`output-style.md`](output-style.md) — the Hush Mode output style, in
  Claude Code's output-style format.
- [`claude-instructions.md`](claude-instructions.md) — cut-before-adding and
  report-once-at-the-end rules, to append to a project's `CLAUDE.md`.

## Install

Paste the prompt below into Claude Code, in the project where you want it. Claude fetches
both files from this repo. It saves the output style to
`~/.claude/output-styles/hush-mode.md`, appends the instructions to your
project's `CLAUDE.md`, and checks your project's `.claude/settings.json` for a
conflicting output style. Then it reports what it did.

```
Set up Hush Mode for me in this project. Do all of it yourself and tell me at the end what changed.

Fetch these two files:

- https://raw.githubusercontent.com/smadam813/yet-another-skills-repository/refs/heads/main/claude-utils/hush-mode/output-style.md
- https://raw.githubusercontent.com/smadam813/yet-another-skills-repository/refs/heads/main/claude-utils/hush-mode/claude-instructions.md

Then do four things.

Save the first file, unchanged, to `.claude/output-styles/hush-mode.md` in my home folder. Create the folder if it is not there. If a file is already there and matches the one you fetched, leave it alone. If it differs, show me both versions and ask before replacing it.

Add the second file's contents to the end of `CLAUDE.md` in this project. If there is no `CLAUDE.md`, create one that contains only that. If `CLAUDE.md` already contains these rules, leave it alone. If any rule in it contradicts a rule already in my `CLAUDE.md`, stop and show me both rules instead of adding the new one.

Check that `.claude/settings.json` in this project does not already set a different output style. If it does, say which one and do not change it.

Then tell me, in one short message: which files you wrote and whether anything was already there.

Change nothing else. No new folders, no config beyond what is named above, and no edits to my source code.
```

## Manual install

To do it by hand instead of running the prompt above:

1. Copy `output-style.md` to `~/.claude/output-styles/hush-mode.md`.
2. Append the contents of `claude-instructions.md` to your project's `CLAUDE.md`.

## Use it

Switch to it by running `/config` in Claude Code and selecting **Output style**, or set
`"outputStyle": "Hush Mode"` in `.claude/settings.json` to make it the project default.
