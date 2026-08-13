# Deepening

How to deepen a cluster of shallow modules safely, given its dependencies. This file assumes the vocabulary in [SKILL.md](SKILL.md) — **module**, **interface**, **seam**, **adapter**.

## Dependency categories

When you assess a candidate for deepening, classify its dependencies. The category decides how you test the deepened module across its seam.

### 1. In-process

Pure computation, in-memory state, no I/O. Always deepenable. Merge the modules and test through the new interface directly. No adapter needed.

### 2. Local-substitutable

Dependencies that have local test stand-ins, such as PGLite for Postgres or an in-memory filesystem. Deepenable if the stand-in exists. Test the deepened module with the stand-in running in the test suite. The seam is internal. No port sits at the module's external interface.

### 3. Remote but owned (Ports & Adapters)

Your own services across a network boundary: microservices, internal APIs. Define a **port** (interface) at the seam. The deep module owns the logic. Inject the transport as an **adapter**. Tests use an in-memory adapter. Production uses an HTTP, gRPC, or queue adapter.

Recommendation shape: *"Define a port at the seam. Implement an HTTP adapter for production and an in-memory adapter for testing. The logic then sits in one deep module even though it is deployed across a network."*

### 4. True external (Mock)

Third-party services such as Stripe or Twilio, which you do not control. The deepened module takes the external dependency as an injected port. Tests provide a mock adapter.

## Seam discipline

- **One adapter means a hypothetical seam. Two adapters means a real one.** Do not introduce a port unless at least two adapters are justified — usually production plus test. A single-adapter seam is only indirection.
- **Internal seams vs external seams.** A deep module can have internal seams (private to its implementation, used by its own tests) as well as the external seam at its interface. Do not expose internal seams through the interface only because tests use them.

## Testing strategy: replace, do not layer

- Old unit tests on shallow modules become waste once tests at the deepened module's interface exist. Delete them.
- Write new tests at the deepened module's interface. The **interface is the test surface**.
- Tests assert on observable outcomes through the interface, not on internal state.
- Tests must survive internal refactors. They describe behavior, not implementation. If a test has to change when the implementation changes, it is testing past the interface.
