---
name: improve-codebase-architecture
description: Scan a codebase for deepening opportunities, present them as a visual HTML report, then grill through whichever one you pick.
disable-model-invocation: true
license: MIT
metadata:
  vendored: modified
  upstream_source: https://github.com/mattpocock/skills
  upstream_path: skills/engineering/improve-codebase-architecture/SKILL.md
  upstream_author: Matt Pocock
  upstream_copyright: Copyright (c) 2026 Matt Pocock
  upstream_license: MIT
  local_changes: >-
    Prose edited for plain English per the /orwell-writing skill: American
    spelling, shorter sentences, active voice, decorative idiom removed.
    The bare "YAGNI" aside was replaced by the sentence it stood for: a
    module that will not change again buys nothing from being deepened.
    The process, card fields, and vocabulary rules are unchanged.
  note: >-
    See NOTICE at the repository root.
---

# Improve Codebase Architecture

Surface architectural friction and propose **deepening opportunities** — refactors that turn shallow modules into deep ones. The aim is testability and AI-navigability.

The project's domain model informs this command, and a shared design vocabulary supports it:

- Run the `/codebase-design` skill for the architecture vocabulary (**module**, **interface**, **depth**, **seam**, **adapter**, **leverage**, **locality**) and its principles: the deletion test, "the interface is the test surface", and "one adapter means a hypothetical seam, two means a real one". Use these terms exactly in every suggestion. Do not drift into "component," "service," "API," or "boundary."
- The domain language in `CONTEXT.md` gives names to good seams. ADRs in `docs/adr/` record decisions this command must not reopen.

## Process

### 1. Explore

**Scope before you scan.** Deepening a module pays off by making future changes to it easier. A module that will not change again buys nothing from being deepened, so do not spend the effort there. Weight the parts of the codebase that changed recently. Decide *where* to look before you look:

- If the user named a direction — a module, a subsystem, a pain point — take it and skip the inference below.
- Otherwise, read back through the commit history (`git log --oneline`) to find the codebase's hot spots: the files and areas that keep coming up. Look at those paths first. If the changes are scattered and no hot spot appears, widen the search.

Read the project's domain glossary (`CONTEXT.md`) first, plus any ADRs in the area you are touching.

Then send a sub-agent to explore the codebase. Do not follow a rigid checklist. Explore, and note where you meet friction:

- Where does understanding one concept force you to move between many small modules?
- Where are modules **shallow**, with an interface nearly as complex as the implementation?
- Where have pure functions been extracted for testability alone, while the real bugs hide in how they are called? That is missing **locality**.
- Where do tightly-coupled modules leak across their seams?
- Which parts of the codebase are untested, or hard to test through their current interface?

Apply the **deletion test** to anything you suspect is shallow. Would deleting it concentrate complexity, or only move it? "Yes, it concentrates" is the signal you want.

### 2. Present candidates as an HTML report

Write a self-contained HTML file to the OS temp directory, so nothing lands in the repo. Resolve the temp directory from `$TMPDIR`, falling back to `/tmp` (or `%TEMP%` on Windows), and write to `<tmpdir>/architecture-review-<timestamp>.html` so each run gets a fresh file. Open it for the user — `xdg-open <path>` on Linux, `open <path>` on macOS, `start <path>` on Windows — and tell them the absolute path.

The report uses **Tailwind via CDN** for layout and styling, and **Mermaid via CDN** for diagrams where a graph, flow, or sequence communicates the structure reliably. Mix Mermaid with hand-built CSS and SVG visuals. Use Mermaid when the relationships are graph-shaped — call graphs, dependencies, sequences. Use hand-built divs and SVG when you want something more editorial: mass diagrams, cross-sections, collapse animations. Each candidate gets a **before and after visualization**. Be visual.

For each candidate, render a card with:

- **Files** — which files or modules are involved
- **Problem** — why the current architecture causes friction
- **Solution** — a plain English description of what would change
- **Benefits** — stated in terms of locality and leverage, and how tests would improve
- **Before / After diagram** — side by side, custom-drawn, showing the shallowness and the deepening
- **Recommendation strength** — one of `Strong`, `Worth exploring`, `Speculative`, rendered as a badge

End the report with a **Top recommendation** section: which candidate you would tackle first, and why.

**Use the CONTEXT.md vocabulary for the domain, and the `/codebase-design` vocabulary for the architecture.** If `CONTEXT.md` defines "Order," write "the Order intake module" — not "the FooBarHandler," and not "the Order service."

**ADR conflicts**: if a candidate contradicts an existing ADR, surface it only when the friction is real enough to justify reopening the ADR. Mark it clearly in the card — for example, a warning callout: _"contradicts ADR-0007 — but worth reopening because…"_. Do not list every theoretical refactor an ADR forbids.

See [HTML-REPORT.md](HTML-REPORT.md) for the full HTML scaffold, diagram patterns, and styling guidance.

Do NOT propose interfaces yet. After you write the file, ask the user: "Which of these would you like to explore?"

### 3. Grilling loop

Once the user picks a candidate, run the `/grilling` skill to walk the decision tree with them: constraints, dependencies, the shape of the deepened module, what sits behind the seam, and which tests survive.

Side effects happen inline as decisions settle. Run the `/domain-modeling` skill to keep the domain model current as you go:

- **Naming a deepened module after a concept not in `CONTEXT.md`?** Add the term to `CONTEXT.md`. Create the file lazily if it does not exist.
- **Sharpening a fuzzy term during the conversation?** Update `CONTEXT.md` right then.
- **User rejects the candidate for a reason that will still matter later?** Offer an ADR, framed as: _"Want me to record this as an ADR so future architecture reviews don't re-suggest it?"_ Offer it only when a future explorer would need that reason to avoid re-suggesting the same thing. Skip temporary reasons ("not worth it right now") and obvious ones.
- **Want to explore alternative interfaces for the deepened module?** Run the `/codebase-design` skill and use its design-it-twice parallel sub-agent pattern.
