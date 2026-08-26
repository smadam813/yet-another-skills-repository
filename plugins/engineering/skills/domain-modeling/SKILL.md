---
name: domain-modeling
description: Build and sharpen a project's domain model. Use when discussing codebase terminology, writing or editing a CONTEXT.md, or recording or editing an ADR.
---

Build and sharpen the project's domain model as you design: challenge terms, invent edge-case scenarios, and write the glossary and the decisions down as they settle. (Reading `CONTEXT.md` for vocabulary is not this skill; any skill can do that. This skill is for changing the model, not consuming it.)

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

If a `CONTEXT-MAP.md` exists at the root, the repo has multiple contexts. The map points to where each one lives:

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

Create files only when you have something to write. If no `CONTEXT.md` exists, create one when you resolve the first term. If no `docs/adr/` exists, create it when you write the first ADR.

## During the session

### Challenge against the glossary

When the user uses a term that conflicts with the language in `CONTEXT.md`, say so immediately. "Your glossary defines 'cancellation' as X, but you seem to mean Y. Which is it?"

### Sharpen vague terms

When the user uses a vague or overloaded term, propose a precise canonical one. "You are saying 'account': do you mean the Customer or the User? Those are different things."

### Discuss concrete scenarios

When you and the user discuss domain relationships, test them against specific scenarios. Invent scenarios that probe edge cases and force the user to be precise about the boundaries between concepts.

### Cross-reference with code

When the user states how something works, check whether the code agrees. If you find a contradiction, surface it: "Your code cancels entire Orders, but you just said partial cancellation is possible. Which is right?"

### Update CONTEXT.md inline

When you resolve a term, update `CONTEXT.md` immediately. Do not save the changes up for the end of the session. Use the format in [CONTEXT-FORMAT.md](references/CONTEXT-FORMAT.md).

Keep implementation details out of `CONTEXT.md`. It is not a spec, a scratch pad, or a record of implementation decisions. It is a glossary and nothing else.

### Offer ADRs sparingly

Only offer to create an ADR when all three are true:

1. **Hard to reverse**: the cost of changing your mind later is meaningful
2. **Surprising without context**: a future reader will wonder "why did they do it this way?"
3. **The result of a real trade-off**: there were genuine alternatives and you picked one for specific reasons

If any of the three is missing, skip the ADR. Use the format in [ADR-FORMAT.md](references/ADR-FORMAT.md).
