---
name: domain-modeling
description: Build and sharpen a project's domain model. Use when the user wants to pin down domain terminology or a ubiquitous language, record an architectural decision, or when another skill needs to maintain the domain model.
license: MIT
metadata:
  vendored: modified
  upstream_source: https://github.com/mattpocock/skills
  upstream_path: skills/engineering/domain-modeling/SKILL.md
  upstream_author: Matt Pocock
  upstream_copyright: Copyright (c) 2026 Matt Pocock
  upstream_license: MIT
  local_changes: >-
    Prose edited for plain English per the /orwell-writing skill: American
    spelling, shorter sentences, active voice, decorative idiom removed. The
    file layouts, rules, and technical claims are unchanged.
  note: >-
    See NOTICE at the repository root.
---

# Domain Modeling

Build and sharpen the project's domain model as you design. This is the *active* discipline: challenge terms, invent edge-case scenarios, and write the glossary and the decisions down the moment they settle.

Reading `CONTEXT.md` for vocabulary is not this skill. That is a one-line habit any skill can follow. Use this skill when you are changing the model, not when you are only consuming it.

## File structure

Most repos have a single context:

```
/
├── CONTEXT.md
├── docs/
│   └── adr/
│       ├── 0001-event-sourced-orders.md
│       └── 0002-postgres-for-write-model.md
└── src/
```

If a `CONTEXT-MAP.md` exists at the root, the repo has several contexts. The map points to where each one lives:

```
/
├── CONTEXT-MAP.md
├── docs/
│   └── adr/                          ← system-wide decisions
├── src/
│   ├── ordering/
│   │   ├── CONTEXT.md
│   │   └── docs/adr/                 ← context-specific decisions
│   └── billing/
│       ├── CONTEXT.md
│       └── docs/adr/
```

Create files lazily, only when you have something to write. If no `CONTEXT.md` exists, create one when you resolve the first term. If no `docs/adr/` exists, create it when you need the first ADR.

## During the session

### Challenge against the glossary

When the user uses a term that conflicts with the language already in `CONTEXT.md`, say so immediately. "Your glossary defines 'cancellation' as X, but you seem to mean Y. Which is it?"

### Sharpen fuzzy language

When the user uses a vague or overloaded term, propose a precise canonical term. "You are saying 'account'. Do you mean the Customer or the User? Those are different things."

### Discuss concrete scenarios

When the user discusses domain relationships, test them with specific scenarios. Invent scenarios that probe edge cases and force the user to be precise about where one concept ends and the next begins.

### Cross-reference with code

When the user states how something works, check whether the code agrees. If you find a contradiction, surface it: "Your code cancels entire Orders, but you just said partial cancellation is possible. Which is right?"

### Update CONTEXT.md inline

When you resolve a term, update `CONTEXT.md` right then. Do not batch these up. Capture them as they happen. Use the format in [CONTEXT-FORMAT.md](./CONTEXT-FORMAT.md).

`CONTEXT.md` must contain no implementation details. Do not treat it as a spec, a scratch pad, or a store for implementation decisions. It is a glossary and nothing else.

### Offer ADRs sparingly

Offer to create an ADR only when all three of these are true:

1. **Hard to reverse** — the cost of changing your mind later is meaningful
2. **Surprising without context** — a future reader will ask "why did they do it this way?"
3. **The result of a real trade-off** — there were genuine alternatives and you picked one for specific reasons

If any of the three is missing, skip the ADR. Use the format in [ADR-FORMAT.md](./ADR-FORMAT.md).
