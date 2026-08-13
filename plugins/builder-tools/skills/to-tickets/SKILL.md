---
name: to-tickets
description: Break a plan, spec, or the current conversation into a set of tracer-bullet tickets, each declaring its blocking edges, published to the configured tracker — edges as text in one file per ticket locally, or native blocking links on a real tracker.
disable-model-invocation: true
license: MIT
metadata:
  vendored: modified
  upstream_source: https://github.com/mattpocock/skills
  upstream_path: skills/engineering/to-tickets/SKILL.md
  upstream_author: Matt Pocock
  upstream_copyright: Copyright (c) 2026 Matt Pocock
  upstream_license: MIT
  local_changes: >-
    Setup reference retargeted to /setup-builder-tools. Prose edited for
    plain English per the /orwell-writing skill: American spelling, shorter
    sentences, active voice, jargon glossed. The ticket templates, the
    expand-migrate-contract sequence, and the vertical-slice rules are
    unchanged in substance.
  note: >-
    See NOTICE at the repository root.
---

# To Tickets

Break a plan, spec, or conversation into a set of **tickets**: tracer-bullet vertical slices, each one declaring the tickets that **block** it.

You should already have the issue tracker and the triage label vocabulary. Run `/setup-builder-tools` if you do not.

## Process

### 1. Gather context

Work from whatever is already in the conversation context. If the user passes a reference as an argument — a spec path, an issue number, a URL — fetch it and read its full body and comments.

### 2. Explore the codebase (optional)

If you have not explored the codebase yet, do so, to understand the current state of the code. Ticket titles and descriptions must use the project's domain glossary vocabulary, and must respect the ADRs in the area you are touching.

Look for chances to prepare the code so the implementation is easier. "Make the change easy, then make the easy change."

### 3. Draft vertical slices

Break the work into **tracer bullet** tickets.

<vertical-slice-rules>

- Each slice cuts a narrow but COMPLETE path through every layer (schema, API, UI, tests) — vertical, NOT a horizontal slice of one layer
- A completed slice is demoable or verifiable on its own
- Each slice is sized to fit in a single fresh context window
- Any preparatory refactoring should be done first

</vertical-slice-rules>

Give each ticket its **blocking edges**: the other tickets that must finish before it can start. A ticket with no blockers can start immediately.

**Wide refactors are the exception to vertical slicing.** A **wide refactor** is one mechanical change — rename a column, retype a shared symbol — whose **blast radius** reaches across the whole codebase. A single edit breaks thousands of call sites at once, so no vertical slice can pass CI on its own. Do not force it into a tracer bullet. Sequence it as **expand and contract** instead.

First expand: add the new form beside the old one, so nothing breaks. Then migrate the call sites over in batches, sized by blast radius — per package, or per directory. Each batch is its own ticket, blocked by the expand. CI stays green from batch to batch because the old form still exists. Finally contract: delete the old form once no caller remains, in a ticket blocked by every migrate batch.

When even the batches cannot stay green on their own, keep the sequence but let them share an integration branch. Every batch then blocks a final integrate-and-verify ticket, and green is promised only there.

### 4. Quiz the user

Present the proposed breakdown as a numbered list. For each ticket, show:

- **Title**: a short descriptive name
- **Blocked by**: which other tickets, if any, must finish first
- **What it delivers**: the end-to-end behavior this ticket makes work

Ask the user:

- Does the granularity feel right — too coarse, or too fine?
- Are the blocking edges correct? Does each ticket depend only on tickets that genuinely gate it?
- Should any tickets be merged, or split further?

Iterate until the user approves the breakdown.

### 5. Publish the tickets to the configured tracker

Publish the approved tickets. **How** depends on the tracker that `/setup-builder-tools` configured. The tickets are the same either way. Only the shape of the blocking edges changes:

- **Local files** → write one file per ticket under `.scratch/<feature-slug>/issues/<NN>-<slug>.md`, numbered from `01` in dependency order, blockers first. Each file's "Blocked by" lists the numbers or titles it depends on. Use the per-ticket file template below: one ticket per file, never a single combined file.
- **A real issue tracker (GitHub, Linear, …)** → publish one issue per ticket in dependency order, blockers first, so each ticket's blocking edges can reference real identifiers. Use the platform's native blocking or sub-issue relationship where it has one. Otherwise set each ticket's "Blocked by" to the blocking issues. Apply the `ready-for-agent` triage label unless told otherwise — an agent can pick up any of these tickets as they are.

Work the **frontier**: any ticket whose blockers are all done. For a purely linear chain, that means top to bottom.

Do NOT close or modify any parent issue.

<local-ticket-template>

# <NN> — <Ticket title>

**What to build:** the end-to-end behavior this ticket makes work, from the user's perspective — not a layer-by-layer implementation list.

**Blocked by:** the numbers/titles of the tickets that gate this one, or "None — can start immediately".

**Status:** ready-for-agent

- [ ] Acceptance criterion 1
- [ ] Acceptance criterion 2

</local-ticket-template>

<issue-template>

## Parent

A reference to the parent issue on the tracker (if the source was an existing issue, otherwise omit this section).

## What to build

The end-to-end behavior this ticket makes work, from the user's perspective — not layer-by-layer implementation.

## Acceptance criteria

- [ ] Criterion 1
- [ ] Criterion 2

## Blocked by

- A reference to each blocking ticket, or "None — can start immediately".

</issue-template>

In either form, avoid specific file paths and code snippets. They go stale fast. Exception: if a prototype produced a snippet that encodes a decision more precisely than prose can — a state machine, a reducer, a schema, a type shape — inline it and note briefly that it came from a prototype. Trim it to the parts that carry the decision. This is not a working demo, only the important parts.
