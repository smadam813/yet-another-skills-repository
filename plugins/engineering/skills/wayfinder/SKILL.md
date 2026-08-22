---
name: wayfinder
description: Plan work that is too large for one agent session as a shared map of decision tickets on your issue tracker, then resolve the tickets one at a time until the way to the destination is clear.
disable-model-invocation: true
---

A loose idea has arrived. It is too big for one agent session, and the way from here to the **destination** is not visible yet. Wayfinding finds that way; it does not charge straight at the destination. This skill charts the way as a **shared map** on the repo's issue tracker, then works the map's **decision tickets** one at a time until the route is clear. A decision ticket asks a question whose resolution is a decision, not a slice of a build to execute.

Each effort has its own destination. Name it first: it shapes every ticket. A destination might be a spec to hand off and iterate on, a decision to lock before planning starts, or a change made in place, such as a data-structure migration. The map works in any domain: engineering work, course content, or anything else that fits this shape.

## Plan, do not build

Wayfinder **plans** by default. Each ticket resolves a decision, and the map is done when the way is clear and nothing is left to decide before someone builds. When you feel the pull to just do the work, you have usually reached the edge of the map, and it is time to hand off. An effort can override this in its **Notes** and carry execution into the map itself. Otherwise, produce decisions, not deliverables.

## Refer by name

Every map and ticket is an issue, so each one has a **name**: its title. In everything the human reads, such as narration and the map's Decisions-so-far, refer to it by that name. Never use a bare id, number, or slug. A wall of `#42, #43, #44` is illegible; names read at a glance. The id and the URL do not disappear: the name carries the link. They ride _inside_ the name, and they never stand in for it.

## The Map

The map is a single issue on this repo's issue tracker, labeled `wayfinder:map`. It is the canonical artifact. Its tickets are child issues of the map.

The map is an **index**, not a store. It lists the decisions made and points at the tickets that hold the detail. A decision lives in exactly one place, its ticket. The map never restates a decision; it gives a one-line gist and links to the ticket.

**Each tracker stores the map, its child tickets, the blocking edges, and the frontier queries in its own way.** You should already have an issue tracker. If you do not, tell the user to run `/setup-builder-skills`, and default to the local-markdown tracker until then. Read the "Wayfinding operations" section of the tracker doc for how _this_ repo expresses these.

### The map body

The whole map at low resolution. Load it once per session. Do not list open tickets: they are open child issues, and you find them by query.

```markdown
## Destination

<what reaching the end of this map looks like: the spec, decision, or change this effort is finding its way to. One or two lines. Every session reads it before it chooses a ticket.>

## Notes

<domain; skills every session should consult; standing preferences for this effort>

## Decisions so far

<!-- the index: one line per closed ticket, enough to judge relevance, then zoom the link for the detail the ticket holds -->

- [<closed ticket title>](link): <one-line gist of the answer>

## Not yet specified

<!-- see "Fog of war": in-scope fog you cannot ticket yet; it graduates as the frontier advances -->

## Out of scope

<!-- see "Out of scope": work ruled beyond the destination; closed, never graduates -->
```

### Tickets

Each ticket is a **child issue** of the map. The tracker's issue id is its identity. Its body is the question, sized to fit one 100K token agent session:

```markdown
## Question

<the decision or investigation this ticket resolves>
```

