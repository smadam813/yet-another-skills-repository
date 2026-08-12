---
name: grilling
description: Grill the user relentlessly about a plan, decision, or idea. Use when the user wants to stress-test their thinking, or uses any 'grill' trigger phrases.
license: MIT
metadata:
  vendored: modified
  upstream_source: https://github.com/mattpocock/skills
  upstream_path: skills/productivity/grilling/SKILL.md
  upstream_author: Matt Pocock
  upstream_copyright: Copyright (c) 2026 Matt Pocock
  upstream_license: MIT
  local_changes: >-
    Prose edited for plain English per the /orwell-writing skill: shorter
    sentences, active voice, decorative idiom removed. The question format
    block and the rules of the round are unchanged.
  note: >-
    See NOTICE at the repository root.
---

Interview the user relentlessly until you reach a shared understanding. Map the work as a **design tree**: every decision branches into the decisions that depend on it.

Work the tree in **rounds**. The **frontier** is every decision whose prerequisites are already settled. These are the questions you can ask _now_ without guessing at answers you have not heard yet. Ask the whole frontier in one round. Number each question and give your recommended answer. Then wait for the user's answers before the next round.

Format each question like this:

```
❓ **Q1** - **<question title>**: <question body, might be multiple paragraphs, including multiple choices>

➡️ <your recommended answer>
```

Each round of answers reshapes the tree. Settled decisions push the frontier outward and unblock the questions that depended on them. Recompute the frontier and ask the next round. If a question's answer depends on another question that is still open in this round, it belongs to a _later_ round, not this one.

Finding _facts_ is your job, never the user's. When a frontier question needs a fact from the environment — the filesystem, a tool, anything you can reach — send a sub-agent to find it. Do not ask the user for anything you could look up yourself. Do not wait on it either. A running exploration is an unsettled prerequisite, so only the questions downstream of it wait for the sub-agent to report. Ask the rest of the frontier now. The _decisions_ are the user's. Put each one to them and wait.

The session is done when the frontier is empty: you have visited every branch of the design tree, and nothing is left silently assumed. Do not act on the plan until the user confirms you have reached a shared understanding.
