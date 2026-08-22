# Design It Twice

When the user wants to explore alternative interfaces for a chosen deepening candidate, use this parallel subagent pattern. It comes from "Design It Twice" (Ousterhout): your first idea is rarely the best.

Uses the vocabulary in [SKILL.md](../SKILL.md): **module**, **interface**, **seam**, **adapter**, **leverage**.

## Process

### 1. Frame the problem space

Before you spawn subagents, write an explanation of the problem space for the chosen candidate. Write it for the user, and cover:

- The constraints any new interface must satisfy
- The dependencies it would rely on, and the category each one falls into (see [DEEPENING.md](DEEPENING.md))
- A rough code sketch that makes the constraints concrete. It grounds the constraints; it is not a proposal

Show this to the user, then go straight to Step 2. Do not wait for a reply: the user reads and thinks while the subagents work.

### 2. Spawn subagents

Spawn three or more subagents in parallel. Each one must produce a **radically different** interface for the deepened module.

Give each subagent its own technical brief: file paths, coupling details, the dependency category from [DEEPENING.md](DEEPENING.md), and what sits behind the seam. Do not reuse the Step 1 explanation as the brief. Give each subagent a different design constraint:

- Subagent 1: "Minimize the interface. Aim for one to three entry points. Maximize leverage per entry point."
- Subagent 2: "Maximize flexibility. Support many use cases and extension."
- Subagent 3: "Optimize for the most common caller. Make the default case trivial."
- Subagent 4 (if it applies): "Design around ports and adapters for dependencies that cross the seam."

Put the vocabulary from [SKILL.md](../SKILL.md) and from CONTEXT.md in every brief, so each subagent names things consistently with the architecture language and the project's domain language.

Each subagent returns:

1. The interface: types, methods, and parameters, plus invariants, ordering, and error modes
2. A usage example that shows how callers use it
3. What the implementation hides behind the seam
4. The dependency strategy and adapters (see [DEEPENING.md](DEEPENING.md))
5. Trade-offs: where leverage is high, and where it is thin

### 3. Present and compare

Present the designs one at a time, so the user can absorb each one. Then compare them in prose. Contrast them by **depth** (leverage at the interface), **locality** (where change concentrates), and **seam placement**.

After the comparison, recommend one. Say which design is strongest and why. If elements from different designs would combine well, propose a hybrid. Be opinionated: the user wants a strong read, not a menu.
