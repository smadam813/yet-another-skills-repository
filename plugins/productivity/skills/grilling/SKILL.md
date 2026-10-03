---
name: grilling
description: Grill the user about a plan, decision, or idea. Use when the user wants to stress-test their thinking, or says 'grill'.
---

Interview the user relentlessly until you reach a shared understanding. Map the problem as a **design tree**: every decision branches into the decisions that depend on it.

Work the tree in **rounds**. The **frontier** is every decision whose prerequisites are settled: the questions you can ask _now_ without guessing at answers you have not heard. Ask the whole frontier in one round. Number each question and give your recommended answer. Then wait for the user's answers.

When a question tool such as `AskUserQuestion` is available, use it to ask the round. Otherwise format the round like this:

```
❓ **Q1** - **<question title>**: <question body; may run several paragraphs and may offer choices>

➡️ <your recommended answer>

---

❓ **Q2** - **<question title>**: <question body; may run several paragraphs and may offer choices>

➡️ <your recommended answer>
```

Every answer reshapes the tree: a settled decision unblocks the questions that depended on it. Recompute the frontier and ask the next round. A question that depends on another question still open belongs to a _later_ round, not this one.

Finding _facts_ is your job, never the user's. When a frontier question needs a fact from the filesystem or your tools, send a subagent to find it. Never ask the user for anything you can look up yourself. Do not block on the subagent. A running search is an unsettled prerequisite, so only the questions downstream of it wait; ask the rest of the frontier now. The _decisions_ are the user's: put each to them and wait.

The session is done when the frontier is empty: every branch of the design tree visited, nothing left silently assumed. Do not act on the plan until the user confirms you have reached a shared understanding.
