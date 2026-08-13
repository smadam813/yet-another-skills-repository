# Logic Prototype

A single self-contained HTML file — a **shareable demo** — that lets anyone drive a state model by clicking buttons. Use this when the question is about **business logic, state transitions, or data shape**: the kind of thing that looks reasonable on paper but only feels wrong once you push it through real cases.

Because it is one file with nothing to install, you can hand it to a non-developer — a designer, a PM, a domain expert — and let them feel the model for themselves. So it speaks their language, not the code's.

## When this is the right shape

- "I'm not sure if this state machine handles the edge case where X then Y."
- "Does this data model actually let me represent the case where..."
- "I want to feel out what the API should look like before writing it."
- Anything where someone wants to **press buttons and watch state change**.

If the question is "what should this look like", you are on the wrong branch. Use [UI.md](UI.md).

## Process

### 1. State the question

Before you write code, write down which state model and which question you are prototyping. One paragraph, at the top of the demo, in a visible intro rather than a comment. A logic prototype that answers the wrong question is pure waste, so make the question explicit. Anyone can then check it later, whether the user is watching now or comes back to it alone.

### 2. Isolate the logic in a portable module

Put the actual logic — the part that answers the question — in a single `<script>` block, written as a small pure module you could move into the real codebase later. The page around it is throwaway. This module is not.

The right shape depends on the question:

- **A pure reducer** — `(state, action) => state`. Good when actions are discrete events and state is a single value.
- **A state machine** — explicit states and transitions. Good when "which actions are even legal right now" is part of the question.
- **A small set of pure functions** over a plain data type. Good when there is no implicit current state, only transformations.
- **A class or module with a clear method surface** when the logic really does own ongoing internal state.

Pick whichever shape fits the question, *not* whichever is easiest to wire to a page. Keep it pure: no DOM, no `document`, no button handlers reaching inside it. The page calls into it, and nothing flows the other way. That is what makes the prototype useful past its own lifetime. Once the question is answered, the validated reducer, machine, or function set moves into the real module on its own.

### 3. Build the shareable HTML file

One file, plain HTML, CSS, and JS. No framework, no bundler, no server. Everything is inline, so it opens by double-click and survives being emailed around. Anyone must be able to run it by opening it.

Write it for a non-developer. Put every label in **domain language**, not code, so the buttons and the state read like the business rather than the reducer. Explain in plain words what is happening.

Lay it out with a clean hierarchy, top to bottom:

1. **Title and one-line explanation** of what this demo lets you explore — the question from step 1.
2. **Current state** — the full relevant state, rendered as a readable panel with labeled fields, not a raw JSON dump. Re-render it after every click so the change is visible. Where it helps a non-developer follow along, call out what just changed.
3. **Free-play buttons** — one button per action, always available, so anyone can try the model in any order. Each click dispatches its action and re-renders the state.
4. **Guided walkthroughs** — a set of **scenarios**, one per tab. Each tab holds a short plain-language description of the scenario — the situation it sets up and what to watch for — and under it, the ordered **buttons to press** for that scenario. Each step is a real button: clicking it performs that action and moves to the next step. Starting a walkthrough resets to a known initial state, so the scenario runs the same way every time.

Choose scenarios that show the awkward cases: the happy path, a tricky edge case, and an attempt at something that should be illegal. Those are the ones that are hard to reason about on paper.

Keep it beautiful but restrained: clean typography, generous spacing, one accent color. No animations and no gimmicks. Nothing must compete with the state and the buttons.

### 4. Hand it over

Send them the file, or open it for them. They will click through the walkthroughs and try the free-play buttons whenever they get to it. The interesting moments are when they say "wait, that shouldn't be possible" or "huh, I assumed X would be different". Those are bugs in the _idea_, which is what you are hunting for. If they want new actions or a new scenario, add them. Prototypes evolve.

### 5. Capture the answer and the prototype

Once the prototype has answered its question, capture the answer, then capture the prototype the way the [SKILL](SKILL.md) describes. The logic-specific mapping: the validated reducer, machine, or function set moves into the real module, so the decision is absorbed. The HTML shell goes to the throwaway branch that keeps the prototype as a primary source. Because it is one self-contained file, it stays easy to re-run there.

## Anti-patterns

- **Do not add tests.** A prototype that needs tests is no longer a prototype.
- **Do not wire it to the real database.** Use in-memory state unless the question is about persistence itself.
- **Do not generalize.** No "what if we wanted to support X later." The prototype answers one question.
- **Do not blur the logic and the page together.** If the pure module references the DOM, `document`, or button handlers, you can no longer move it. Keep the page as a thin shell over a pure module.
- **Do not reach for a framework, bundler, or server.** The recipient double-clicks one file. A React app or a dev server defeats "shareable".
- **Do not ship the HTML shell into production.** The page is built for clicking through by hand. The logic module behind it is the part worth keeping.
