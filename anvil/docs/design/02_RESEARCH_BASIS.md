# 02 — Research Basis (claims ↔ papers)

Every major Anvil decision traces to a local PDF under `../research/papers/`.
Research justifies design choices; it does not override current API/status
documents or executable tests.

## 1. Paper registry

| Key | PDF | Full title |
|-----|-----|------------|
| GC | `2606.17861.pdf` | GameCraft-Bench: Can Agents Build Playable Games End-to-End in a Real Game Engine? |
| GD | `2602.11103.pdf` | GameDevBench: Evaluating Agentic Capabilities Through Game Development |
| DG | `2410.01791.pdf` | DreamGarden: A Designer Assistant for Growing Games from a Single Prompt |
| GG | `2310.08067.pdf` | GameGPT: Multi-agent Collaborative Framework for Game Development |
| CD | `2307.07924.pdf` | ChatDev: Communicative Agents for Software Development |
| MG | `2308.00352.pdf` | MetaGPT: Meta Programming for A Multi-Agent Collaborative Framework |
| SW | `2405.15793.pdf` | SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering |
| VY | `2305.16291.pdf` | Voyager: An Open-Ended Embodied Agent with Large Language Models |
| LR | `2312.09980.pdf` | LLMR: Real-time Prompting of Interactive Worlds using LLMs (LLMR) |
| WG | `2605.17637.pdf` | WebGameBench |
| GV | `2605.07442.pdf` | GameGen-Verifier |
| LS | `2404.02039.pdf` | A Survey on Large Language Model-Based Game Agents |

## 2. Design claims and sources

| Claim ID | Design claim | Source |
|----------|--------------|--------|
| C1 | Evaluate **playable interactive systems**, not only source correctness | GC §1–2 |
| C2 | Three desiderata: **engine grounding, artifact completeness, interactive verification** | GC §2.2 |
| C3 | Prefer **text-based project files** + CLI/headless for agent eval | GC Table 2 (Godot rationale) |
| C4 | Agents often get **partial mechanics** but fail content/visuals/completion | GC §4–5 |
| C5 | **Screenshot / video feedback** improves agent success | GD abstract; GC §5.1 |
| C6 | **More tools/bash ≠ better games** | GC §5.1 (MiMo analysis) |
| C7 | Hierarchical **plan → specialized implementers** + compiler feedback | DG |
| C8 | Multi-agent roles optional; structure helps | GG, CD, MG |
| C9 | **ACI (agent-computer interface)** quality dominates outcomes | SW |
| C10 | **Skill libraries** of verified code compound ability | VY |
| C11 | **High-level creation APIs** beat raw engine APIs | LR |
| C12 | Interactive browser eval is complementary to engine eval | WG |
| C13 | Runtime verification can inject/check game state | GV |
| C14 | Playing agents ≠ authoring engines (separate problem) | LS |
| C15 | Deterministic intent/IR gives agents a stable executable world model | Synthesis of C1–C3, C7, C9, C13 |

## 3. Mapping claims → Anvil features

| Claim | Anvil feature | Spec doc |
|-------|---------------|----------|
| C1–C2 | `anvil test`, observe, complete package layout | 10, 05, 12 |
| C3 | JSON/YAML + TS; no binary scenes | 06, 12 |
| C4 | Genre completeness checklists + recipes | 08, 11, 14 |
| C5 | `anvil observe --shot` | 05, 10 |
| C6 | ≤30 CLI commands; forbid raw engine imports in games | 05 |
| C7 | Genre modules + recipes as “submodules” | 08, 11 |
| C8 | Optional multi-agent via roles in AGENTS.md (not required) | 05 |
| C9 | Full ACI spec | 05 |
| C10 | `@anvil/recipes` | 11 |
| C11 | Facade over Phaser/Pixi | 04, 07 |
| C12 | Web host for dev preview | 07 |
| C13 | Headless state assertions | 10 |
| C14 | Do not build “LLM NPC brain” as core | 01 |
| C15 | Schema-v2 intent, immutable IR, finite rules, provenance | S-AUTHORING, S-ARPG |

## 4. What we deliberately do *not* copy

| Idea | Why not |
|------|---------|
| Force Godot/GDScript | Agents hallucinate GDScript; we control TS + schemas |
| Force Unreal C++ (DreamGarden path) | Too heavy for agent triviality v1 |
| Neural DOOM engine | Wrong product class |
| Built-in image model | Art is external files |

## 5. Further reading

- Narrative literature review: `../research/LITERATURE_AGENTIC_GAME_ENGINES.md`  
- Earlier synthesis: `../research/DEEP_RESEARCH.md`  
