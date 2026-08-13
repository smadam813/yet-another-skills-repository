# CONTEXT.md Format

## Structure

```md
# {Context Name}

{One or two sentence description of what this context is and why it exists.}

## Language

**Order**:
{A one or two sentence description of the term}
_Avoid_: Purchase, transaction

**Invoice**:
A request for payment sent to a customer after delivery.
_Avoid_: Bill, payment request

**Customer**:
A person or organization that places orders.
_Avoid_: Client, buyer, account
```

## Rules

- **Be opinionated.** When several words exist for the same concept, pick the best one and list the others under `_Avoid_`.
- **Keep definitions tight.** One or two sentences at most. Define what the term IS, not what it does.
- **Only include terms specific to this project's context.** General programming concepts — timeouts, error types, utility patterns — do not belong, even if the project uses them a lot. Before you add a term, ask: is this concept unique to this context, or is it a general programming concept? Only the first belongs.
- **Group terms under subheadings** when natural clusters appear. If all terms belong to one cohesive area, a flat list is fine.

## Single vs multi-context repos

**Single context (most repos):** one `CONTEXT.md` at the repo root.

**Several contexts:** a `CONTEXT-MAP.md` at the repo root lists the contexts, where they live, and how they relate to each other:

```md
# Context Map

## Contexts

- [Ordering](./src/ordering/CONTEXT.md) — receives and tracks customer orders
- [Billing](./src/billing/CONTEXT.md) — generates invoices and processes payments
- [Fulfillment](./src/fulfillment/CONTEXT.md) — manages warehouse picking and shipping

## Relationships

- **Ordering → Fulfillment**: Ordering emits `OrderPlaced` events; Fulfillment consumes them to start picking
- **Fulfillment → Billing**: Fulfillment emits `ShipmentDispatched` events; Billing consumes them to generate invoices
- **Ordering ↔ Billing**: Shared types for `CustomerId` and `Money`
```

The skill infers which structure applies:

- If `CONTEXT-MAP.md` exists, read it to find the contexts
- If only a root `CONTEXT.md` exists, the repo has a single context
- If neither exists, create a root `CONTEXT.md` lazily when you resolve the first term

When several contexts exist, infer which one the current topic relates to. If that is unclear, ask.
