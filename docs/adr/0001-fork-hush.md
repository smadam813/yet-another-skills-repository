---
status: accepted
date: 2026-09-20
---

# Fork hush instead of vendoring it

hush arrived as a vendored copy of [V-Songbird/hush](https://github.com/V-Songbird/hush) at commit `6ef6c1c` (1.12.1), with the rule that its hooks and tests stay as upstream wrote them. An architecture review found the hook code worth restructuring: the exit trailer protocol is duplicated across two hooks, four modules write into the session's sidecar directory, and the tool-output transform is testable only by spawning node. We decided to fork: hush is now this repo's own plugin, and repo conventions apply to all of its files.

## Considered options

- **Upstream first.** Open PRs against V-Songbird/hush and re-vendor on release. Rejected: it makes every change wait on another maintainer's review and roadmap.
- **Listed divergence.** Keep vendoring and list each local change in the README. Rejected: a refactor of this size makes every later upstream pull a manual merge, and the change list stops describing anything useful.
- **Hard fork.** Chosen.

## Consequences

- The README keeps the MIT attribution and one line naming the fork point. The per-change list against upstream goes.
- CLAUDE.md's vendored plugins section names razor only.
- Upstream fixes are ported by hand when they matter. Nothing tracks upstream automatically.
- The version continues from 1.12.1 under this repo's bump rules. A hook change counts as a patch.
- The contract goldens, the environment variables, and the `saved.json` path stay fixed: they are hush's interface to users and to the host.
