---
name: improve-codebase-architecture
description: Scan a codebase for deepening opportunities, present them as a visual HTML report, then grill the one you pick.
disable-model-invocation: true
---

# Improve Codebase Architecture

Find architectural friction and propose **deepening opportunities**: refactors that turn shallow modules into deep ones. The aim is testability and AI-navigability.

This command reads the project's domain model and uses a shared design vocabulary:

- Call the Skill tool with "codebase-design" for the architecture vocabulary (**module**, **interface**, **depth**, **seam**, **adapter**, **leverage**, **locality**) and its principles (the deletion test, "the interface is the test surface", "one adapter = hypothetical seam, two = real"). Use these terms exactly in every suggestion, and do not drift into "component," "service," "API," or "boundary."
- The domain language in `CONTEXT.md` gives names to good seams; ADRs in `docs/adr/` record decisions this command should not reopen.

## Process

### 1. Explore

**Decide where to look before you look.** Deepening a module pays off by making future changes to it easier, so weight the parts of the codebase that have changed recently:

- If the user named a direction — a module, a subsystem, a source of friction — take it and skip the next step.
- Otherwise, read back through the commit history (`git log --oneline`) and find the files and areas that keep coming up. Start there. If the changes are scattered with no clear hot spot, scan more widely.

Read the project's domain glossary (`CONTEXT.md`) and any ADRs in the area you are touching first.

Then spawn a subagent to read through the codebase. Do not work from a fixed checklist: explore, and note where you hit friction:

- Where does one concept only make sense after reading many small modules?
- Where are modules **shallow**, with an interface nearly as complex as the implementation?
- Where has someone extracted pure functions just for testability, while the real bugs hide in how those functions are called (no **locality**)?
- Where do tightly-coupled modules leak across their seams?
- Which parts of the codebase are untested, or hard to test through their current interface?

Apply the **deletion test** to anything you suspect is shallow: would deleting it concentrate complexity, or just move it? "Concentrates" is the signal you want.

### 2. Present candidates as an HTML report

Write a self-contained HTML file to the OS temp directory so nothing lands in the repo. Read the temp directory from `$TMPDIR`, falling back to `/tmp` (or `%TEMP%` on Windows), and write to `<tmpdir>/architecture-review-<timestamp>.html` so each run gets a fresh file. Open it for the user (`xdg-open <path>` on Linux, `open <path>` on macOS, `start <path>` on Windows) and tell them the absolute path.

The report uses **Tailwind via CDN** for layout and styling, and **Mermaid via CDN** for diagrams where a graph, flow, or sequence shows the structure reliably. Mix Mermaid with hand-crafted CSS and SVG: use Mermaid when relationships are graph-shaped (call graphs, dependencies, sequences), and hand-built divs and SVG when you want something more editorial (mass diagrams, cross-sections, collapse animations). Each candidate gets a **before/after visualisation**. Be visual.

For each candidate, render a card with:

- **Files**: which files and modules are involved
- **Problem**: why the current architecture causes friction
- **Solution**: plain English description of what would change
- **Benefits**: stated in terms of locality and leverage, and how tests would improve
- **Before / After diagram**: side-by-side, custom-drawn, showing the shallowness and the deepening
- **Recommendation strength**: one of `Strong`, `Worth exploring`, `Speculative`, rendered as a badge

End the report with a **Top recommendation** section: which candidate you would tackle first and why.

**Use CONTEXT.md vocabulary for the domain, and the `/codebase-design` vocabulary for the architecture.** If `CONTEXT.md` defines "Order," talk about "the Order intake module," not "the FooBarHandler," and not "the Order service."

**ADR conflicts**: if a candidate contradicts an existing ADR, raise it only when the friction is real enough to justify revisiting the ADR. Mark it clearly in the card (e.g. a warning callout: _"contradicts ADR-0007, but worth reopening because…"_). Do not list every theoretical refactor an ADR forbids.

See [HTML-REPORT.md](references/HTML-REPORT.md) for the full HTML scaffold, diagram patterns, and styling guidance.

Do NOT propose interfaces yet. After you write the file, ask the user: "Which of these would you like to explore?"

### 3. Grilling loop

Once the user picks a candidate, call the Skill tool with "grilling" to walk the decision tree with them: constraints, dependencies, the shape of the deepened module, what sits behind the seam, what tests survive.

Make the changes below inline as decisions firm up; call the Skill tool with "domain-modeling" to keep the domain model current as you go:

- **Naming a deepened module after a concept not in `CONTEXT.md`?** Add the term to `CONTEXT.md`. Create the file lazily if it does not exist.
- **Sharpening a fuzzy term during the conversation?** Update `CONTEXT.md` right there.
- **User rejects the candidate with a load-bearing reason?** Offer an ADR, framed as: _"Want me to record this as an ADR so future architecture reviews do not re-suggest it?"_ Only offer when a future review would need that reason to avoid re-suggesting the same thing; skip temporary reasons ("not worth it right now") and self-evident ones.
- **Want to explore alternative interfaces for the deepened module?** Call the Skill tool with "codebase-design" and use its design-it-twice parallel subagent pattern.
