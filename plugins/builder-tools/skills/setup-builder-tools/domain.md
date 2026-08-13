# Domain Docs

How the engineering skills should read this repo's domain documentation when they explore the codebase.

## Before exploring, read these

- **`CONTEXT.md`** at the repo root, or
- **`CONTEXT-MAP.md`** at the repo root if it exists. It points at one `CONTEXT.md` per context. Read each one relevant to the topic.
- **`docs/adr/`** — read the ADRs that touch the area you are about to work in. In multi-context repos, also check `src/<context>/docs/adr/` for context-scoped decisions.

If any of these files do not exist, **proceed silently**. Do not flag their absence, and do not suggest creating them up front. The `/domain-modeling` skill — reached via `/grill-with-docs` and `/improve-codebase-architecture` — creates them lazily, when terms or decisions are actually resolved.

## File structure

Single-context repo (most repos):

```
/
├── CONTEXT.md
├── docs/adr/
│   ├── 0001-event-sourced-orders.md
│   └── 0002-postgres-for-write-model.md
└── src/
```

Multi-context repo (a `CONTEXT-MAP.md` exists at the root):

```
/
├── CONTEXT-MAP.md
├── docs/adr/                          ← system-wide decisions
└── src/
    ├── ordering/
    │   ├── CONTEXT.md
    │   └── docs/adr/                  ← context-specific decisions
    └── billing/
        ├── CONTEXT.md
        └── docs/adr/
```

## Use the glossary's vocabulary

When your output names a domain concept — in an issue title, a refactor proposal, a hypothesis, a test name — use the term as `CONTEXT.md` defines it. Do not drift to the synonyms the glossary tells you to avoid.

If the concept you need is not in the glossary yet, that is a signal. Either you are inventing language the project does not use, so reconsider, or there is a real gap, so note it for `/domain-modeling`.

## Flag ADR conflicts

If your output contradicts an existing ADR, say so explicitly rather than overriding it silently:

> _Contradicts ADR-0007 (event-sourced orders) — but worth reopening because…_
