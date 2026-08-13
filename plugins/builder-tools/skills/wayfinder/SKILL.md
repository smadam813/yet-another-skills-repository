---
name: wayfinder
description: Plan a huge chunk of work — more than one agent session can hold — as a shared map of decision tickets on your issue tracker, and resolve them one at a time until the way to the destination is clear.
disable-model-invocation: true
license: MIT
metadata:
  vendored: modified
  upstream_source: https://github.com/mattpocock/skills
  upstream_path: skills/engineering/wayfinder/SKILL.md
  upstream_author: Matt Pocock
  upstream_copyright: Copyright (c) 2026 Matt Pocock
  upstream_license: MIT
  local_changes: >-
    Setup reference retargeted to /setup-builder-tools. Prose edited for
    plain English per the /orwell-writing skill: American spelling, shorter
    sentences, active voice, decorative phrasing removed. The navigation
    vocabulary (map, destination, frontier, fog of war, chart) is kept
    deliberately — it is this skill's defined terminology, not decoration.
    Section headings are unchanged so the in-page anchors still resolve.
  note: >-
    See NOTICE at the repository root.
---

A loose idea has arrived. It is too big for one agent session, and the way from here to the **destination** is not visible yet. Wayfinding is about finding that way, not rushing straight at the destination. This skill charts the way as a **shared map** on the repo's issue tracker. It then works the map's **decision tickets** — questions whose resolution is a decision, not slices of a build to execute — one at a time, until the route is clear.

The destination varies per effort, and naming it is the first act of charting, because it shapes every ticket. It might be a spec to hand off and iterate on, a decision to lock before planning starts, or a change made in place such as a data-structure migration. The map does not care about the domain: engineering work, course content, whatever fits the shape.

## Plan, don't do

Wayfinder is **planning** by default. Each ticket resolves a decision, and the map is done when the way is clear, with nothing left to decide before someone goes and does the thing. When you feel the pull to do the work yourself, that is usually the signal that you have reached the edge of the map and it is time to hand off. An effort can override this in its **Notes**, carrying execution into the map itself. Without that override, produce decisions, not deliverables.

## Refer by name

Every map and ticket is an issue, so it has a **name**: its title. In everything the human reads — your narration, the map's Decisions-so-far — refer to it by that name, never by a bare id, number, or slug. A wall of `#42, #43, #44` is unreadable; names read at a glance. The id and URL do not vanish, because the name wraps its link. They ride _inside_ the name, and never stand in for it.

## The Map

The map is a single issue on this repo's issue tracker, labeled `wayfinder:map`. It is the canonical artifact. Its tickets are child issues of the map.

The map is an **index**, not a store. It lists the decisions made and points at the tickets that hold the detail. A decision lives in exactly one place — its ticket — so the map never restates it. It gives a one-line summary and a link.

**Where the map, its child tickets, blocking, and frontier queries live is tracker-specific.** You should already have the issue tracker configuration. Run `/setup-builder-tools` if you do not. Consult the tracker doc's "Wayfinding operations" section for how _this_ repo expresses them. If no tracker has been configured, default to the local-markdown tracker.

### The map body

The whole map at low resolution, loaded once per session. It does **not** list the open tickets. Those are open child issues, and you find them by query.

```markdown
## Destination

<what reaching the end of this map looks like — the spec, decision, or change this effort is finding its way to. One or two lines; every session orients to it before choosing a ticket.>

## Notes

<domain; skills every session should consult; standing preferences for this effort>

## Decisions so far

<!-- the index — one line per closed ticket: enough to judge relevance, then open the link for the detail the ticket holds -->

- [<closed ticket title>](link) — <one-line summary of the answer>

## Not yet specified

<!-- see "Fog of war": in-scope fog you can't ticket yet; graduates as the frontier advances -->

## Out of scope

<!-- see "Out of scope": work ruled beyond the destination; closed, never graduates -->
```

### Tickets

Each ticket is a **child issue** of the map, and the tracker's issue id is its identity. Its body is the question, sized to one 100K token agent session:

```markdown
## Question

<the decision or investigation this ticket resolves>
```

