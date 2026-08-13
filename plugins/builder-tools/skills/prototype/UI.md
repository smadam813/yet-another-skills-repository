# UI Prototype

Generate **several radically different UI variations** on a single route, switchable from a floating bottom bar. The user flips between variants in the browser, picks one (or takes parts from each), then throws the rest away.

If the question is about logic or state rather than what something looks like, you are on the wrong branch. Use [LOGIC.md](LOGIC.md).

## When this is the right shape

- "What should this page look like?"
- "I want to see a few options for this dashboard before committing."
- "Try a different layout for the settings screen."
- Any time the user would otherwise spend a day picking between three vague mockups in their head.

## Two sub-shapes — strongly prefer sub-shape A

A UI prototype is much easier to judge when it sits next to the rest of the app: real header, real sidebar, real data, real density. A throwaway route on its own gives you nothing to compare against, and every variant looks fine in isolation. Default to sub-shape A whenever a plausible existing page can host the variants. Use sub-shape B only when the prototype has no nearby home.

### Sub-shape A — adjustment to an existing page (preferred)

The route already exists. Render the variants **on the same route**, gated by a `?variant=` URL search param. The existing data fetching, params, and auth all stay. Only the rendering swaps. This is the default. Pick it unless there is a specific reason not to.

If the prototype is for something that has no page yet but *would naturally live inside one* — a new section of the dashboard, a new card on the settings screen, a new step in an existing flow — that is still sub-shape A. Mount the variants inside the host page.

### Sub-shape B — a new page (last resort)

Use this only when the thing you are prototyping has no existing page to live inside: an entirely new top-level surface, or a flow you cannot embed anywhere sensible.

Create a **throwaway route** following whatever routing convention the project already uses. Do not invent a new top-level structure. Name it so it is obviously a prototype — for example, include the word `prototype` in the path or filename. Use the same `?variant=` pattern.

Before you commit to sub-shape B, check once more: is there really no existing page this could be embedded in? An empty route hides design problems that a populated one would expose.

The floating bottom bar is identical in both sub-shapes.

## Process

### 1. State the question and pick N

Default to **3 variants**. Above 5, they stop being radically different and become noise. Cap it there.

Write the plan down in one line, in the prototype's location or a top-of-file comment:

> "Three variants of the settings page, switchable via `?variant=`, on the existing `/settings` route."

This works whether or not the user is here to push back.

### 2. Generate radically different variants

Draft each variant. Hold each one to:

- The page's purpose and the data it can access.
- The project's component library and styling system — TailwindCSS, shadcn, MUI, plain CSS, whatever it uses.
- A clear exported component name, such as `VariantA`, `VariantB`, `VariantC`.

Variants must be **structurally different**: different layout, different information hierarchy, a different primary action. Different colors are not enough. Three slightly-tweaked card grids is not a UI prototype, it is three copies of the same design. If two drafts come out too similar, redo one with explicit "do not use a card grid" guidance.

### 3. Wire them together

Create a single switcher component on the route:

```tsx
// pseudo-code — adapt to the project's framework
const variant = searchParams.get('variant') ?? 'A';
return (
  <>
    {variant === 'A' && <VariantA {...data} />}
    {variant === 'B' && <VariantB {...data} />}
    {variant === 'C' && <VariantC {...data} />}
    <PrototypeSwitcher variants={['A','B','C']} current={variant} />
  </>
);
```

For sub-shape A (existing page): keep all the existing data fetching above the switcher. Only the rendered subtree changes per variant.

For sub-shape B (new page): the throwaway route under `/prototype/<name>` mounts the same switcher.

### 4. Build the floating switcher

A small fixed-position bar at the bottom center of the screen, with three parts:

- **Left arrow** — moves to the previous variant, and wraps around.
- **Variant label** — shows the current variant key and, if the variant exports a name, that name too. For example, `B — Sidebar layout`.
- **Right arrow** — moves forward, and wraps around.

Behavior:

- Clicking an arrow updates the URL search param. Use the framework's router — `router.replace` on Next, `navigate` on React Router — so the variant is shareable and survives a reload.
- Keyboard: `←` and `→` also move between variants. Do not intercept arrow keys when an `<input>`, `<textarea>`, or `[contenteditable]` has focus.
- Make it visually distinct from the page — a high-contrast pill with a subtle shadow works — so it is obviously not part of the design under evaluation.
- Hide it in production builds. Gate on `process.env.NODE_ENV !== 'production'` or an equivalent check, so a stray prototype merge cannot ship the bar to users.

Put the switcher in a single shared component so both sub-shapes can reuse it. Put it wherever shared UI lives in the project.

### 5. Hand it over

Give the user the URL and the `?variant=` keys. They will flip through whenever they get to it. The most useful feedback is usually **"I want the header from B with the sidebar from C"**. That is the design they actually want.

### 6. Capture the answer and clean up

Once a variant has won, capture the answer — which variant, and why — then capture the prototype the way the [SKILL](SKILL.md) describes. Merge the winner into the real code and move the rest onto the throwaway branch, not into main:

- **Sub-shape A** — merge the winner into the existing page. Drop the losing variants and the switcher from main.
- **Sub-shape B** — promote the winning variant to a real route. Drop the throwaway route and the switcher from main.

The full set of variants is the primary source, so it lands on the throwaway branch rather than being deleted. Variant components and a switcher left in the main branch go stale fast and confuse the next reader.

## Anti-patterns

- **Variants that differ only in color or copy.** That is a tweak, not a prototype. Real variants disagree about structure.
- **Sharing too much code between variants.** A shared `<Header>` is fine. A shared `<Layout>` defeats the point. Each variant must be free to throw out the layout.
- **Wiring variants to real mutations.** Read-only prototypes are fine. If a variant needs to mutate, point it at a stub. The question is "what should this look like", not "does the backend work".
- **Promoting the prototype directly to production.** The variant code was written under prototype constraints: no tests, minimal error handling. Rewrite it properly when you merge it in.
