## What this repo is

A **plugin marketplace for both Claude Code and Cursor**, with no plugins in it yet.
Everything tracked here is the two marketplace manifests, `scripts/`, `.github/workflows/`,
the `README`, a `.gitignore`, the MIT `LICENSE`, and this file. There is no application code
and no test suite. `plugins/` is an empty directory waiting for its first plugin.

Both tools read the same `skills/<skill>/SKILL.md` layout, so one plugin tree serves both.
Only the manifests pointing at it differ:

|                 | Claude Code                                 | Cursor                                                      |
| --------------- | ------------------------------------------- | ----------------------------------------------------------- |
| Marketplace     | `.claude-plugin/marketplace.json`           | `.cursor-plugin/marketplace.json`                            |
| Plugin manifest | `plugins/<name>/.claude-plugin/plugin.json` | `plugins/<name>/.cursor-plugin/plugin.json`                  |
| Entry `source`  | the full path, `./plugins/<name>`           | just `<name>`, prefixed by `metadata.pluginRoot: "plugins"`  |

So a plugin carries two manifests over one shared `skills/` directory. Neither tool reads
the other's files and neither is aware of the other, so nothing here is conditional — it is
the same plugin, described twice.

## Commands

```
node scripts/check-marketplace.mjs   # both marketplaces; needs neither tool installed
claude plugin validate .             # the Claude Code half only, if you have it
```

`check-marketplace.mjs` is the check that counts, and the one CI runs. It catches a plugin
registered in one marketplace but not the other, drift between the paired manifests, a
`source` that resolves nowhere, and a skill whose `name` does not match its directory. It
has no dependencies and needs neither tool installed, so someone working here with only
Cursor can still verify both halves — Cursor has no CLI validator of its own.

`claude plugin validate` is a weaker second opinion, not a substitute. It never opens the
Cursor manifests, and it is less strict than the name suggests: given a plugin whose
`source` directory does not exist, it prints `✔ Validation passed` and exits 0. Use it for
schema mistakes in the Claude manifest and let the checker decide whether the repo is sound.

Don't add `--strict` to that marketplace-level command. While `plugins` is `[]` it warns
that the marketplace has no plugins defined, and `--strict` turns that expected warning into
a failure. Per-plugin `--strict` is worth running; see the last section.

The checker reports no errors and no warnings today, having nothing to check.

## Continuous integration

`.github/workflows/validate.yml` runs `node scripts/check-marketplace.mjs` on every pull
request targeting `main`, on pushes to `main`, and on demand. It installs no dependencies
and does not install the Claude Code CLI: the checker already covers more than
`claude plugin validate` does, and `--strict` would fail on the expected empty-`plugins`
warning anyway.

Running is not the same as blocking. To stop a merge, mark the check required on `main`
under **Settings → Rules → Rulesets**. The check is named `validate`, after the job — a
workflow's own `name:` is never a valid required check.

The workflow deliberately has no `paths:` filter. A filtered-out check never reports, and a
required check that never reports leaves the pull request permanently unmergeable.

## Adding a plugin

Four things happen together:

1. Create `plugins/<name>/`, with the skills one directory each at
   `plugins/<name>/skills/<skill>/SKILL.md`.
2. Write `plugins/<name>/.claude-plugin/plugin.json` and
   `plugins/<name>/.cursor-plugin/plugin.json`. Give both the same `name`, `description`,
   `version`, `license`, `keywords`, and an `author` — `--strict` validation fails without
   one. The Cursor manifest also needs `"skills": "./skills/"`; Claude Code finds `skills/`
   on its own.
3. Add an entry to `.claude-plugin/marketplace.json`: `name`, `source` (`./plugins/<name>`),
   `description`, `license`, `keywords`.
4. Add an entry to `.cursor-plugin/marketplace.json`: `name`, `source` (`<name>`, which
   resolves under `pluginRoot`), `description`.

The description repeats across all four files. The checker fails when they disagree.

## Writing a skill both tools load

Give every `SKILL.md` a `name` and a `description`, even though Claude Code treats both as
optional. Cursor requires them, and requires `name` to equal the skill's directory name, in
lowercase letters, numbers and hyphens.

Both tools act on `paths`, `disable-model-invocation`, `license`, `compatibility` and
`metadata`. Claude Code alone acts on `allowed-tools`, `when_to_use`, `argument-hint`,
`arguments`, `user-invocable`, `disallowed-tools`, `model`, `effort`, `context`, `agent`,
`background`, `hooks` and `shell`. Cursor alone acts on `icon` and `color`. Each tool
ignores the other's fields in silence, so a skill may use them, but it has to still work
without them.

The body has the same split. `$ARGUMENTS`, `${CLAUDE_PLUGIN_ROOT}`, `${CLAUDE_SKILL_DIR}`
and `` !`command` `` injection are Claude Code features; Cursor passes them through as
literal text.

## Trying a plugin before it ships

```
node scripts/check-marketplace.mjs
claude plugin validate ./plugins/<name> --strict
claude --plugin-dir ./plugins/<name>
```

Cursor has no equivalent flag. Copy or symlink the plugin directory to
`~/.cursor/plugins/local/<name>`, then run **Developer: Reload Window**.
