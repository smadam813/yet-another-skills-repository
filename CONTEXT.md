# yet-another-skills-repository

A plugin marketplace of agent skills for Claude Code and Cursor. The glossary below covers the terms the plugins in this repo use that a reader cannot infer from the tools' own docs.

## Language

### hush

**Sidecar**:
A file on disk that holds a tool result too large to keep in context. The model sees a digest in its place and can read the file back.
_Avoid_: parked output, recovery file, side file

**View**:
What hush hands the model in place of a tool result. A digest, a capped tail, and a collapsed match list are views.
_Avoid_: rewrite, output, updated

**Digest**:
The view that replaces a tool result when hush writes a sidecar: a header naming the file, the head and tail, and a sample of the signal lines.
_Avoid_: summary, preview

**Note**:
A bracketed `[hush ...]` line that hush adds to a view to say what it changed and how to get the rest back.
_Avoid_: marker, provenance note, telemetry

**Session scratch**:
The one directory hush owns for a session, under the system temp folder: its sidecars, the note sentinel, the react counter, the running total, and the debug manifest. It is removed when the session ends.
_Avoid_: sidecar directory, session dir, temp files

**Surface**:
One of hush's two switchable halves. Core is everything that shortens tool output. Quiet is everything that reminds the model to stay silent.
_Avoid_: feature set, mode, half

**Exit trailer**:
The `[[hush:exit=N]]` text the shell wrapper appends to a command's output so the real exit code survives a forced zero exit. hush strips it before the model sees the output.
_Avoid_: exit marker, marker, wrapper marker

### razor

**Gate**:
One of the four checks razor runs before a Bash, PowerShell, Edit, or Write call: the dep guard, the manifest guard, the import guard, and the file meter.
_Avoid_: guard (for the role), check, hook

**Nudge**:
The one deny a gate gives before it lets the retry through.
_Avoid_: block, denial, checkpoint

**Reconsideration ledger**:
The record of the dependencies that already got a nudge. The dep guard, the manifest guard, and the import guard share it.
_Avoid_: ledger (alone), deny ledger, denied set

**Build ledger**:
The Stop check that asks one question per session when the session adds a lot of code with almost no deletions, or adds many new files.
_Avoid_: ledger (alone)

**Baseline**:
The git line counts the build ledger takes at session start. It measures later work against them.
_Avoid_: snapshot, ledger