Each ticket carries a `wayfinder:<type>` label, one of `research`, `prototype`, `grilling`, `task` (see [Ticket Types](#ticket-types)).

A session **claims** a ticket by assigning it to the dev driving the map. Do this **first**, before any work, so concurrent sessions skip it. That assignee _is_ the claim: an open, unassigned ticket is unclaimed.

Blocking uses the tracker's **native** dependency relationship. This matters because it renders the frontier _visually_ in the tracker's own UI, so the human sees what is takeable without opening the map. Fall back to a body convention only on a tracker that lacks native blocking. A ticket is **unblocked** when every ticket blocking it is closed. The **frontier** is the open, unblocked, unclaimed children — the edge of the known.

The answer is not part of the body. You record it on resolution (see [Work through the map](#work-through-the-map)). Link any assets you create while resolving a ticket from the issue; do not paste them in.

## Ticket Types

Every ticket is either **HITL** — human in the loop, worked _with_ a human who speaks for themselves — or **AFK**, driven by the agent alone. A HITL ticket resolves only through that live exchange. The agent never stands in for the human's side of it. A grilling agent that answers its own questions has broken this rule.

- **Research** (AFK): reading documentation, third-party APIs, or local resources such as knowledge bases, to surface a fact that a decision waits on. Resolved by a `/research` **subagent**. Use it when you need knowledge from outside the current working directory.
- **Prototype** (HITL): raise the fidelity of the discussion by making a cheap, rough, concrete thing to react to — an outline, a rough take, a stub, or UI/logic code via the `/prototype` skill. Link the prototype as an asset. Use it when "how should it look" or "how should it behave" is the key question.
- **Grilling** (HITL): conversation. This is the default case. Always invoke the `/grilling` and `/domain-modeling` skills.
- **Task** (HITL or AFK): manual work that must happen before a _decision_ can be made. There is nothing to decide, prototype, or research, but the discussion is blocked until the work is done. Examples: signing up for a service so its API can be judged, provisioning access, moving data so its shape can be seen. This is the one type that *does* rather than decides, and it earns its place by unblocking a decision, not by delivering the destination. The agent drives it alone where it can (AFK). Otherwise it hands the human a precise checklist (HITL). It resolves when the work is done, and the answer records what was done plus any resulting facts that later tickets depend on: where credentials live, new URLs, row counts.

## Fog of war

The map is _deliberately_ incomplete. Do not chart what you cannot yet see. Beyond the live tickets lies the **fog of war**: the dim view of decisions and investigations you can tell are coming but cannot yet pin down, because they hang on questions that are still open. Resolving a ticket clears the fog ahead of it. Whatever is now specifiable graduates into fresh tickets, one at a time, until the way to the destination is clear and no tickets remain.

The map's **Not yet specified** section is where you write that dim view down: the suspected question, and the area to revisit later. It is the undiscovered frontier _toward_ the destination. Everything here is in scope, only not sharp enough to ticket yet. Write as loosely or as fully as the view allows. It also serves as a signpost for collaborators reading where the effort is headed.

**Fog or ticket?** The test is whether you can state the question precisely now, _not_ whether you can answer it now.

- **Ticket when** the question is already sharp, even if it is blocked and you cannot act on it yet.
- **Not yet specified when** you cannot yet phrase it that sharply. Do not pre-slice the fog into ticket-sized pieces. It is coarser than a ticket, and one patch may graduate into several tickets, or into none, once the frontier reaches it.

**Not yet specified** excludes what is already decided (Decisions so far), what is already a live ticket, and what is out of scope (see the next section).

## Out of scope

Fog only ever gathers _toward_ the destination. The destination fixes the scope, so work beyond it is **out of scope**. It is not fog, and it does not belong in **Not yet specified**. It gets its own **Out of scope** section on the map: work you have consciously ruled out of _this_ effort. Scope, not sharpness, lands it here.

Out-of-scope work never graduates, because the frontier stops at the destination. It returns only if the destination is redrawn, and then as a fresh effort, not as a resumption.

Ruling something out of scope is a scoping act, not a step on the route. When a ticket that already exists turns out to sit past the destination — mis-scoped in while charting, or exposed by a resolution — **close it**, because a closed ticket is unambiguously off the frontier. Then leave one line in the **Out of scope** section: the summary plus why it is out of scope, linking the closed ticket. It stays out of **Decisions so far**, which records the route actually walked. A scope boundary is not a step on that route.

## Invocation

There are two modes. Either way, **never resolve more than one ticket per session**, with the exception of research tickets.

### Chart the map

The user invokes this with a loose idea.

1. **Name the destination.** Run a `/grilling` and `/domain-modeling` session to pin down what this map is finding its way to: the spec, decision, or change. The destination fixes the scope, so settle it first.
2. **Map the frontier.** Grill again, **breadth-first** this time. Fan out across the whole space rather than going deep on any one thread, and surface the open decisions and the first steps you can take now. **If this surfaces no fog**, the way to the destination is already clear and the whole journey fits in one session. You do not need a map. Stop and ask the user how they would like to proceed.
3. **Create the map** (label `wayfinder:map`): Destination and Notes filled in, Decisions-so-far empty, and the fog sketched into **Not yet specified**.
4. **Create the tickets you can specify now** as child issues of the map. Then wire the blocking edges in a **second pass**, because issues need ids before they can reference each other. Wiring sorts them into the frontier and the blocked. Everything you cannot yet specify stays in the fog, in the **Not yet specified** section.
5. **Start the research subagents.** For each `research` ticket you just created, start a `/research` subagent to resolve it in parallel. Capture its findings on a throwaway `research/<name>` branch, with a context pointer from the ticket.
6. Stop. Charting is one session's work, and it resolves nothing by hand.

### Work through the map

The user invokes this with a map, by URL or number. A ticket is **optional**. Without one, you pick the next decision, not the user.

1. Load the **map** — the low-resolution view, not every ticket body.
2. Choose the ticket. If the user named one, use it. Otherwise take the first frontier ticket in order. **Claim it**: assign it to yourself before any work.
3. Resolve it, and **zoom as needed**: fetch the full body of any related or closed ticket on demand, and invoke the skills the `## Notes` block names. If in doubt, use `/grilling` and `/domain-modeling`.
4. Record the resolution: post the answer as a **resolution comment**, **close** the issue, and **append a context pointer** to the map's Decisions-so-far.
5. Add any newly-surfaced tickets (create, then wire). Graduate any fog the answer has made specifiable, and clear each graduated patch from **Not yet specified**, so it lives only as its new ticket. If the answer reveals that a ticket — this one or another — sits beyond the destination, **rule it out of scope** rather than resolving it on the route. If the decision invalidates other parts of the map, update or delete those tickets.

The user may run unblocked tickets in parallel, so expect other sessions to be editing the tracker at the same time.
