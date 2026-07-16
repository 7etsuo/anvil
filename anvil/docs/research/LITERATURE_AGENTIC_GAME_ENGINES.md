# Literature review: agentic coding of games & agent-friendly engines

> **Research reference, not an API/status document.** Publication summaries
> motivate Anvil's design but do not describe current commands or package
> availability. Use [`../../ENGINE.md`](../../ENGINE.md) and
> [`../design/README.md`](../design/README.md) for implementation guidance.

**Question:** What research exists on *AI agents building video games*, especially with/around real game engines?  
**Date:** 2026-07-15  
**Use for Anvil:** design constraints, evaluation criteria, known failure modes.

This is the map of the field. Closest papers first.

---

## 1. Executive ranking (what to read first)

| Rank | Paper / system | Year | Why it matters for Anvil |
|------|----------------|------|---------------------------|
| **1** | **GameCraft-Bench** | 2026 | Best formalization of *end-to-end* agent game building in a **real engine** (Godot). Three desiderata. Agents fail hard (~41% best). |
| **2** | **GameDevBench** | 2026 (ICML) | First large benchmark of agents **editing** real engine projects (Godot). Multimodal gap; screenshot/video feedback helps. |
| **3** | **DreamGarden** | 2024–25 | LLM planner + specialized submodules + **compiler/runtime feedback** in **Unreal**. Hierarchical plan tree. |
| **4** | **GameGPT** | 2023 | Early multi-agent *game* pipeline (roles: design, engine eng, reviewer, tester). Conceptual + workflow. |
| **5** | **ChatDev / MetaGPT** | 2023–24 | Multi-agent software factories (not game-specific) — role decomposition, chat chains. |
| **6** | **SWE-agent** | 2024 | Agent–computer interfaces for SE; ACI design lessons for tools agents use. |
| **7** | **Voyager** | 2023 | Skill library + env feedback for code-as-action (Minecraft API) — recipe/skill pattern. |
| **8** | **WebGameBench / OpenGame-Bench** | 2026 | End-to-end **web** games; interaction eval without full engines. |
| **9** | **GameGen-Verifier** | 2026 | Runtime verification of generated games (state injection). |
| **10** | **LLMR / XR Blocks / AutoUE** | 2024–26 | Engine-specific assistants (Unity/Unreal/XR); high-level APIs beat raw engines. |

**Honest gap:** There is **no famous paper titled “we built the perfect agent-native game engine.”**  
The field evaluates agents on **Godot/Unreal/Unity/web**. Anvil’s thesis is to **design the environment ℰ** so agents succeed where those engines fail.

---

## 2. Tier A — Directly about agents *building* games in engines

### 2.1 GameCraft-Bench (2026) — **must-read**

- **Title:** *GameCraft-Bench: Can Agents Build Playable Games End-to-End in a Real Game Engine?*  
- **Link:** https://arxiv.org/abs/2606.17861 · site: https://tongxuluo.github.io/gamecraft-bench-website  
- **Setup:** 140 Godot tasks, 15 game families (platformer, card, shooter, VN, …).  
- **Agent job:** Natural-language **game spec → complete Godot project + play demos**.  
- **Best agent ~41%** overall; most &lt;40%.

**Three desiderata** (this should be Anvil’s eval contract):

| Desideratum | Meaning |
|-------------|---------|
| **I. Engine Grounding** | Real engine semantics (scenes, assets, input, launch) — not toy Python game loops only |
| **II. Artifact Completeness** | Full launchable project, not isolated scripts |
| **III. Interactive Verification** | Judge by **play** (replay traces, videos), not static code |

**Why Godot (their engine choice for agents):**

| Property | Godot wins for agents |
|----------|----------------------|
| Open-source | ✓ |
| Lightweight / CLI / headless | ✓ |
| **Text-based scenes/files** | ✓ |
| Native 2D | ✓ |

Unity/Unreal: heavier, more proprietary/binary/editor-centric → worse for automated eval (and agent iteration).

**Failure modes they measure:**

- Partial mechanics without content depth  
- Broken visual feedback  
- Weak art/presentation  
- Build succeeds but **demo/play evidence** missing  
- More bash thrashing ≠ better scores  
- **Screenshot inspection** improves debugging (perception-guided iteration)

