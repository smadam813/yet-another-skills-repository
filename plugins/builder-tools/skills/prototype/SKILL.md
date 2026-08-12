---
name: prototype
description: Build a throwaway prototype to answer a design question. Use when the user wants to check whether a state model or logic feels right, or explore what a UI should look like.
license: MIT
metadata:
  vendored: modified
  upstream_source: https://github.com/mattpocock/skills
  upstream_path: skills/engineering/prototype/SKILL.md
  upstream_author: Matt Pocock
  upstream_copyright: Copyright (c) 2026 Matt Pocock
  upstream_license: MIT
  local_changes: >-
    Prose edited for plain English per the /orwell-writing skill: shorter
    sentences, active voice, decorative idiom removed. The two branches and
    the six shared rules are unchanged in substance.
  note: >-
    See NOTICE at the repository root.
---

# Prototype

A prototype is **throwaway code that answers a question**. The question decides the shape.

## Pick a branch

Work out which question you are answering. Take it from the user's prompt, from the surrounding code, or by asking if the user is around:

- **"Does this logic or state model feel right?"** → [LOGIC.md](LOGIC.md). Build a single shareable HTML file, with free-play buttons and tabbed guided walkthroughs. It pushes the state machine through the cases that are hard to reason about on paper, and a non-developer can drive it.
- **"What should this look like?"** → [UI.md](UI.md). Generate several radically different UI variations on a single route, switchable via a URL search param and a floating bottom bar.

The two branches produce very different artifacts, and picking the wrong one wastes the whole prototype. If the question is truly ambiguous and you cannot reach the user, default to whichever branch matches the surrounding code — a backend module means logic, a page or component means UI — and state the assumption at the top of the prototype.

## Rules that apply to both

1. **Throwaway from the start, and clearly marked as such.** Put the prototype code close to where it will be used, next to the module or page it is prototyping for, so the context is obvious. Then name it so a casual reader can see it is a prototype and not production code. For throwaway UI routes, follow whatever routing convention the project already uses. Do not invent a new top-level structure.
2. **Trivial to run.** A UI prototype starts from one command in the project's task runner: `pnpm <name>`, `python <path>`, `bun <path>`, and so on. A logic demo is a single HTML file the user double-clicks. Either way, starting it takes no thought.
3. **No persistence by default.** State lives in memory. Persistence is the thing the prototype is _checking_, not something it should depend on. If the question involves a database, use a scratch DB or a local file with a clear "PROTOTYPE — wipe me" name.
4. **Skip the polish.** No tests. No error handling beyond what makes the prototype _runnable_. No abstractions. The aim is to learn something fast.
5. **Surface the state.** After every action (logic) or on every variant switch (UI), print or render the full relevant state so the user can see what changed.
6. **Capture it when done.** Merge any validated decision into the real code, then keep the prototype itself as a **primary source**: commit it to a throwaway branch, away from main, and leave a context pointer to that branch on the implementation issue. Capture the answer too — the verdict and the question it settled — in the issue or a commit. The main branch keeps only the validated decision.
