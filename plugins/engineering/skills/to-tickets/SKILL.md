---
name: to-tickets
description: Break a plan, spec, or the current conversation into a set of tracer-bullet tickets, each declaring the tickets that block it, then publish them to the configured tracker. A local tracker gets one file per ticket with the edges as text; a real tracker gets its own native blocking links.
disable-model-invocation: true
---

Break a plan, spec, or conversation into **tickets**: tracer-bullet vertical slices, each declaring the tickets that **block** it.

You need the issue tracker and the triage label vocabulary before you start. If you do not have them, tell the user to run `/setup-builder-skills`.

## Process

### 1. Gather context

Work from what is already in the conversation. If the user passes a reference as an argument — a spec path, an issue number, a URL — fetch it and read the full body and the comments.

### 2. Explore the codebase (optional)

If you have not explored the codebase yet, explore it now to understand the current state of the code. Write ticket titles and descriptions in the project's domain glossary vocabulary. Respect the ADRs in the area you touch.

Look for prefactoring that makes the implementation easier. "Make the change easy, then make the easy change."

### 3. Draft vertical slices

Break the work into **tracer bullet** tickets.

<vertical-slice-rules>

- Each slice cuts a narrow but COMPLETE path through every layer (schema, API, UI, tests): vertical, NOT a horizontal slice of one layer
- You can demo or verify a completed slice on its own
- Size each slice to fit in a single fresh context window
- Do any prefactoring first

</vertical-slice-rules>

Give each ticket its **blocking edges**: the other tickets that must complete before it can start. A ticket with no blockers can start immediately.

**Wide refactors are the exception to vertical slicing.** A **wide refactor** is one mechanical change — rename a column, retype a shared symbol — whose **blast radius** covers the whole codebase. A single edit breaks thousands of call sites at once, so no vertical slice can land green. Do not force it into a tracer bullet. Sequence it as **expand–contract** instead:

1. **Expand.** Add the new form beside the old one, so nothing breaks.
2. **Migrate.** Move the call sites over in batches sized by blast radius: one package or one directory per batch. Each batch is its own ticket, blocked by the expand ticket. CI stays green batch to batch because the old form still exists.
3. **Contract.** Delete the old form once no caller remains, in a ticket blocked by every migrate batch.

When a batch cannot stay green on its own, keep the sequence but put the batches on a shared integration branch. Every batch then blocks one final integrate-and-verify ticket, and that ticket is the only place you promise green.

### 4. Quiz the user

Present the proposed breakdown as a numbered list. For each ticket, show:

- **Title**: short descriptive name
- **Blocked by**: the tickets that must complete first, if any
- **What it delivers**: the end-to-end behavior this ticket makes work

Ask the user:

- Is the granularity right, or are the tickets too coarse or too fine?
- Are the blocking edges correct: does each ticket depend only on the tickets that truly gate it?
- Do you want any tickets merged or split further?

Repeat until the user approves the breakdown.

### 5. Publish the tickets to the configured tracker

Publish the approved tickets. The method depends on the tracker that `/setup-builder-skills` configured. The tickets are the same either way; only the form of the blocking edges changes:

- **Local files** → write one file per ticket under `.scratch/<feature-slug>/issues/<NN>-<slug>.md`, numbered from `01` in dependency order, blockers first. Each file's "Blocked by" section lists the numbers and titles that file depends on. Use the local ticket template below: one ticket per file, never one combined file.
- **A real issue tracker (GitHub, Linear, …)** → publish one issue per ticket in dependency order, blockers first, so each ticket's blocking edges can reference real identifiers. Use the tracker's own blocking or sub-issue relationship when it has one. If it has none, list the blocking issues in each ticket's "Blocked by" section. Apply the `ready-for-agent` triage label unless the user tells you otherwise: every ticket is ready for an agent to pick up.

Work the **frontier**: any ticket whose blockers are all done. In a linear chain, that means top to bottom.

Do NOT close or modify any parent issue.

<local-ticket-template>

# <NN>: <Ticket title>

**What to build:** the end-to-end behavior this ticket makes work, from the user's perspective, not a layer-by-layer implementation list.

**Blocked by:** the numbers and titles of the tickets that gate this one, or "None (can start immediately)".

**Status:** ready-for-agent

- [ ] Acceptance criterion 1
- [ ] Acceptance criterion 2

</local-ticket-template>

<issue-template>

## Parent

A reference to the parent issue on the tracker. Omit this section if the source was not an existing issue.

## What to build

The end-to-end behavior this ticket makes work, from the user's perspective, not layer-by-layer implementation.

## Acceptance criteria

- [ ] Criterion 1
- [ ] Criterion 2

## Blocked by

- A reference to each blocking ticket, or "None (can start immediately)".

</issue-template>

In either form, avoid specific file paths and code snippets: they go stale fast. Exception: if a prototype produced a snippet that encodes a decision more precisely than prose can — a state machine, a reducer, a schema, a type shape — inline it and note that it came from a prototype. Keep only the decision-rich lines, not a working demo.