**Anvil takeaway:**

1. Design for **complete artifacts** + **headless run** + **observe/replay**.  
2. Prefer **text-first project formats** (Godot lesson).  
3. Score **play**, not just compile.  
4. Tiny stable tools beat “more shell.”

---

### 2.2 GameDevBench (2026, ICML) — **must-read**

- **Title:** *GameDevBench: Evaluating Agentic Capabilities Through Game Development*  
- **Link:** https://arxiv.org/abs/2602.11103 · https://github.com/waynchi/gamedevbench  
- **Setup:** 100s of Godot tasks from tutorials (localized edits: animation, colliders, UI, shaders…).  
- **Finding:** Best agents ~**50–54%**; **2D graphics harder than pure gameplay**.  
- **Image/video feedback** consistently helps agents.

**Contrast with GameCraft-Bench:**

| | GameDevBench | GameCraft-Bench |
|--|--------------|-----------------|
| Scope | Local ops in existing projects | Full game from spec |
| Engine | Godot | Godot |
| Eval | Deterministic Godot tests | Interactive replay + rubrics |

**Anvil takeaway:** Separate logic from art paths; always give agents **eyes** (`observe` screenshot + state JSON).

---

### 2.3 DreamGarden (2024)

- **Title:** *DreamGarden: A Designer Assistant for Growing Games from a Single Prompt*  
- **Link:** https://arxiv.org/abs/2410.01791 · CHI / Microsoft Research  
- **Engine:** Unreal Engine  
- **Architecture:**  
  - LLM **hierarchical planner** (“garden” of plans)  
  - Leaf nodes → specialized **submodules** (C++ actors, procedural mesh, diffusion mesh, asset download)  
  - Feedback from **compiler / editor / runtime**

**Anvil takeaway:**  
Don’t give one agent “the whole Unreal API.” Give **few tools** with clear contracts + **compiler feedback loop**. Hierarchical plan → implement is the right shape for long game tasks.

---

### 2.4 GameGPT (2023)

- **Title:** *GameGPT: Multi-agent Collaborative Framework for Game Development*  
- **Link:** https://arxiv.org/abs/2310.08067  
- **Idea:** Multi-agent roles (request, design, engine engineer, reviewer, tester).  
- **Status:** Early / workflow-oriented; less hard eval than 2026 benches.

**Anvil takeaway:** Role split is optional; **tool contracts + tests** matter more than CEO/CTO theater.

---

### 2.5 Related 2026 game-gen systems (cite cluster)

From GameCraft-Bench related work / concurrent:

| Work | Note |
|------|------|
| **OpenGame-Bench** (arXiv:2604.18394) | Complete games, **web**, weaker interactive engine grounding |
| **WebGameBench** (arXiv:2605.17637) | Browser games + interaction; not Godot/Unity |
| **GameGen-Verifier** (arXiv:2605.07442) | Verify LLM games via runtime state injection |
| **AutoUE** (ACL 2026 findings, cited) | Multi-agent Unreal 3D game generation |
| **CreativeGame / 90% Faster Zero-Code 3D** | Mechanic-aware / MLLM game gen (see GameCraft refs) |

---

## 3. Tier B — Multi-agent software factories (applicable, not game-native)

| Paper | Link | Lesson |
|-------|------|--------|
| **ChatDev** | https://arxiv.org/abs/2307.07924 | Chat chains, roles, communicative dehallucination |
| **MetaGPT** | ICLR 2024 | SOPs / meta-programming for multi-agent |
| **SWE-agent** | NeurIPS 2024 | **Agent–computer interface** design: constrain tools so agents succeed |
| **OpenHands** | ICLR 2025 area | Generalist SE agents |

**Anvil takeaway:** Invest in **ACI** (what commands exist, error format, sandbox) more than in spawning 8 persona agents.

---

## 4. Tier C — Code-as-skills / API-first worlds

| Paper | Link | Lesson |
|-------|------|--------|
| **Voyager** | https://arxiv.org/abs/2305.16291 | Skill library, curriculum, iterative code fix from env errors |
| LLM + games survey (Gallotta et al.) | https://antoniosliapis.com/articles/llm_and_games.php | Broader LLM×games map (play, PCG, NPCs, tools) |

