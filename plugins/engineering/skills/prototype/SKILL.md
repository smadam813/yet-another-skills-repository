---
name: prototype
description: Build a throwaway prototype to answer a design question. Use when the user wants to sanity-check whether a state model or logic feels right, or explore what a UI should look like.
---

A prototype is **throwaway code that answers a question**. The question decides the shape.

## Pick a branch

Find the question from the user's prompt, from the surrounding code, or by asking the user:

- **"Does this logic / state model feel right?"** → [LOGIC.md](references/LOGIC.md). Build a single shareable HTML file (free-play buttons plus tabbed guided walkthroughs) that pushes the state machine through cases that are hard to reason about on paper, and that a non-developer can drive.
- **"What should this look like?"** → [UI.md](references/UI.md). Generate several radically different UI variations on a single route, switchable via a URL search param and a floating bottom bar.

The two branches produce very different artifacts, so the wrong pick wastes the whole prototype. If the question is ambiguous and the user is away, follow the surrounding code (a backend module → logic; a page or component → UI) and state the assumption at the top of the prototype.

## Rules that apply to both

1. **Throwaway from day one, and marked as such.** Put the prototype next to the module or page it prototypes, so its context is obvious. Name it so a casual reader sees a prototype, not production code. For throwaway UI routes, follow the project's routing convention; do not invent a new top-level structure.
2. **Trivial to run.** A UI prototype starts from one command in the project's task runner: `pnpm <name>`, `python <path>`, `bun <path>`. A logic demo is a single HTML file the user double-clicks. Either way, starting it takes no thought.
3. **No persistence by default.** State lives in memory. The prototype _checks_ persistence; it must not depend on it. If the question involves a database, hit a scratch DB or a local file named "PROTOTYPE, wipe me".
4. **Skip the polish.** No tests, no abstractions, and no error handling past what makes the prototype run. The point is to learn something fast.
5. **Surface the state.** After every action (logic) or every variant switch (UI), render the full relevant state so the user sees what changed.
6. **Capture it when done.** Fold the validated decision into the real code, then keep the prototype as a **primary source**: commit it to a throwaway branch, off main, and link that branch from the implementation issue. Record the answer too, the verdict and the question it settled, in the issue or a commit. Main keeps only the validated decision.
