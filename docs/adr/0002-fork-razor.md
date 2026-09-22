---
status: accepted
date: 2026-09-22
---

# Fork razor instead of vendoring it

razor arrived as a vendored copy of [V-Songbird/razor](https://github.com/V-Songbird/razor) at commit `b7d33ae` (1.6.0), with the rule that its hooks and tests stay as upstream wrote them. An architecture review found two changes worth making: the reconsideration ledger has no owner, so `pip install pyyaml` and `import yaml` give two nudges, and the PreToolUse gates are testable only by spawning node. We decided to fork, as ADR-0001 did for hush: razor is now this repo's own plugin, and repo conventions apply to all of its files.

## Considered options

- **Upstream first.** Open PRs against V-Songbird/razor and re-vendor on release. Rejected: every change waits on another maintainer's review and roadmap.
- **Listed divergence.** Keep vendoring and list each local change in the README. Rejected: the dispatcher change touches every hook file, so every later upstream pull becomes a manual merge.
- **Hard fork.** Chosen, although upstream ships often: 1.5.8 to 1.6.0 came out in one week.

## Consequences

- The README keeps the MIT attribution and one line naming the fork point. The per-change list against upstream goes.
- CLAUDE.md's vendored plugins section becomes a forked plugins section, and the steps for pulling an upstream release go.
- Upstream fixes are ported by hand when they matter. Nothing tracks upstream automatically.
- The version continues from 1.6.0 under this repo's bump rules. A hook change counts as a patch.
- The contract goldens, the `RAZOR_*` environment variables, and the plugin options stay fixed: they are razor's interface to users and to the host.
