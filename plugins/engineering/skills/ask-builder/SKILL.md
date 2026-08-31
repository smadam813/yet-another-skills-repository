---
name: ask-builder
description: Ask which skill or flow fits your situation. A router over the skills in this repo.
disable-model-invocation: true
---

You do not remember every skill, so ask.

A **flow** is a path through the skills. Most paths run along one **main flow**, and two **on-ramps** merge onto it. Everything else is standalone, or a vocabulary layer that runs underneath.

## The main flow: idea → ship

The route most work travels. You have an idea and want it built.

1. **`/grill-with-docs`** sharpens the idea by interview. Start here whenever you work **in a working directory**. It is stateful: it keeps what it learns in `CONTEXT.md` and in ADRs. With no working directory, use **`/grill-me`** instead, covered under Standalone. Both run the same `/productivity:grilling` primitive, but `grill-with-docs` leaves a paper trail, so prefer it whenever a repo is there to hold one.
2. **Branch: can you settle every question in conversation?** Some questions need a runnable answer: state, business logic, a UI you have to see. Detour through a prototype and bridge it with **`/handoff`** in both directions. A prototype lives in its own directory, which is exactly what `/handoff` is for (see Phase boundaries):
   - **`/handoff`** out, then open a fresh session against that file,
   - **`/prototype`** to answer the question with throwaway code,
   - **`/handoff`** back what you learned, then reference it from the original idea thread.
3. **Branch: is this a multi-session build?**
   - **Yes** → **`/to-spec`** turns the thread into a spec, then **`/to-tickets`** splits it into tracer-bullet tickets. Each ticket declares its **blocking edges**. On a local tracker that is one file per ticket under `.scratch/<feature>/issues/`, worked blockers-first by hand. On a real tracker the edges become native blocking links, so you can grab any ticket whose blockers are done. Run **`/implement`** per ticket, and **`/clear` context between each one**. Each ticket is self-contained, so the last one's context is disposable.
   - **No** → run **`/implement`** right here, in the same context window.

   Either way, **`/implement`** builds each issue by driving **`/tdd`** internally, one red-green slice at a time. It then closes out by running **`/review-changes`**, a two-axis review (Standards + Spec) of the diff, before committing. Reach for **`/tdd`** on its own to build one concrete behavior test-first without a full spec, and **`/review-changes`** on its own to review a branch or PR against a fixed point.

### Context hygiene

Keep steps 1–3 in **one unbroken context window**. Do not compact or clear until after `/to-tickets`, so the grilling, the spec, and the tickets all build on the same thinking. Each `/implement` then starts fresh, working from the ticket.

The limit on this is the **[smart zone](references/SMART-ZONE.md)**: the window (~150k tokens on current frontier models) within which the model still reasons sharply. If a session approaches it before `/to-tickets`, do not push on degraded. `/compact` at the nearest phase boundary and carry on (see Phase boundaries).

## On-ramps

A starting situation that generates work, then merges onto the main flow.

- **Bugs and requests piling up** → **`/triage`**. It moves issues through triage roles and produces agent-ready issues, which **`/implement`** picks up later.

  Triage is only for issues **you did not create**: bug reports, incoming feature requests, anything that arrives raw. Tickets that `/to-tickets` produced are already agent-ready, so **do not triage them**.

- **Something is broken and the cause is still unknown** → **`/diagnosing-bugs`**. For the hard ones: the bug that resists a first glance, the intermittent flake, the regression that crept in between two known-good states. It refuses to theorize until it has a **tight feedback loop**, one command that already goes red on *this* bug, then fixes the bug with a regression test. Once the cause is understood and you want the fix built test-first, that is **`/tdd`**. When it finds no good seam to lock the bug down, it documents that as the finding and suggests **`/improve-codebase-architecture`**, where you design the missing seam.

- **A huge, foggy effort: a greenfield project, or a feature build too big for one session** → **`/wayfinder`**, the most demanding flow here. Use it when the way from here to the destination is not visible yet. It charts a **shared map** of **decision tickets** on the issue tracker and resolves them one at a time, producing **decisions, not deliverables**, until the fog is pushed back and the way is clear. **`/grill-with-docs`** sharpens an idea you can hold in one session; wayfinder is for the idea you cannot. It is slower and denser, so save it for exactly that, and never for a well-scoped feature.

  When the map clears, **it hands off, it does not build**: merge onto the main flow at **`/to-spec`**, which collapses the map's linked decisions into a buildable plan, then `/to-tickets` and `/implement` as usual. Looping the map straight into `/implement` skips that collapse and throws the linked detail away, so go straight to `/implement` only when the effort turned out to be genuinely small.

## Codebase health

Not feature work, just upkeep.

- **`/improve-codebase-architecture`** runs whenever you have a spare moment to keep the codebase good for agents to work in. It surfaces **deepening opportunities**, and picking one _generates an idea_ you can take into the main flow at `/grill-with-docs`. It is the survey that finds the candidates; **`/codebase-design`** (below) is the bench where you design the one you chose.

## Vocabulary underneath

