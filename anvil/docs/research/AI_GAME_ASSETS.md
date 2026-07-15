# Optional notes: generative image/video for game art

**Not part of the Anvil engine API.**

When an *agent* (e.g. Grok Build with Imagine) chooses to create art, common industry practice is base identity → variants → cleanup → drop files into the game’s `assets/` paths. Anvil only cares that the paths exist.

For engine design, see `ARCHITECTURE.md` and `AGENT_UX.md` (assets = files, greybox if missing).