**Anvil takeaway:** Ship **`anvil recipe`** skill library; code against **stable high-level APIs**, not engine guts.

---

## 5. Tier D — Engine-adjacent assistants / XR

| System | Link / venue | Lesson |
|--------|--------------|--------|
| **LLMR** | https://arxiv.org/abs/2312.09980 | LLMs as mixed-reality creators in Unity — high-level creation API |
| **XR Blocks + Vibe Coding XR** | arXiv:2603.24591 | High-level web XR beats raw engine hierarchies for LLM authors |
| **NVIDIA RAG for UE5** | NVIDIA blog 2024 | RAG over engine docs reduces hallucination |

**Anvil takeaway:** **Raise the abstraction** until agents don’t need the full engine class browser.

---

## 6. What “best engine for agents” means in the literature

No paper crowns Unity. Empirical preference in **automated** agent eval:

```text
Text-first + CLI/headless + small API surface
        ≫
GUI-heavy + binary scenes + 10k APIs
```

Godot is the **current research default** for agent gamedev benches (GameDevBench, GameCraft-Bench) **because of file format and tooling**, not because GDScript is ideal (agents still hallucinate APIs).

DreamGarden shows **Unreal works** if you wrap it in **submodules + feedback**, not freeform C++.

**Anvil’s research-backed niche:**

> Build the **environment ℰ** that maximizes agent success under GameCraft’s three desiderata —  
> with a **deliberately tiny ACI**, text projects, observe/replay, and genre modules —  
> rather than fighting Godot/Unity’s full surface area.

---

## 7. Implications checklist for Anvil (from papers)

| From research | Anvil requirement |
|---------------|-------------------|
| Engine Grounding | Real runtime (not only stringly “game” scripts) |
| Artifact Completeness | `anvil new` → full runnable package |
| Interactive Verification | `anvil test` + `observe` + optional replay |
| Visual feedback | Screenshots in agent loop |
| Small tool surface | CLI ≤ tens of commands (SWE-agent / GameCraft bash fail mode) |
| Hierarchical plans | Recipes + genre modules, not one mega-prompt |
| Compiler feedback | validate + typecheck + headless run errors |
| Text projects | JSON/YAML + TS, no binary scenes |
| Multi-genre breadth | Card/platformer/VN… appear in GameCraft families |
| Don’t overclaim MMO/3D | Explicit limitations in GameCraft too |

---

## 8. Gaps (opportunity for Anvil / papers)

1. **No standard “agent-native engine” product** evaluated against GameCraft-style metrics.  
2. Benchmarks fix **Godot/Unreal**, not a custom simplified engine.  
3. Little work on **genre DSLs** as first-class (card DSL, topdown DSL) for agents.  
4. Multiplayer/MMO agent *authoring* almost absent (TITAN is MMO *testing*).  
5. Art supply is mixed into “graphics tasks” — Anvil keeps art **file-external**.

---

## 9. Reading order (one evening)

1. GameCraft-Bench abstract + §2 desiderata (2606.17861)  
2. GameDevBench abstract + multimodal feedback (2602.11103)  
3. DreamGarden method overview (2410.01791)  
4. SWE-agent ACI section (agent-computer interfaces)  
5. Voyager skill library  
6. Skim GameGPT + ChatDev for multi-agent patterns  

---

## 10. Bib snippets (copy-paste)

```
GameCraft-Bench   arXiv:2606.17861  (2026)
GameDevBench      arXiv:2602.11103  (2026, ICML)
DreamGarden       arXiv:2410.01791  (2024)
GameGPT           arXiv:2310.08067  (2023)
ChatDev           arXiv:2307.07924  (2023/24)
MetaGPT           ICLR 2024
SWE-agent         NeurIPS 2024
Voyager           arXiv:2305.16291  (2023)
WebGameBench      arXiv:2605.17637  (2026)
GameGen-Verifier  arXiv:2605.07442  (2026)
LLMR              arXiv:2312.09980  (2023/24)
OpenGame-Bench    arXiv:2604.18394  (2026)
```

Living player-agent survey (different problem — agents *playing* games):  
https://arxiv.org/abs/2404.02039 · https://github.com/git-disl/awesome-LLM-game-agent-papers
