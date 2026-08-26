---
name: codebase-design
description: Shared vocabulary for designing deep modules. Use when the user wants to design or improve a module's interface, find deepening opportunities, decide where a seam goes, make code more testable or AI-navigable, or when another skill needs the deep-module vocabulary.
---

Design **deep modules**: a lot of behavior behind a small interface, placed at a clean seam, testable through that interface. Use this language and these principles whenever you design or restructure code. The aim is leverage for callers, locality for maintainers, and testability for everyone.

## Glossary

Use these terms exactly. Do not substitute "component," "service," "API," or "boundary." Consistent language is the point.

**Module**: anything with an interface and an implementation. The term ignores scale on purpose: a function, a class, a package, or a slice that spans tiers. _Avoid_: unit, component, service.

**Interface**: everything a caller must know to use the module correctly. That covers the type signature, and also invariants, ordering constraints, error modes, required configuration, and performance characteristics. _Avoid_: API, signature. Both are too narrow; they name only the type-level surface.

**Implementation**: what is inside a module, its body of code. It differs from an **adapter**: a module can be a small adapter with a large implementation (a Postgres repository), or a large adapter with a small implementation (an in-memory fake). Use "adapter" when the seam is the topic, and "implementation" otherwise.

**Depth**: leverage at the interface. The amount of behavior a caller (or a test) can exercise per unit of interface it must learn. A module is **deep** when a large amount of behavior sits behind a small interface. A module is **shallow** when the interface is nearly as complex as the implementation.

**Seam** _(Michael Feathers)_: a place where you can change behavior without editing in that place. It is the *location* of a module's interface. _Avoid_: boundary. That word is overloaded with DDD's bounded context.

**Adapter**: a concrete thing that satisfies an interface at a seam. It names a *role* (which slot it fills), not substance (what is inside).

**Leverage**: what callers get from depth. More capability per unit of interface they learn. One implementation serves N call sites and M tests.

**Locality**: what maintainers get from depth. Change, bugs, knowledge, and verification concentrate in one place instead of spreading across callers. Fix it once, and it is fixed everywhere.

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

- **Depth is a property of the interface, not the implementation.** A deep module can hold small, mockable, swappable parts inside. Those parts just are not part of the interface. A module can have **internal seams** (private to its implementation, used by its own tests) as well as the **external seam** at its interface.
- **The deletion test.** Imagine you delete the module. If complexity disappears, the module was a pass-through. If complexity reappears across N callers, the module was doing real work.
- **The interface is the test surface.** Callers and tests cross the same seam. If you want to test *past* the interface, the module is probably the wrong shape.
- **One adapter means a hypothetical seam. Two adapters mean a real one.** Do not add a seam unless something varies across it.

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

2. **Return results, do not cause side effects.**

   ```typescript
   // Testable
   function calculateDiscount(cart): Discount {}

   // Hard to test
   function applyDiscount(cart): void {
     cart.total -= discount;
   }
   ```

3. **Keep the surface small.** Fewer methods need fewer tests. Fewer parameters make test setup simpler.

## Relationships

- A **Module** has exactly one **Interface**: the surface it presents to callers and tests.
- **Depth** is a property of a **Module**, measured against its **Interface**.
- A **Seam** is where a **Module**'s **Interface** lives.
- An **Adapter** sits at a **Seam** and satisfies the **Interface**.
- **Depth** produces **Leverage** for callers and **Locality** for maintainers.

## Rejected framings

- **Depth as the ratio of implementation lines to interface lines** (Ousterhout): it rewards padding the implementation. Use depth-as-leverage instead.
- **"Interface" as the TypeScript `interface` keyword, or a class's public methods**: too narrow. Interface here includes every fact a caller must know.
- **"Boundary"**: overloaded with DDD's bounded context. Say **seam** or **interface**.

## Going deeper

- To deepen a cluster given its dependencies, see [DEEPENING.md](references/DEEPENING.md): dependency categories, seam discipline, and testing that replaces rather than layers.
- To explore alternative interfaces, see [DESIGN-IT-TWICE.md](references/DESIGN-IT-TWICE.md): run parallel subagents that design the interface several very different ways, then compare them on depth, locality, and seam placement.
