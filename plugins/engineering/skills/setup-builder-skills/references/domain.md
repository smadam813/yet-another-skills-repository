# Domain Docs

How the engineering skills read this repo's domain documentation when they explore the codebase.

## Before exploring, read these

- **`CONTEXT.md`** at the repo root, or
- **`CONTEXT-MAP.md`** at the repo root if it exists: it points at one `CONTEXT.md` per context. Read each one that is relevant to the topic.
- **`docs/adr/`**: read the ADRs that touch the area you are about to work in. In multi-context repos, also check `src/<context>/docs/adr/` for context-scoped decisions.

If one of these files does not exist, **continue without comment**. Do not report that it is missing. Do not suggest that the user create it. The `/domain-modeling` skill, which `/grill-with-docs` and `/improve-codebase-architecture` call, creates these files when the project resolves a term or a decision.

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

Multi-context repo (a `CONTEXT-MAP.md` is present at the root):

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

## Use the glossary's terms

When your output names a domain concept, in an issue title, a refactor proposal, a hypothesis, or a test name, use the term as `CONTEXT.md` defines it. Do not use a synonym that the glossary rejects.

If the glossary does not contain the concept you need, there are two possible causes. Either you are inventing language that the project does not use, and you must reconsider the term, or the glossary has a real gap, and you must note it for `/domain-modeling`.

## Flag ADR conflicts

If your output contradicts an ADR, say so. Do not override the ADR without comment:

> _Contradicts ADR-0007 (event-sourced orders), but worth reopening because…_
