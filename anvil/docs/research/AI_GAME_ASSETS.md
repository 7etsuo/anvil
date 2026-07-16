# Optional notes: generative image/video for game art

**Not part of the Anvil engine API.**

> This is a historical workflow note for external asset production, not an
> engine capability or instruction to call an image service. Current asset
> behavior is documented in
> [`../design/09_ASSETS_AND_MEDIA.md`](../design/09_ASSETS_AND_MEDIA.md) and
> [`../design/specs/S-ASSETS.md`](../design/specs/S-ASSETS.md).

When an *agent* (e.g. Grok Build with Imagine) chooses to create art, common industry practice is base identity → variants → cleanup → drop files into the game’s `assets/` paths. Anvil only cares that the paths exist.

**Current monorepo guide:** [`../../../docs/GROK_WORKFLOW.md`](../../../docs/GROK_WORKFLOW.md).

For current engine design, see
[`../design/04_SYSTEM_ARCHITECTURE.md`](../design/04_SYSTEM_ARCHITECTURE.md) and
[`../design/05_AGENT_COMPUTER_INTERFACE.md`](../design/05_AGENT_COMPUTER_INTERFACE.md).
