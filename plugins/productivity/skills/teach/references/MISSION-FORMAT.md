# MISSION.md Format

`MISSION.md` lives at the workspace root. It holds the _reason_ the user is learning this topic. Every teaching decision traces back to this document: what to teach next, which resources to surface, and which lessons to design.

## Template

```md
# Mission: {Topic}

## Why
{1-3 sentences. The concrete real-world goal the user is chasing. What changes in their life or work when they have this skill? Do not write abstract goals such as "to understand X". Push for the outcome underneath.}

## Success looks like
- {A specific, observable thing the user will be able to do}
- {Another specific thing}
- {...}

## Constraints
- {Time, budget, prior commitments, learning preferences, anything that bounds the approach}

## Out of scope
- {Adjacent topics the user does not want to chase right now. This protects the zone of proximal development.}
```

## Rules

- **One mission per workspace.** If the user wants to learn two unrelated things, that is two workspaces.
- **Concrete over abstract.** "Run a half marathon by October" beats "get fitter." "Ship a Rust CLI to my team" beats "learn Rust."
- **Push back on vagueness.** If the user cannot say why, interview them before you write anything. A bad mission is worse than no mission.
- **Revise when reality shifts.** Missions change. When the user's goal moves, update this file. Do not let a stale mission steer future sessions.
- **Keep it short.** If `MISSION.md` runs past a screen, it has stopped being a compass and started being a plan.
