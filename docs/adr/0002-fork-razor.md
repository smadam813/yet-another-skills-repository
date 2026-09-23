---
status: accepted
date: 2026-09-22
---

# Fork razor instead of vendoring it

razor arrived as a vendored copy at 1.6.0, with the rule that its hooks and tests stay unchanged. An architecture review found two changes worth making: the reconsideration ledger has no owner, so `pip install pyyaml` and `import yaml` give two nudges, and the PreToolUse gates are testable only by spawning node. We decided to fork, as ADR-0001 did for hush: razor is now this repo's own plugin, and repo conventions apply to all of its files.

## Considered options

- **Change at the source.** Send each change to the source project and re-vendor on release. Rejected: every change waits on another maintainer's review and roadmap.
- **Listed divergence.** Keep vendoring and list each local change in the README. Rejected: the dispatcher change touches every hook file, so every later re-vendor becomes a manual merge.
- **Hard fork.** Chosen.

## Consequences

- The README carries no fork note and no per-change list.
- CLAUDE.md's vendored plugins section becomes a forked plugins section, and the re-vendor steps go.
- The version continues from 1.6.0 under this repo's bump rules. A hook change counts as a patch.
- The contract goldens, the `RAZOR_*` environment variables, and the plugin options stay fixed: they are razor's interface to users and to the host.
