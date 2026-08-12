---
name: codebase-design
description: Shared vocabulary for designing deep modules. Use when the user wants to design or improve a module's interface, find deepening opportunities, decide where a seam goes, make code more testable or AI-navigable, or when another skill needs the deep-module vocabulary.
license: MIT
metadata:
  vendored: modified
  upstream_source: https://github.com/mattpocock/skills
  upstream_path: skills/engineering/codebase-design/SKILL.md
  upstream_author: Matt Pocock
  upstream_copyright: Copyright (c) 2026 Matt Pocock
  upstream_license: MIT
  local_changes: >-
    Prose edited for plain English per the /orwell-writing skill: American
    spelling, shorter sentences, active voice, decorative idiom removed. The
    glossary terms, code blocks, and technical claims are unchanged.
  note: >-
    See NOTICE at the repository root.
---

# Codebase Design

Design **deep modules**: a lot of behavior behind a small interface, placed at a clean seam, testable through that interface. Use this language and these principles whenever you design or restructure code. The aim is leverage for callers, locality for maintainers, and testability for everyone.

## Glossary

Use these terms exactly. Do not substitute "component," "service," "API," or "boundary." The same term must always name the same thing.

**Module** — anything with an interface and an implementation. The term works at any scale: a function, a class, a package, or a slice that spans tiers. _Avoid_: unit, component, service.

**Interface** — everything a caller must know to use the module correctly. That includes the type signature, but also invariants, ordering constraints, error modes, required configuration, and performance characteristics. _Avoid_: API, signature. Both are too narrow — they name only the type-level surface.

**Implementation** — what is inside a module, its body of code. This differs from **Adapter**: a thing can be a small adapter with a large implementation (a Postgres repo) or a large adapter with a small implementation (an in-memory fake). Say "adapter" when the seam is the topic, "implementation" otherwise.

**Depth** — leverage at the interface: how much behavior a caller (or a test) can exercise for each unit of interface it must learn. A module is **deep** when a large amount of behavior sits behind a small interface. It is **shallow** when the interface is nearly as complex as the implementation.

**Seam** _(Michael Feathers)_ — a place where you can alter behavior without editing in that place. It is the *location* at which a module's interface lives. Where to put the seam is its own design decision, separate from what goes behind it. _Avoid_: boundary. It is overloaded with DDD's bounded context.

**Adapter** — a concrete thing that satisfies an interface at a seam. It describes *role* (what slot it fills), not substance (what is inside).

**Leverage** — what callers get from depth: more capability for each unit of interface they learn. One implementation pays back across N call sites and M tests.

**Locality** — what maintainers get from depth. Change, bugs, knowledge, and verification concentrate in one place instead of spreading across callers. Fix once, fixed everywhere.

## Deep vs shallow

**Deep module** = small interface + lots of implementation:

```
┌─────────────────────┐
│   Small Interface   │  ← Few methods, simple params
├─────────────────────┤
│                     │
│  Deep Implementation│  ← Complex logic hidden
│                     │
└─────────────────────┘
```

**Shallow module** = large interface + little implementation (avoid):

```
┌─────────────────────────────────┐
│       Large Interface           │  ← Many methods, complex params
├─────────────────────────────────┤
│  Thin Implementation            │  ← Just passes through
└─────────────────────────────────┘
```

When you design an interface, ask:

- Can I reduce the number of methods?
- Can I simplify the parameters?
- Can I hide more complexity inside?

## Principles

- **Depth is a property of the interface, not the implementation.** A deep module can be built inside from small, mockable, swappable parts. Those parts are not part of the interface. A module can have **internal seams** (private to its implementation, used by its own tests) as well as the **external seam** at its interface.
- **The deletion test.** Imagine you delete the module. If complexity vanishes, it was a pass-through. If complexity reappears across N callers, it was doing real work.
- **The interface is the test surface.** Callers and tests cross the same seam. If you want to test *past* the interface, the module is probably the wrong shape.
- **One adapter means a hypothetical seam. Two adapters means a real one.** Do not introduce a seam unless something varies across it.

## Designing for testability

Good interfaces make testing natural:

1. **Accept dependencies, do not create them.**

   ```typescript
   // Testable
   function processOrder(order, paymentGateway) {}

   // Hard to test
   function processOrder(order) {
     const gateway = new StripeGateway();
   }
   ```

2. **Return results, do not produce side effects.**

   ```typescript
   // Testable
   function calculateDiscount(cart): Discount {}

   // Hard to test
   function applyDiscount(cart): void {
     cart.total -= discount;
   }
   ```

3. **Small surface area.** Fewer methods means fewer tests. Fewer params means simpler test setup.

## Relationships

- A **Module** has exactly one **Interface** — the surface it presents to callers and tests.
- **Depth** is a property of a **Module**, measured against its **Interface**.
- A **Seam** is where a **Module**'s **Interface** lives.
- An **Adapter** sits at a **Seam** and satisfies the **Interface**.
- **Depth** produces **Leverage** for callers and **Locality** for maintainers.

## Rejected framings

- **Depth as the ratio of implementation lines to interface lines** (Ousterhout): this rewards padding the implementation. Use depth-as-leverage instead.
- **"Interface" as the TypeScript `interface` keyword or a class's public methods**: too narrow. Interface here includes every fact a caller must know.
- **"Boundary"**: overloaded with DDD's bounded context. Say **seam** or **interface**.

## Going deeper

- **Deepening a cluster given its dependencies** — see [DEEPENING.md](DEEPENING.md): dependency categories, seam discipline, and replace-do-not-layer testing.
- **Exploring alternative interfaces** — see [DESIGN-IT-TWICE.md](DESIGN-IT-TWICE.md): start parallel sub-agents to design the interface several radically different ways, then compare them on depth, locality, and seam placement.
