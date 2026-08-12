# Issue tracker: Local Markdown

Issues and specs for this repo live as markdown files in `.scratch/`.

## Conventions

- One feature per directory: `.scratch/<feature-slug>/`
- The spec is `.scratch/<feature-slug>/spec.md`
- Implementation issues are one file per ticket, at `.scratch/<feature-slug>/issues/<NN>-<slug>.md`, numbered from `01`. Never use a single combined tickets file.
- Record triage state as a `Status:` line near the top of each issue file. See `triage-labels.md` for the role strings.
- Append comments and conversation history to the bottom of the file, under a `## Comments` heading.

## When a skill says "publish to the issue tracker"

Create a new file under `.scratch/<feature-slug>/`, creating the directory if it does not exist.

## When a skill says "fetch the relevant ticket"

Read the file at the referenced path. The user will normally pass you the path or the issue number directly.

## Wayfinding operations

`/wayfinder` uses these. The **map** is one file, with one **child** file per ticket.

- **Map**: `.scratch/<effort>/map.md`, holding the Notes, Decisions-so-far, and Fog body.
- **Child ticket**: `.scratch/<effort>/issues/NN-<slug>.md`, numbered from `01`, with the question in the body. A `Type:` line records the ticket type (`research`, `prototype`, `grilling`, `task`). A `Status:` line records `claimed` or `resolved`.
- **Blocking**: a `Blocked by: NN, NN` line near the top. A ticket is unblocked when every file it lists is `resolved`.
- **Frontier**: scan `.scratch/<effort>/issues/` for files that are open, unblocked, and unclaimed. The lowest number wins.
- **Claim**: set `Status: claimed` and save, before any work.
- **Resolve**: append the answer under an `## Answer` heading, set `Status: resolved`, then append a context pointer — a one-line summary plus a link — to the map's Decisions-so-far in `map.md`.