Each ticket carries a `wayfinder:<type>` label: `research`, `prototype`, `grilling`, or `task`. See [Ticket Types](#ticket-types).

A session **claims** a ticket by assigning it to the dev who drives the map. Claim it **first**, before any work, so that concurrent sessions skip it. The assignee _is_ the claim: an open, unassigned ticket is unclaimed.

Blocking uses the tracker's **native** dependency relationship. This matters because the tracker's own UI then draws the frontier _visually_, so the human sees what is takeable without opening the map. Fall back to a body convention only when the tracker has no native blocking. A ticket is **unblocked** when every ticket that blocks it is closed. The **frontier** is the open, unblocked, unclaimed children: the edge of the known.

The answer is not part of the body. You record it when you resolve the ticket; see [Work through the map](#work-through-the-map). Link any asset you create while you resolve a ticket from the issue. Do not paste it in.

## Ticket Types

Every ticket is either **HITL** or **AFK**. A HITL ticket (human in the loop) is worked _with_ a human who speaks for themselves. An AFK ticket is driven by the agent alone. A HITL ticket resolves only through that live exchange. The agent never stands in for the human's side of it: a grilling agent that answers its own questions has broken this rule.

- **Research** (AFK): Read documentation, third-party APIs, or local resources such as knowledge bases to surface a fact that a decision waits on. A subagent resolves it by calling the Skill tool with "research". Use this type when you need knowledge from outside the current working directory.
- **Prototype** (HITL): Raise the fidelity of the discussion. Make a cheap, rough, concrete artifact for the human to react to: an outline, a rough take, a stub, or UI or logic code. Call the Skill tool with "prototype", then link the prototype as an asset. Use this type when "how should it look" or "how should it behave" is the key question.
- **Grilling** (HITL): Conversation. This is the default type. Always call the Skill tool twice, for "grilling" and "domain-modeling".
- **Task** (HITL or AFK): Manual work that must happen before anyone can make a _decision_. There is nothing to decide, prototype, or research, but the discussion stays blocked until the work is done. Examples: signing up for a service so you can judge its API, provisioning access, or moving data so you can see its shape. This is the one type that _does_ rather than decides, and it earns its place by unblocking a decision, not by delivering the destination. The agent drives the task alone where it can (AFK). Otherwise it hands the human a precise checklist (HITL). The ticket resolves when the work is done. The answer records what was done, plus any resulting facts that later tickets depend on, such as where the credentials live, new URLs, or row counts.

## Fog of war

The map is _deliberately_ incomplete: do not chart what you cannot yet see. The **fog of war** lies beyond the live tickets. It is the dim view of decisions and investigations that you can tell are coming but cannot yet pin down, because they hang on questions that are still open. When you resolve a ticket, you clear the fog ahead of it. Graduate whatever is now specifiable into fresh tickets, one at a time, until the way to the destination is clear and no tickets remain.

Write that dim view down in the map's **Not yet specified** section: the suspected question, the area to revisit later. This is the undiscovered frontier _toward_ the destination. Everything here is in scope, but it is not sharp enough to ticket yet. Write as loosely or as fully as the view allows. The section also acts as a signpost for collaborators who want to see where the effort is headed.

**Fog or ticket?** The test is whether you can state the question precisely now, _not_ whether you can answer it now.

- **Ticket when** the question is already sharp, even if it is blocked and you cannot act on it yet.
- **Not yet specified when** you cannot yet phrase it that sharply. Do not pre-slice the fog into ticket-sized pieces. Fog is coarser than a ticket, and one patch may graduate into several tickets, or into none, once the frontier reaches it.

**Not yet specified** excludes what is already decided (Decisions so far), what is already a live ticket, and what is out of scope (the next section).

## Out of scope

Fog gathers only _toward_ the destination. The destination fixes the scope, so work beyond it is **out of scope**. Such work is not fog, and it does not belong in **Not yet specified**. It gets its own **Out of scope** section on the map: work you have deliberately ruled out of _this_ effort. Scope, not sharpness, puts it there.

Out-of-scope work never graduates, because the frontier stops at the destination. It returns only if someone redraws the destination, and then as a fresh effort, not as a resumption.

Ruling something out of scope is a scoping act, not a step on the route. Sometimes a ticket that already exists turns out to sit past the destination, either because you mis-scoped it while charting or because a resolution exposed it. **Close that ticket**, because a closed ticket is clearly off the frontier. Then leave one line in the **Out of scope** section: the gist, why it is out of scope, and a link to the closed ticket. Keep it out of **Decisions so far**, which records the route you actually walked. A scope boundary is not a step on that route.

## Invocation

Two modes. In both, **never resolve more than one ticket per session**. Research tickets are the exception.

### Chart the map

The user invokes this mode with a loose idea.

1. **Name the destination.** Call the Skill tool twice, for "grilling" and "domain-modeling", to pin down what this map is finding its way to: the spec, decision, or change. The destination fixes the scope, so settle it first.
2. **Map the frontier.** Grill again, **breadth-first** this time. Fan out across the whole space instead of going deep on any one thread, and surface both the open decisions and the first steps you can take now. **If this surfaces no fog**, the way to the destination is already clear and the whole journey fits in one session, so you do not need a map. Stop and ask the user how they want to proceed.
3. **Create the map** with the label `wayfinder:map`. Fill in Destination and Notes, leave Decisions-so-far empty, and sketch the fog into **Not yet specified**.
4. **Create the tickets you can specify now** as child issues of the map. Then wire the blocking edges in a **second pass**, because issues need ids before they can reference each other. Wiring sorts the tickets into the frontier and the blocked. Everything you cannot yet specify stays in the fog, in the **Not yet specified** section.
5. **Fire the research subagents.** For each `research` ticket you just created, start a subagent that calls the Skill tool with "research" and resolves the ticket in parallel. Each subagent captures its findings on a throwaway `research/<name>` branch, and the ticket keeps a context pointer to that branch.
6. Stop. Charting is one session's work, and it resolves no tickets by hand.

### Work through the map

The user invokes this mode with a map, given as a URL or a number. A ticket is **optional**. Without one, you pick the next decision, not the user.

1. Load the **map**: the low-resolution view, not every ticket body.
2. Choose the ticket. If the user named one, use it. Otherwise take the first frontier ticket in order. **Claim it**: assign it to yourself before any work.
3. Resolve it. **Zoom in as needed**: fetch the full body of any related or closed ticket on demand, and call the Skill tool for whichever skills the `## Notes` block names. If in doubt, call the Skill tool twice, for "grilling" and "domain-modeling".
4. Record the resolution: post the answer as a **resolution comment**, **close** the issue, and **append a context pointer** to the map's Decisions-so-far.
5. Add any newly-surfaced tickets, create-then-wire. Graduate any fog that the answer has made specifiable, and clear each graduated patch from **Not yet specified** so that it lives only as its new ticket. If the answer reveals that a ticket, this one or another, sits beyond the destination, **rule it out of scope** instead of resolving it on the route. If the decision invalidates other parts of the map, update or delete those tickets.

The user may run unblocked tickets in parallel, so expect other sessions to edit the tracker at the same time.
