# Issue tracker: Local Markdown

Issues and specs for this repo live as markdown files in `.scratch/`.

## Conventions

- One feature per directory: `.scratch/<feature-slug>/`
- The spec is `.scratch/<feature-slug>/spec.md`
- Write one file per implementation ticket at `.scratch/<feature-slug>/issues/<NN>-<slug>.md`. Number the files from `01`. Do not write a single combined tickets file.
- Record triage state in a `Status:` line near the top of each issue file. See `triage-labels.md` for the role strings.
- Append comments and conversation history to the bottom of the file, under a `## Comments` heading.

## When a skill says "publish to the issue tracker"

Create a new file under `.scratch/<feature-slug>/`. Create the directory if it does not exist.

## When a skill says "fetch the relevant ticket"

Read the file at the referenced path. The user normally gives you the path or the issue number.

## Wayfinding operations

Used by `/wayfinder`. The **map** is one file, and each **child** file is a ticket.

- **Map**: `.scratch/<effort>/map.md`, which holds the Notes / Decisions-so-far / Fog body.
- **Child ticket**: `.scratch/<effort>/issues/NN-<slug>.md`, numbered from `01`, with the question in the body. A `Type:` line records the ticket type (`research`/`prototype`/`grilling`/`task`). A `Status:` line records `claimed` or `resolved`.
- **Blocking**: a `Blocked by: NN, NN` line near the top. A ticket is unblocked when every file it lists is `resolved`.
- **Frontier**: scan `.scratch/<effort>/issues/` for files that are open, unblocked, and unclaimed. Take the lowest number.
- **Claim**: set `Status: claimed` and save the file before you start work.
- **Resolve**: append the answer under an `## Answer` heading, set `Status: resolved`, then append a context pointer (gist and link) to the map's Decisions-so-far in `map.md`.
