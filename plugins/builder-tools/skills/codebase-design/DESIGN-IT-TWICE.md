# Design It Twice

When the user wants to explore alternative interfaces for a chosen deepening candidate, use this parallel sub-agent pattern. It is based on "Design It Twice" (Ousterhout): your first idea is unlikely to be the best.

It uses the vocabulary in [SKILL.md](SKILL.md) — **module**, **interface**, **seam**, **adapter**, **leverage**.

## Process

### 1. Frame the problem space

Before you start sub-agents, write a user-facing explanation of the problem space for the chosen candidate:

- The constraints any new interface must satisfy
- The dependencies it would rely on, and which category they fall into (see [DEEPENING.md](DEEPENING.md))
- A rough code sketch to make the constraints concrete. This is not a proposal. It only grounds the constraints.

Show this to the user, then go straight to Step 2. The user reads and thinks while the sub-agents work in parallel.

### 2. Start sub-agents

Start 3 or more sub-agents in parallel. Each one must produce a **radically different** interface for the deepened module.

Give each sub-agent a separate technical brief: file paths, coupling details, the dependency category from [DEEPENING.md](DEEPENING.md), and what sits behind the seam. The brief is independent of the user-facing explanation in Step 1. Give each agent a different design constraint:

- Agent 1: "Minimize the interface. Aim for 1 to 3 entry points at most. Maximize leverage per entry point."
- Agent 2: "Maximize flexibility. Support many use cases and extension."
- Agent 3: "Optimize for the most common caller. Make the default case trivial."
- Agent 4 (if applicable): "Design around ports and adapters for cross-seam dependencies."

Include both the [SKILL.md](SKILL.md) vocabulary and the CONTEXT.md vocabulary in the brief. Each sub-agent then names things consistently with the architecture language and with the project's domain language.

Each sub-agent outputs:

1. Interface — types, methods, params, plus invariants, ordering, and error modes
2. Usage example showing how callers use it
3. What the implementation hides behind the seam
4. Dependency strategy and adapters (see [DEEPENING.md](DEEPENING.md))
5. Trade-offs — where leverage is high, where it is thin

### 3. Present and compare

Present the designs one at a time so the user can absorb each one, then compare them in prose. Contrast them by **depth** (leverage at the interface), **locality** (where change concentrates), and **seam placement**.

After the comparison, give your own recommendation: which design you think is strongest, and why. If elements from different designs would combine well, propose a hybrid. Be opinionated. The user wants a strong read, not a menu.
