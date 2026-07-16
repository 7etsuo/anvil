# 19 — Architecture Decision Records (ADR)

Format: status, context, decision, consequences, research link.

---

## ADR-001: Classical engine, not neural frame predictor

- **Status:** Accepted  
- **Context:** GameNGen-style models simulate pixels, not authorable multi-genre rules.  
- **Decision:** Anvil is a discrete state simulation + renderer.  
- **Consequences:** Cards, RPG stats, net sync possible; cannot “dream” frames as authority.  

---

## ADR-002: TypeScript monorepo + Vite, not Godot/Unity as host

- **Status:** Accepted  
- **Context:** GameCraft/GameDevBench use Godot for **evaluation** because of text files + headless; GDScript still hallucinated. We control the API surface.  
- **Decision:** Ship TS Anvil; text JSON content; optional future export targets not required.  
- **Consequences:** Agent-facing API is ours; we must implement runtime ourselves.  
- **Research:** GC Table 2; GD; LR high-level API.  

---

## ADR-003: Phaser behind facade only

- **Status:** Accepted  
- **Context:** Agents fail on large engine APIs.  
- **Decision:** Games import public Anvil packages only; Phaser is isolated in the render package.
- **Consequences:** Lint ban; swap renderer later.  
- **Research:** SWE-agent ACI; LLMR.  

---

## ADR-004: ECS-lite, not full bitECS SoA

- **Status:** Accepted  
- **Context:** Clarity for agents > max entity throughput for v1 demos.  
- **Decision:** Entity + component bags + systems.  
- **Consequences:** Simpler mental model; not 10k bullet peak optimized yet.  

---

## ADR-005: Genre modules, not one mega-engine API

- **Status:** Accepted  
- **Context:** DreamGarden submodules outperform freeform full-engine coding.  
- **Decision:** `genre-card`, `genre-topdown2d`, etc.  
- **Research:** DG; GC multi-family tasks.  

---

## ADR-006: No image/video generator in engine

- **Status:** Accepted  
- **Context:** Art models belong to the coding agent/user, not the runtime.  
- **Decision:** Paths + greybox only.  
- **Consequences:** `anvil assets missing` only; no Imagine coupling.  

---

## ADR-007: Interactive tests over LLM-as-judge in CI

- **Status:** Accepted  
- **Context:** GameCraft uses multimodal judges; flaky for CI.  
- **Decision:** Deterministic scenario asserts on observe JSON.  
- **Consequences:** Less “fun” scoring; more reliable agent loops.  

---

## ADR-008: Recipes as skill library (not mandatory multi-agent org)

- **Status:** Accepted  
- **Context:** Voyager skills; ChatDev/MetaGPT roles optional.  
- **Decision:** `anvil recipe` packs; single-agent primary.  
- **Research:** VY; CD; MG.  

---

## ADR-009: Full MMO scope is excluded; multiplayer adapters remain modular

- **Status:** Accepted  
- **Context:** User wants multi-genre including MMO; research shows authoring MMO is out of band for v1.  
- **Decision:** Keep the M8 transport spike small; support authoritative room
  multiplayer through a separate Colyseus adapter without claiming a complete
  MMO platform.
- **Consequences:** Real WebSocket and Colyseus code may exist while shards,
  account economy, matchmaking product, anti-cheat, and MMO operations remain
  outside core engine scope.

---

## ADR-010: Planning gaps closed per milestone

- **Status:** Accepted  
- **Context:** Cannot freeze all genre algorithms before M1.  
- **Decision:** Gap register `16`; close GAP-* when milestone needs them.  

---

## ADR-011: Schema-v2 source compiles to immutable canonical IR

- **Status:** Accepted
- **Context:** Agents need a deterministic, inspectable world model shared by
  headless and browser verification without executing arbitrary content code.
- **Decision:** A v2 manifest points to an intent contract; host-side
  `@anvil/authoring` compiles intent and JSON into sorted, deeply frozen IR with
  a canonical source hash.
- **Consequences:** Node/browser consumers can prove content provenance;
  migration and IR versions are explicit; generic CLI integration is required
  before v2 becomes the default path.

---

## ADR-012: Declarative ARPG layer with restricted title hooks

- **Status:** Accepted
- **Context:** Gravewake required reusable ARPG content/rule capability without
  giving a title control of kernel scheduling or the renderer.
- **Decision:** `@anvil/genre-arpg` materializes compiled IR, executes finite
  rules, and creates title sessions through `defineArpgGame` with narrowed
  scene services.
- **Consequences:** Title content/balance remains outside the engine; the same
  IR feeds Node and Vite; renderer/kernel ownership stays enforceable; generic
  CLI loader/scaffold work remains a milestone acceptance condition.
