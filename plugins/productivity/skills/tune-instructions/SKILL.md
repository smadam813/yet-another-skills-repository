---
name: tune-instructions
description: Audit and tighten a project's instruction files and hooks, with every change confirmed.
disable-model-invocation: true
---

Tune this project's Claude Code instruction files, and the hooks that enforce them, so the model running this session follows them reliably. Report first; change nothing without approval.

If this is a git repository with uncommitted changes, say so and stop; let the user decide. If it is clean, note the current commit, and give the command that restores it at the end.

## Inventory

Find what the host loads. Report which of these exist:

- `CLAUDE.md` in the project root, and any `CLAUDE.md` in subdirectories
- every file under `.claude/rules/`
- every `.claude/skills/*/SKILL.md`, specifically the `description:` line in its frontmatter
- every `.claude/agents/*.md`, same
- `.claude/settings.json`, and every hook it wires

Read each one in full, except the skill and agent files: there the `description:` line is all this audit needs. Then tell the user in a few lines what you found: how many files, how many separate rules, how many hooks, roughly how many words load into every session, and anything that surprised you — a file nothing loads, a rule written for a different model, a duty a wired hook already enforces.

Before grading anything, set aside what is not a rule. Instruction files collect things that only look like instructions: a note about a decision someone made last quarter, an example, a description of what the project does, a lesson learned. The test: did the user write the line for the agent, or did the agent write it about the project? The second is a note, not an instruction. Say which lines you set aside and why, in a few words each.

## Grade every rule

A rule is one instruction: a sentence or bullet that asks for something. Judge each against these questions, and say which ones it fails.

Does it name a moment the agent can recognize? "When you change a file under `src/`" is a moment. "Keep things tidy" is not, and neither is "when possible". A rule with no moment does not fire late; it never fires.

Does it ask for anything at all? A rule needs an instruction verb — add, run, use, never, always. A line that reads as a description of how things are is not a rule even when it sounds like policy. "CHANGELOG entries are short and user-facing" describes. "Keep each `CHANGELOG.md` entry under 3 lines, written for the user" asks. Hedges do the same damage from the other side: "try to", "where possible", "prefer when you can" leave the model free to decide it was not possible.

Does it name something concrete? A path, a command, an identifier, a number with a unit. Suspect the words that leave the standard to the reader: clean, proper, appropriate, reasonable, careful, maintainable. "Write clean, maintainable code" gives the agent nothing to act on. "Keep functions under 40 lines; extract a helper rather than nesting a third `if`" does. Quote the vague words back to the user when they are the reason a rule fails.

Not every rule needs a path. Some need a threshold, some need one worked example, and a few need judgment — those last ones are fine as they are. Say so rather than invent a number for them.

Does it only forbid? A rule that says never do X, with no alternative and no escape hatch, can stall a whole session when the task needs X. Pair it with what to do instead, or with "stop and ask".

## Check where each rule lives

The host loads `CLAUDE.md` into every session in this project, whether the rule applies or not. That is what it is for: things that are true of all work here. A rule that only applies to some of the code does not belong in it. "When editing TypeScript files, prefer named exports" costs context in every Python session, every documentation session, every session that never opens a `.ts` file. Move that rule into its own file under `.claude/rules/`, scoped to the files it is about, and it loses the when-clause because the scope now says it: "Use named exports."

For each rule, tell the user which of these it is. It applies to all work here, so `CLAUDE.md` is right. Or it applies to one language, one folder, or one kind of file, so it belongs in a scoped rules file — and name the pattern it should be scoped to.

A move is complete only when `CLAUDE.md` keeps nothing: no pointer to the new file, no index of rules files. The scope pattern is the trigger. A leftover reference in `CLAUDE.md` pays the always-loaded cost the move was meant to end, and loads the rule twice in the sessions the scope matches.

Two more placement problems to look for, and both are worse than any wording problem because the rule never reaches the model at all. A rules file scoped to a pattern that matches nothing in this repository. And a file shadowed by another one, or sitting past a read limit, so the host skips it.

Then check three mechanical things that have nothing to do with wording. A rule pointing at a file, function, or command that no longer exists — verify each path and each command; do not assume. Two rules asking for the same thing in different words. Two rules that contradict each other.

## Grade every hook

Judge each wired hook the way you judged the rules.

- Does its command or script still exist? Verify each path; do not assume.
- Does its matcher match anything in this repository?
- Do two hooks do the same job on the same trigger?
- Does it enforce what a prose rule also asks, on the same trigger? The hook wins. The prose line is a removal candidate — see the pairing below.

Then run the other direction. A mechanical duty living in prose — a command that must run after an edit, a path that must never be touched, a file that must stay in step with another — holds better as a hook than as a sentence the model may skip. For each one, describe the hook that would enforce it.

Tell the user which rules need real judgment and should stay prose, so the choice not to automate them is deliberate rather than an oversight.

## Report, then change

Report everything before changing anything. Order it worst first: rules the host never loads, then rules and hooks pointing at things that are gone, then rules in the wrong file, then contradictions and duplicates, then prose duties a hook would hold better, then wording. A rule that never loads is broken for every model.

Then propose changes one at a time, and apply only what the user approves:

- **A rewrite**: old line, new line, one sentence on what changed. Sharpen how a rule asks; never change what it asks for. The shape: Before: "Keep the changelog updated." No moment, no artifact, so the agent skips it. After: "When you change any file under `src/`, add a line to `CHANGELOG.md` under Unreleased in the same commit."
- **A move to a scoped file**: show the new file, its scope pattern, and the line as it will read once the scope carries the when-clause — and confirm that `CLAUDE.md` keeps no trace.
- **A hook**: show the exact `settings.json` fragment — event, matcher, command — and any script it runs. Creating, editing, and deleting a hook all get the same treatment: show it, wait for a yes.
- **A hook that replaces a prose rule**: show the pair — the hook, whether it is new or already wired, and the prose line coming out. This is the only path that removes a rule. Everywhere else, never delete or deactivate a rule; if you believe one is obsolete, that is a finding to report, not a change to make.

Where two rules disagree, name both sides and leave the choice to the user.

Apply approved changes one file at a time.

## Skill and agent descriptions

Review these by a different test. The description alone decides whether the agent ever uses the skill. It must say when to use it, in the words someone would type, and when not to. A description that reads as a summary of what the skill does will never fire.

## Limits

Do not touch source code, tests, or CI configuration. A hook's script is the one exception, and only as part of a hook change the user approved. Do not edit instruction files outside this repository. Do not add a dependency or install anything.

When you are done, tell the user: what you found, what you changed, which prose duties would hold better as hooks, what you deliberately left alone and why, and the exact git command that puts everything back.
