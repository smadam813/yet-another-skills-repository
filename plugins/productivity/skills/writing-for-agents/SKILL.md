---
name: writing-for-agents
description: Writing documents for agents. Use when you create or edit a skill, `AGENTS.md`, or `CLAUDE.md`.
---

Reference for writing any document an agent reads: a skill, an `AGENTS.md` or `CLAUDE.md`, a doc reached by a pointer. The packaging differs; the writing does not. The same levers make each document predictable: the agent takes the same _process_ every run, rather than producing the same output.

When the document is a skill, read [`SKILL-MECHANICS.md`](references/SKILL-MECHANICS.md) for frontmatter, the invocation choice, and router skills.

## Context pointers

A **context pointer** sits in the agent's context, names material that is out of context, and states the condition for reaching that material. A skill's description is a pointer; a line in `AGENTS.md` that names a doc is the same object. The pointer's _wording_ decides when the agent reaches the material, and how reliably. The target does not. A weak pointer in front of must-have material is a variance bug: sharpen the wording first, and inline the material only when sharpening fails.

A pointer does two jobs. It states what the material is, and lists the **branches** that should trigger reaching it. A branch is a distinct case the document handles, so different runs take different paths through it. Every word of an always-loaded pointer costs on every turn, so prune a pointer harder than you prune the body:

- **Front-load the leading word**: the pointer is where that word does its triggering work.
- **One trigger per branch.** Two synonyms for one branch write that branch twice. Collapse them, and keep only branches that genuinely differ.
- **Cut identity the body already carries.**

## The two loads

Every document and pointer you add spends one of two budgets:

- **Context load** is what always-loaded material costs the agent's window: an `AGENTS.md` line, a skill description, anything that sits in context every turn. It spends tokens and attention whether or not it fires.
- **Cognitive load** is what the human pays: which documents exist, and when to reach for each. The human is the index. This load is not waste to cut down: it is the price of human agency. Spend it where human judgment matters, and remove it where it does not.

Material reached only through a pointer escapes context load and pays the pointer's own line instead. Material with no pointer at all rides entirely on cognitive load.

## Information hierarchy

