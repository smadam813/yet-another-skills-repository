---
name: to-spec
description: "Turn the current conversation into a spec and publish it to the project issue tracker: no interview, just synthesis of what you have already discussed."
disable-model-invocation: true
---

This skill turns the current conversation and your understanding of the codebase into a spec. Do NOT interview the user. Synthesize what you already know.

Setup gives you the issue tracker and the triage label vocabulary. If you do not have them, tell the user to run `/setup-builder-skills`.

## Process

1. Explore the repo to learn the current state of the codebase, if you have not already. Use the project's domain glossary throughout the spec, and respect the ADRs in the area you touch.

2. Sketch the seams where you will test the feature. Prefer existing seams to new ones. Use the highest seam available. If you need new seams, propose them at the highest point you can. Fewer seams are better; one is ideal.

Confirm with the user that these seams match their expectations.

3. Write the spec with the template below, then publish it to the project issue tracker. Apply the `ready-for-agent` triage label. No other triage is needed.

<spec-template>

## Problem Statement

The problem the user faces, in the user's terms.

## Solution

The solution to that problem, in the user's terms.

## User Stories

A LONG, numbered list of user stories that covers every aspect of the feature. Write each one in this format:

1. As an <actor>, I want a <feature>, so that <benefit>

<user-story-example>
1. As a mobile bank customer, I want to see balance on my accounts, so that I can make better informed decisions about my spending
</user-story-example>

## Implementation Decisions

The implementation decisions you made. These can include:

- The modules to build or modify
- The interfaces of those modules that change
- Technical clarifications from the developer
- Architectural decisions
- Schema changes
- API contracts
- Specific interactions

Do NOT include file paths or code snippets. They go out of date quickly.

Exception: if a prototype produced a snippet that encodes a decision more precisely than prose can — a state machine, a reducer, a schema, a type shape — inline it in the relevant decision and note that it came from a prototype. Trim it to the parts that carry the decision, not a working demo.

## Testing Decisions

The testing decisions you made. Include:

- What makes a good test here: it tests external behavior, not implementation details
- Which modules you will test
- Prior art for the tests: similar tests in the codebase

## Out of Scope

What this spec does not cover.

## Further Notes

Any further notes about the feature.

</spec-template>
