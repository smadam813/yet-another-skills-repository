# Skill mechanics

The skill-specific branch of [`writing-for-agents`](../SKILL.md): what changes when the document is a skill, which is frontmatter, the invocation choice, and router skills. Everything else about writing it stays in the universal reference in `../SKILL.md`.

## Invocation

Two choices, trading the two loads:

- A **model-invoked** skill keeps a `description`, so the agent can fire the skill on its own and other skills can reach it. You can still type its name: model invocation always _includes_ user reach, since a description only adds agent discovery and never removes the human's. The description is the skill's top-level context pointer, and it stays loaded at all times: permanent context load in exchange for discoverability. A model-invoked skill that holds only reference is also one home for shared reference: another skill can invoke it, so reference that several skills need lives in one place. Mechanics: omit `disable-model-invocation`, and write a model-facing description that carries the trigger branches. The pointer-writing rules in `../SKILL.md` apply in full.
- A **user-invoked** skill puts the description out of the agent's reach: only the human who types its name can invoke the skill, and no other skill can. It costs zero context load and spends cognitive load instead: you are the index, and you must remember that the skill exists. Mechanics: set `disable-model-invocation: true`. The `description` then faces the human: a one-line summary, with the trigger lists stripped.

Pick model invocation only when the agent must reach the skill on its own, or another skill must. When the skill only ever fires by hand, make it user-invoked and pay no context load.

Shared reference that two user-invoked skills both need can live in neither one: with no descriptions, neither can fire the other. Push that reference to a plain file outside the skill system, as external reference any skill can point at.

## Splitting by invocation

The invocation cut of splitting, where the sequence cut lives in `../SKILL.md`: split off a model-invoked skill when it has a distinct leading word that should trigger it on its own, a word you actually use in your prompts, or when another skill must reach it. You pay context load for the new always-loaded description, so that independent reach has to be worth the cost.

## Router skills

When user-invoked skills grow past the number you can remember, a **router skill** cures that piled-up cognitive load. The router is one user-invoked skill that names the others and says when to reach for each, so the human remembers one skill instead of many. A router can only hint at the skills it names; it can never fire them. User-invoked skills have no description, so nothing but the human can reach them.
