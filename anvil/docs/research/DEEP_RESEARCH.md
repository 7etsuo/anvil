# Anvil — Deep Research: Agent-Native Game Engines

**Purpose:** Ground Anvil design in published work, production lessons, and failure modes.  
**Priority shift:** Build **Anvil first**. Games (including Gravewake) come **after** the engine is usable.  
**Date:** 2026-07-15

---

## 1. Two different things people call “AI game engines”

| Paradigm | What it is | Examples | Fit for agent-authored games |
|----------|------------|----------|------------------------------|
| **A. Neural / generative runtime** | Model predicts next frames from actions; little traditional sim | [GameNGen](https://gamengen.github.io/) (diffusion DOOM ~20+ FPS), related world models | Research-interesting; **not** for authorable multi-genre + discrete rules |
| **B. Classical engine + agent authoring** | Real sim; LLM writes **content + glue**; assets are **just files** (any source) | Godot/Unity + agents; data-driven frameworks; **Anvil target** | **This is Anvil** |

GameNGen shows neural engines can *look* interactive, but gameplay rules, multiplayer, cards, MMOs need **explicit state**. Anvil is **paradigm B**.

---

## 2. Research landscape: LLM + games

### 2.1 LLM *as player / NPC* (not our primary goal)
Survey: **[A Survey on Large Language Model-Based Game Agents](https://arxiv.org/html/2404.02039v5)** (Hu et al., CSUR track; living list [awesome-LLM-game-agent-papers](https://github.com/git-disl/awesome-LLM-game-agent-papers)).

Unified LLMGA architecture:
- **Memory** (working + long-term)
- **Reasoning** (CoT, reflexion, plans)
- **Perception–action** interfaces to the game

Genre → core agent challenge:

| Genre | Core challenge for *playing* agents |
|-------|-------------------------------------|
| Action | Low-latency response |
| Adventure | Stateful world modeling |
| RPG | Role fidelity |
| Strategy / cards | Opponent-aware planning |
| Simulation | Dynamics fidelity |
| Sandbox | Open-ended goal progression |

**Implication for Anvil:** We are building the **environment + tools for authoring**, not an LLM that plays Street Fighter. But the survey’s **perception–action interface** lesson applies: agents (including *coding* agents) need **structured observations** and **constrained actions**, not raw pixels only.

### 2.2 LLM *as developer* of games (our primary goal)
**[GameDevBench](https://arxiv.org/html/2602.11103v1)** (Chi et al., 2026) — first major benchmark for agents *developing* games (Godot-focused):

| Finding | Design response for Anvil |
|---------|---------------------------|
| Best agents solve only ~**47–54%** of tasks | Engine must **shrink** task complexity |
| Multimodal harder: gameplay ~47% vs **2D graphics ~32%** | Separate **logic** from **art**; art is external files |
| Image/video feedback **helps** (e.g. Sonnet 4.5 33%→48%) | Built-in **screenshot + short capture** for agent QA |
| Godot chosen because **projects are code-representable** | Anvil: **100% text/JSON**; no binary scene formats |
| Tasks need 3× more LOC/file churn than SWE-Bench | Prefer **declarative content** over generating huge scripts |

Production lessons ([Luden.io](https://blog.luden.io/ai-agents-in-game-development-real-production-lessons-failed-experiments-and-workshop-101-7d71e64685fa) and community reports):
- Scene editing in complex geometry **fails often**
- Large GUI APIs (Unity anchors, etc.) thrash agents
- “Build like this example” works better than open-ended freedom
- Agents can’t see the game unless you **give them eyes**

HN / Godot agent skills reports:
- GDScript hallucination (Python idioms)
- Build-time vs runtime API confusion
- **Separate visual QA agent** improves honesty

### 2.3 Embodied skill libraries (authoring pattern)
**[Voyager](https://voyager.minedojo.org/)** (Wang et al., 2023, arXiv:2305.16291):
1. Automatic curriculum  
2. **Skill library** of verified executable code  
3. Iterative prompt with **env feedback + errors + self-verify**

**Implication:** Anvil should expose a **small, stable skill surface** (`spawn`, `defineCard`, `loadMap`, …) and keep a **verified recipe library** agents retrieve—not invent new engine APIs every game.

### 2.4 Multiplayer / MMO testing agents
**TITAN** (arXiv:2509.22170) — LLM testing for MMORPGs: state abstraction, action optimization, reflection, oracles; deployed in real QA pipelines.

**Implication:** MMO needs **state abstraction APIs** and headless oracles from day one if we ever support multiplayer; don’t bolt on later.

---

## 3. Pitfalls (must design against)

| Pitfall | Evidence | Anvil countermeasure |
|---------|----------|----------------------|
| **Huge engine API surface** | GameDevBench, Unity/Godot agent failures | **≤ ~30 public commands** for v1 agent surface |
| **Binary / opaque scenes** | Godot still better than Unity binaries; still painful | Pure **JSON/YAML game defs** + code modules only when needed |
| **Hallucinated APIs** | Godot 3 vs 4 mixups, invented methods | Version-pinned docs; **schema reject**; no freeform engine edits by default |
| **Blind agents** | GameDevBench multimodal gap | `anvil observe` → JSON state + PNG screenshot |
| **Art entangled with logic** | Graphics tasks fail more | **Path slots** + greybox; art external |
| **Scope: “full MMO in v1”** | Industry reality | **Capability tiers** (see §5) |
| **Neural-only engine** | GameNGen | Explicit sim for rules genres (cards, RPG systems) |
| **No verify loop** | Voyager success factor | `anvil test` + headless tick + deterministic seeds |
| **Catastrophic side effects** | Agent failure catalogs (delete DB, wipe disk) | Sandboxed project dir; no destructive defaults |
| **Inconsistent world state in prompts** | LLMGA memory literature | Engine is source of truth; agent reads state, doesn’t invent it |

---

## 4. Assets stay outside the engine

Anvil is **not** an art generator and does **not** depend on Grok Imagine (or any model).

| Engine responsibility | Not engine responsibility |
|----------------------|---------------------------|
| Resolve path → texture/audio/video | Creating the file |
| Greybox if missing | Prompting image/video models |
| Optional “missing files” report | Style bibles, base→edit workflows |

Grok Build already has Imagine tools when *that* agent is authoring; another agent can use other tools. Same Anvil.

Historical notes on gen art practice (optional, not engine API): `AI_GAME_ASSETS.md`.

---

## 5. Multi-genre ambition vs honesty

User ask: ARPG, FPS, MMO, cards, whatever.

| Genre | Agent-author friendliness | Art complexity | Anvil support plan |
|-------|---------------------------|----------------|--------------------|
| **Card / board / deckbuilder** | ★★★★★ data tables | Low–med (icons/faces) | **Tier 0 — first** |
| **Top-down 2D ARPG/RPG** | ★★★★ | Med (sprites/plates) | **Tier 1** |
| **2D platformer / shmup** | ★★★★ | Med | **Tier 1** |
| **Visual novel** | ★★★★★ | Med (portraits/BG) | **Tier 1** |
| **2.5D / Doom-like FPS** | ★★★ | Med (textures/sprites) | **Tier 2** |
| **True 3D FPS (modern)** | ★★ | High (meshes/rigs) | **Tier 3 — later** |
| **Local co-op multiplayer** | ★★★ | Same as SP | **Tier 2** |
| **MMO / live service** | ★ | Same + ops | **Tier 3** |

**Strategy:** One **core** (time, entities, assets, input, observe, save) + **genre modules**.  
Never claim “Anvil is an MMO engine” in v1. Claim: **architecture allows networking module later**; first ship **offline multi-genre**.

---

## 6. What “trivial for agents” means (design bar)

An agent that is good at TypeScript should be able to:

1. Create a game with **one command**  
2. Describe a game in **one declarative file** (or small set)  
3. Run **validate → dev → test → observe** without GUI  
4. Never touch Phaser/Unity/Godot internals for standard games  
5. Supply art as **files at expected paths** (any tool), not inventing folder chaos  
6. Get **structured errors** with fix hints  
7. Copy **recipes** from a skill library  

If the agent must learn 800 engine classes, **we failed**.

---

## 7. Comparative options

| Approach | Pros | Cons | Verdict |
|----------|------|------|---------|
| Unity + agent | Industry standard | GUI, C#, binary scenes, anchors hell | Reject as primary |
| Godot + agent | Text scenes, open, GameDevBench | GDScript hallucinate; still node soup; multimodal hard | Secondary compile target **maybe later** |
| Raw Phaser/Pixi per game | Flexible | Every game reinvents; agent freestyles | Reject |
| Pure neural (GameNGen) | No assets? | No discrete rules; not multi-genre authoring | Research only |
| **Anvil (declarative + thin TS runtime)** | Agent-optimal, asset-agnostic, multi-genre modules | Must build it | **Chosen** |

---

## 8. Recommended Anvil architecture (research-backed)

```text
┌─────────────────────────────────────────────────────────┐
│  AGENT SURFACE (tiny)                                    │
│  anvil new | validate | dev | test | observe | assets    │
│  game.yaml + content/*.json + assets.manifest.yaml       │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│  CORE                                                    │
│  Clock, Scene graph, Entity store, Events, Save, Input  │
│  Asset resolver (greybox), Cinematic player, Audio bus   │
│  Observe API (JSON state + screenshot)                   │
└──────────────────────────┬──────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
   genre-card         genre-topdown2d      genre-fps2
   genre-vn           genre-shmup          genre-net (later)
```

**Runtime host:** TypeScript + Vite; render via **Phaser or Pixi behind a facade** (agent never imports raw Phaser for standard games).

**Optional later:** export/headless Godot for specific targets—not the authoring UX.

---

## 9. Key papers & resources (short list)

| Resource | Why it matters |
|----------|----------------|
| Hu et al. LLMGA survey arXiv:2404.02039 | Genre challenges, memory/reason/act |
| GameDevBench arXiv:2602.11103 | Agents fail at game *dev*; multimodal; feedback helps |
| Voyager arXiv:2305.16291 | Skill library + env feedback loop |
| GameNGen arXiv:2408.14837 | Neural engines ≠ authoring engines |
| TITAN arXiv:2509.22170 | MMO test abstraction |
| Generative Agents (Park et al. 2023) | Memory/reflection patterns |
| Luden.io production post | Real studio agent failures |
| awesome-LLM-game-agent-papers | Living bibliography |
| Prior Anvil notes | `AI_GAME_ASSETS.md`, `AGENT_GAME_FRAMEWORKS.md` |

---

## 10. Conclusions for Anvil product direction

1. **Engine first** — no Gravewake implementation until core + ≥2 genre modules work.  
2. **Trivial agent UX** is the primary KPI, not feature parity with Unity.  
3. **Declarative games + tiny command set + observe/test loops.**  
4. **Assets = files**; no generator vendor in the engine.  
5. **Multi-genre via modules**; MMO/true 3D FPS are **late tiers**, not v1 lies.  
6. **Screenshot/state observation** is mandatory (GameDevBench).  
7. **Skill/recipe library** compounds agent ability (Voyager).  
8. Do **not** build a neural DOOM predictor as the product core.  
