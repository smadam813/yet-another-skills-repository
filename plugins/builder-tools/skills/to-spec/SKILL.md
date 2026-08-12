---
name: to-spec
description: Turn the current conversation into a spec and publish it to the project issue tracker — no interview, just synthesis of what you've already discussed.
disable-model-invocation: true
license: MIT
metadata:
  vendored: modified
  upstream_source: https://github.com/mattpocock/skills
  upstream_path: skills/engineering/to-spec/SKILL.md
  upstream_author: Matt Pocock
  upstream_copyright: Copyright (c) 2026 Matt Pocock
  upstream_license: MIT
  local_changes: >-
    Setup reference retargeted to /setup-builder-tools. Prose edited for
    plain English per the /orwell-writing skill: active voice and shorter
    sentences. The spec template's headings and the user-story format are
    unchanged.
  note: >-
    See NOTICE at the repository root.
---

This skill takes the current conversation context and your understanding of the codebase, and produces a spec. Do NOT interview the user. Synthesize what you already know.

You should already have the issue tracker and the triage label vocabulary. Run `/setup-builder-tools` if you do not.

## Process

1. Explore the repo to understand the current state of the codebase, if you have not already. Use the project's domain glossary vocabulary throughout the spec, and respect any ADRs in the area you are touching.

2. Sketch the seams at which you will test the feature. Prefer existing seams to new ones. Use the highest seam you can. If you need new seams, propose them at the highest point available. The fewer seams across the codebase, the better — the ideal number is one.

Check with the user that these seams match their expectations.

3. Write the spec using the template below, then publish it to the project issue tracker. Apply the `ready-for-agent` triage label. No further triage is needed.

<spec-template>

## Problem Statement

The problem the user faces, from the user's perspective.

## Solution

The solution to that problem, from the user's perspective.

## User Stories

A LONG, numbered list of user stories. Write each user story in this format:

1. As an <actor>, I want a <feature>, so that <benefit>

<user-story-example>
1. As a mobile bank customer, I want to see balance on my accounts, so that I can make better informed decisions about my spending
</user-story-example>

Make this list extremely extensive. Cover every aspect of the feature.

## Implementation Decisions

A list of the implementation decisions that were made. This can include:

- The modules that will be built or modified
- The interfaces of those modules that will change
- Technical clarifications from the developer
- Architectural decisions
- Schema changes
- API contracts
- Specific interactions

Do NOT include specific file paths or code snippets. They go out of date very quickly.

Exception: if a prototype produced a snippet that encodes a decision more precisely than prose can — a state machine, a reducer, a schema, a type shape — inline it within the relevant decision and note briefly that it came from a prototype. Trim it to the parts that carry the decision. This is not a working demo, only the important parts.

## Testing Decisions

A list of the testing decisions that were made. Include:

- A description of what makes a good test: test external behavior only, not implementation details
- Which modules will be tested
- Prior art for the tests, meaning similar types of tests already in the codebase

## Out of Scope

A description of what is out of scope for this spec.

## Further Notes

Any further notes about the feature.

</spec-template>
