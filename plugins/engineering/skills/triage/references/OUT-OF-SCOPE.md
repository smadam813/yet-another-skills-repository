# Out-of-Scope Knowledge Base

The `.out-of-scope/` directory in a repo keeps a permanent record of each rejected feature request. It has two purposes:

1. **Memory**: it records why a feature was rejected, so the reasoning survives the closed issue
2. **Deduplication**: when a new issue matches a prior rejection, the skill can show the earlier decision instead of arguing it again

## Directory structure

```
.out-of-scope/
├── dark-mode.md
├── plugin-system.md
└── graphql-api.md
```

One file per **concept**, not per issue. Group every issue that asks for the same thing under one file.

## File format

Write the file in a relaxed, readable style, more like a short design document than a database entry. Use paragraphs, code samples, and examples so the reasoning is clear and useful to someone reading it for the first time.

```markdown
# Dark Mode

This project does not support dark mode or user-facing theming.

## Why this is out of scope

The rendering pipeline assumes a single color palette defined in
`ThemeConfig`. Supporting multiple themes would require:

- A theme context provider wrapping the entire component tree
- Per-component theme-aware style resolution
- A persistence layer for user theme preferences

That is a large architectural change, and it does not fit the project's
focus on content authoring. Theming is a concern for downstream consumers
who embed or redistribute the output.

```ts
// The current ThemeConfig interface is not designed for runtime switching:
interface ThemeConfig {
  colors: ColorPalette; // single palette, resolved at build time
  fonts: FontStack;
}
```

## Prior requests

- #42: "Add dark mode support"
- #87: "Night theme for accessibility"
- #134: "Dark theme option"
```

### Naming the file

Use a short, descriptive kebab-case name for the concept: `dark-mode.md`, `plugin-system.md`, `graphql-api.md`. Make the name clear enough that someone reading the directory listing knows what was rejected without opening the file.

### Writing the reason

Give a real reason: write why, not "we do not want this". A good reason points to one of these:

- Project scope or philosophy ("This project focuses on X; theming is a downstream concern")
- Technical constraints ("Supporting this would require Y, which conflicts with our Z architecture")
- Strategic decisions ("We chose to use A instead of B because...")

The reason must be durable. Do not cite temporary circumstances such as "we are too busy right now"; those are deferrals, not rejections.

## When to check `.out-of-scope/`

During triage (Step 1: Gather context), read every file in `.out-of-scope/`. Then, for the new issue:

- Check whether the request matches an existing out-of-scope concept
- Match by concept, not by keyword: "night theme" matches `dark-mode.md`
- If it matches, show the maintainer: "This is similar to `.out-of-scope/dark-mode.md`. We rejected this before because [reason]. Do you still feel the same way?"

The maintainer may:

- **Confirm**: add the new issue to the file's "Prior requests" list, then close it
- **Reconsider**: delete or update the out-of-scope file, then run the issue through normal triage
- **Disagree**: the requests are related but different; run normal triage

## When to write to `.out-of-scope/`

Write here only when you reject an **enhancement** (not a bug) as `wontfix`. This applies to enhancement PRs exactly as it does to issues: record a rejected PR here so the same request does not return as new code.

Do **not** write here when you close something as `wontfix` because it is **already implemented**. That is a built feature, not a rejected one, and recording it would add false rejections to the deduplication checks. Point the closing comment at the existing feature instead.

The steps:

1. The maintainer decides a feature request is out of scope
2. Check whether a matching `.out-of-scope/` file already exists
3. If yes: append the new issue to the "Prior requests" list
4. If no: create a new file with the concept name, decision, reason, and first prior request
5. Post a comment on the issue explaining the decision and naming the `.out-of-scope/` file
6. Close the issue with the `wontfix` label

## Updating or removing out-of-scope files

If the maintainer changes their mind about a concept they rejected before:

- Delete the `.out-of-scope/` file
- Do not reopen the old issues; they are historical records
- Run the new issue that prompted the change through normal triage