A document holds two content types: **steps**, the ordered actions the agent performs, and **reference**, the definitions, rules, and facts it consults on demand. The two mix freely. A document can be all steps (a recipe), all reference (a review's rules, this skill), or both. The core decision is where each piece sits on the **information hierarchy**: a ladder ranked by how soon the agent needs the material.

1. **In-file step** is the primary tier: what the agent does, in order.
2. **In-file reference** sits in the same file, and the agent consults it on demand. It is often a flat set of peers, such as every rule of a review on one rung, which is a fine arrangement, not a smell.
3. **Disclosed reference** lives in a separate file, reached by a context pointer, and loads only when that pointer fires. That file can be a sibling in the same folder, or external reference that lives anywhere and any document can point at.

Push too little down, and the top bloats. Push too much down, and you hide material the agent needs. That tension is the whole decision.

**Progressive disclosure** moves a piece down the ladder, out of the main file and behind a pointer, so the top stays legible. It is not mainly a token optimization: it protects the hierarchy. Branching is the cleanest disclosure test. Inline what every branch needs, and push behind a pointer what only some branches reach. In a document with steps, in-file reference that should have been disclosed buries those steps, and the agent then attends to them on a coin-flip. Disclosure is a variance lever, not only a legibility one.

**Co-location** is the companion move inside a file. The ladder decides _how far down_ a piece sits; co-location decides _what sits beside it_ once it is there. Keep a concept's definition, rules, and caveats under one heading rather than scattered, so reading one part brings its neighbors with it. The test: the document should read like documentation written for the agent. Grouped material reads that way; scattered material does not. Scattering is not duplication: duplication repeats one meaning in two places, and scattering breaks one meaning across many.

**Sprawl** is the failure mode here: a document simply too long, even when every line is live and unique. Attention thins across the excess, and every extra line is one more to keep relevant. The cure is the ladder. Disclose reference behind pointers, and split by branch or by sequence, so each path carries only what it needs.

## Steps and completion criteria

Every step ends on a **completion criterion**: the condition that tells the agent the work is done. Two properties make the criterion a lever:

- **Clarity**: can the agent tell done from not-done? A vague bound, such as "understanding reached", invites **premature completion**: the agent ends the step before the work is done, because its attention slips to _being done_. The steps still visible ahead, the **post-completion steps**, supply that pull, and the criterion's clarity is the resistance. Defend in order: **sharpen the bound first**, since that fix is local and cheap. Only when the bound stays fuzzy _and_ you see the rush, split the sequence to hide the later steps. Hiding works only across a real context boundary, such as a hand-off or a subagent dispatch. An inline call leaves the later steps in context and clears nothing.
- **Demand**: how much the criterion requires. "Every modified model accounted for" forces thorough work; "produce a change list" does not. Demand drives **legwork**, the digging the agent does within the work, carried by the wording rather than written as its own step. Demand does not bind only to steps: "every rule applied" binds a body of flat reference the way "every step done" binds a sequence, which is how an all-reference document still carries an exhaustiveness bar.

The strongest criteria are both checkable and exhaustive.

## When to split

Splitting one document into two spends one of the two loads, so split only when the cut earns it:

- **By sequence**: cut a run of steps where the post-completion steps tempt the agent to rush the step in front of it. Out of view, those later steps stop pulling, and the agent does more legwork on the current task. The reverse also holds: merging two sequences puts each step's later steps back in view, and invites premature completion.
- **By invocation**, skill-specific: see [`SKILL-MECHANICS.md`](references/SKILL-MECHANICS.md).

## Leading words

A **leading word** is a compact concept that already lives in the model's pretraining and that the agent thinks with while it runs the document: _lesson_, _fog of war_, _tracer bullets_. Repeat the word as a token, never as a sentence. It then builds a definition spread across the document, and anchors a whole region of behavior in very few tokens, because it recruits priors the model already holds. Coining your own word works if you define it clearly, but a made-up word recruits no priors. You pay in definition tokens what a pretrained word gives free, so reach for an existing word first.

The word anchors twice. In the body it anchors _execution_: the agent reaches for the same behavior every time the word appears, and inside flat reference the word points attention at a class of thing to look for. In a pointer it anchors _invocation_: when the same word lives in your prompts, your docs, and your codebase, the agent links that shared language to the material and reaches it more reliably.

Hunt for passages that a leading word can replace. A triad spelled out at three sites. A pointer that spends a sentence to gesture at one idea. Each one collapses into a single token:

- "fast, deterministic, low-overhead" → _tight_ (a _tight_ loop).
- "a loop you believe in" → _red_, which turns a fuzzy gate into a state you can observe: the loop goes _red_ on the bug, or it does not.

You win twice: fewer tokens, and a sharper hook for the agent to hang its thinking on. Assume every document carries restatements that a leading word retires. Go find them.

**Negation** is the failure mode beside this lever. A prohibition drags the forbidden behavior into context and makes it _more_ available, not less. _Don't think of an elephant_, and the elephant is all there is. The negation is a weak modifier, the strongly-activated concept overruns it, and the ban half-reads as an instruction to do the thing. Prompt the **positive** instead: state the target behavior ("write one-line comments"), so the banned behavior is never spoken. A prohibition earns its place only as a hard guardrail you cannot phrase positively. Even then, pair it with the positive target, so attention lands on what to do.

## Pruning

- Keep each meaning in a **single source of truth**: one authoritative place, so a change to the behavior is a one-place edit. **Duplication** puts the same meaning in more than one place. It costs maintenance and tokens, and lifts a meaning's prominence on the ladder above its real rank. Duplication is the accidental inverse of a leading word, which repeats a token on purpose and never the meaning.
- The **environment** is a source of truth too: `package.json` scripts, config files, the directory layout, `--help` output. A document that restates the environment is a **cache**, a copy of a lookup, and it earns its load only when the lookup is expensive. Cache what the agent cannot find by looking: the unwritten convention, the reason behind a choice, the trap no config file records. Leave the one-file, one-command lookups to the environment, where they cannot go stale.
- Check every line for **relevance**: does the line still bear on what the document does? A line loses relevance in two ways. It never bore on the task: mere exposition, or a branch that should be disclosed. Or it goes stale as the behavior or the world it describes changes. Shorter documents are easier to keep relevant. Without a pruning discipline, the document collects **sediment**: stale layers that settle because adding feels safe and removing feels risky, until you must dig down through them to find what is still live.
- Hunt **no-ops** sentence by sentence. An instruction the model already obeys by default pays load and says nothing. The test: does the sentence change behavior against the default? That test is model-relative, not reader-relative. Two people who disagree about a no-op disagree about the default, and they settle it by running the document, not by debate. When a sentence fails the test, delete the whole sentence rather than trim words from it. The test also grades leading words. A word too weak to beat the default (_be thorough_, when the agent is already fairly thorough) is a no-op, and the fix is a stronger word (_relentless_), not a different technique.
