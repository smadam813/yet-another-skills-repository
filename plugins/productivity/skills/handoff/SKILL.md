---
name: handoff
description: Compact the current conversation into a handoff document for another agent to continue.
argument-hint: "What will the next session focus on?"
disable-model-invocation: true
---

Write a handoff document that summarizes the current conversation so a fresh agent can continue the work. Save it to the temporary directory of the user's OS, not to the workspace.

Include a "suggested skills" section. List the skills the next agent should call the Skill tool with.

Do not repeat what other artifacts already record: specs, plans, ADRs, issues, commits, diffs. Reference them by path or URL instead.

Redact sensitive information, such as API keys, passwords, and personal data.

If the user passed arguments, they describe what the next session will focus on. Write the document for that focus.