Two model-invoked references run *beneath* the other skills, each the single source of truth for its vocabulary. Reach for them directly when the **words**, not the process, are the problem, or let the skills above pull them in.

- **`/domain-modeling`** sharpens the project's *domain* language: challenge a fuzzy term, resolve an overloaded word ("account" doing three jobs), record a hard-to-reverse decision as an ADR. It is the active discipline `/grill-with-docs` drives to keep `CONTEXT.md` a clean glossary.
- **`/codebase-design`** holds the deep-module vocabulary (module, interface, depth, seam, adapter, leverage, locality) for designing a module's *shape*: a lot of behavior behind a small interface at a clean seam. `/tdd` and `/improve-codebase-architecture` both speak it.

## Phase boundaries

A **phase** is a chunk of work inside a session: the grilling, the implementation, the QA. At the **boundary** between two phases you have five options, and choosing between them is the hardest judgment call in this whole map:

- **Continue**: stay put. Costs nothing, loses nothing.
- **`/clear`**: empty the window, when nothing here matters to what comes next.
- **`/handoff`**: write a portable markdown file. It is narrow, and covers only a **new harness**, a **new directory**, a **colleague**, or a side task you fork **mid-phase**. What it buys is portability.
- **Subagent**: send a tightly-scoped task to its own window and get a report back.
- **`/compact`**: compress this context and seed a fresh session with it. The **default**, at the bottom of the tree rather than the first reach.

Read [PHASE-BOUNDARIES.md](references/PHASE-BOUNDARIES.md) for the ordered tree: the five questions, the reasoning behind each branch, and why the cost of giving up a primary source makes **Continue** the one to rule out first. Make the decision **at** a boundary. Mid-phase, continue, or split the rest into subagents.

## Standalone

Off the main flow entirely.

- **`/grill-me`**: the same relentless interview as `/grill-with-docs`, but **stateless**. It saves nothing locally and builds no `CONTEXT.md`. Reach for it when you are **not working in a working directory**: sharpening a plan, a design, a piece of writing, anything with no repo under it. In a working directory, use `/grill-with-docs` instead: it runs the same interview and leaves a paper trail, so it is strictly the better one.
- **`/productivity:grilling`** is the interview primitive itself: rounds, the frontier, facts are the agent's job and decisions are yours. `/grill-me` and `/grill-with-docs` are the two named ways in, and `/triage`, `/wayfinder`, and `/improve-codebase-architecture` all run it internally. Reach for it directly only when you want the interview with no wrapper around it.
- **`/resolving-merge-conflicts`** works an in-progress merge or rebase conflict hunk by hunk. It resolves by **intent**, traced to each side's primary source, rather than by picking lines, then finishes the operation. It never runs `--abort`. It is standalone and off every flow: reach for it when you are already mid-conflict.
- **`/prototype`** is a small, throwaway program that answers one design question: does this state model feel right, or what should this UI look like. Throwaway is a constraint on how you write the code, not a promise to destroy it. The answer folds into the real code, and the prototype itself is kept as a **primary source** on a `prototype/<name>` branch off main, pointed at from the implementation issue. It is the detour in step 2 of the main flow, but reach for it any time a design question is hard to settle on paper.
- **`/research`** delegates reading legwork to a **background agent**. It investigates a question against **primary sources**, then leaves a cited Markdown file in the repo. Keep working while it reads. Take the file it produces *into* the main flow at `/grill-with-docs`, since research feeds the thinking rather than replacing it.
- **`/to-questionnaire`** is for when the thing blocking you is not in your head or the codebase but in **someone else's**, and it writes them a questionnaire to fill in. It inverts `/grill-me`: instead of interviewing you about the subject, it interviews you about the **send** (who it goes to, what you need back) and aims the questions at the gap. What comes back is material for `/grill-with-docs` or `/to-spec`.
- **`/wizard`** is for the steps only a **human** can take: provisioning infrastructure, setting up credentials or CI secrets, clicking through an unfamiliar third-party dashboard, running a one-off migration or cutover. It generates an interactive bash script that opens each URL, captures each value, and writes it into `.env` and GitHub secrets, so the procedure stops being something you re-explain to an agent every time. It is model-invoked, so the agent reaches for it the moment it hits a wall only you can pass. If the agent could do the step itself, it should; this is for where a human is genuinely in the loop.
- **`/wait-what`** corrects a message that did not land. Use it mid-conversation, inside any other skill, and the agent re-pitches what it just said in plain English, with the context you were missing, using the `CONTEXT.md` vocabulary. It works after the fact. `/grill-with-docs` is the upfront cure, because a shared language agreed early is what stops the jargon arriving at all.
- **`/teach`**: learn a concept over multiple sessions, using the current directory as a stateful workspace.
- **`/writing-for-agents`** is the reference for writing documents agents consume: skills, AGENTS.md, pointed-at docs.

## Precondition

**`/setup-builder-skills`**: run it before your first engineering flow. It configures the issue tracker, the triage labels, and the doc layout the other skills assume. Custom issue trackers also work.
