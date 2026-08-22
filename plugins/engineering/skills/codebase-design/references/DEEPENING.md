# Deepening

How to deepen a cluster of shallow modules safely, given its dependencies. Uses the vocabulary in [SKILL.md](../SKILL.md): **module**, **interface**, **seam**, **adapter**.

## Dependency categories

When you assess a candidate for deepening, classify its dependencies. The category tells you how to test the deepened module across its seam.

### 1. In-process

Pure computation, in-memory state, no I/O. Always deepenable: merge the modules and test through the new interface directly. No adapter needed.

### 2. Local-substitutable

Dependencies that have local test stand-ins (PGLite for Postgres, an in-memory filesystem). Deepenable if the stand-in exists. Test the deepened module with the stand-in running in the test suite. The seam is internal, so the module's external interface needs no port.

### 3. Remote but owned (Ports & Adapters)

Your own services across a network (microservices, internal APIs). Define a **port** (an interface) at the seam. The deep module owns the logic, and you inject the transport as an **adapter**. Tests use an in-memory adapter. Production uses an HTTP, gRPC, or queue adapter.

Recommendation shape: *"Define a port at the seam. Implement an HTTP adapter for production and an in-memory adapter for tests. The logic then sits in one deep module, even though you deploy it across a network."*

### 4. True external (Mock)

Third-party services (Stripe, Twilio) that you do not control. The deepened module takes the external dependency as an injected port, and tests supply a mock adapter.

## Seam discipline

- **One adapter means a hypothetical seam. Two adapters mean a real one.** Do not add a port unless at least two adapters are justified, usually production plus test. A seam with one adapter is only indirection.
- **Internal seams and external seams.** A deep module can have internal seams (private to its implementation, used by its own tests) as well as the external seam at its interface. Do not expose an internal seam through the interface just because tests use it.

## Testing strategy: replace, do not layer

- Old unit tests on shallow modules are redundant once tests exist at the deepened module's interface. Delete them.
- Write new tests at the deepened module's interface. The **interface is the test surface**.
- Tests assert on observable results through the interface, not on internal state.
- Tests then survive internal refactors, because they describe behavior and not implementation. If a test must change when the implementation changes, that test reaches past the interface.
