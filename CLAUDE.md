## What this repo is

A Claude Code **plugin marketplace** with no plugins in it yet. Everything tracked here is
`.claude-plugin/marketplace.json`, a `.gitignore`, the MIT `LICENSE`, and this file. There
is no application code, no build step, and no test suite. `plugins/` is an empty directory
waiting for its first plugin.

## Commands

Validation is the only build-like step:

```
claude plugin validate .
```

It passes today with one warning — `plugins: Marketplace has no plugins defined`. That
warning is expected while the `plugins` array is `[]`, and it goes away once a plugin is
registered.

## Adding a plugin

Two things happen together:

1. Create `plugins/<name>/.claude-plugin/plugin.json`. The skills live beside it, one
   directory each, at `plugins/<name>/skills/<skill>/SKILL.md`.
2. Add an entry to the `plugins` array in `marketplace.json`: `name`, `source`
   (`./plugins/<name>`), `description`, `license`, and `keywords`. `plugin.json` carries
   its own copy of `description`, `license`, and `keywords` — change one, change the other.

Then validate the plugin on its own, and try it without installing the marketplace:

```
claude plugin validate ./plugins/<name> --strict
claude --plugin-dir ./plugins/<name>
```
