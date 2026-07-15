# 03 — Requirements

IDs are stable. Trace to acceptance in `14_ACCEPTANCE_AND_TRACEABILITY.md`.  
Sources: (GC)=GameCraft, (GD)=GameDevBench, (DG)=DreamGarden, (SW)=SWE-agent, (VY)=Voyager.

## 1. Functional requirements

### 1.1 Project & lifecycle

| ID | Requirement | Research |
|----|-------------|----------|
| **REQ-P01** | Scaffold a complete game package with one command (`anvil new`) | GC D-II |
| **REQ-P02** | Package must be launchable without manual assembly | GC D-II |
| **REQ-P03** | All game meaning expressible as text files (YAML/JSON/TS) | GC Table 2 |
| **REQ-P04** | `anvil validate` checks schemas + referential integrity | DG feedback |
| **REQ-P05** | `anvil dev` runs browser preview with hot reload | — |
| **REQ-P06** | `anvil test` runs headless deterministic scenarios | GC D-III, GV |
| **REQ-P07** | `anvil observe` exports JSON world summary | GD/GC eyes |
| **REQ-P08** | `anvil observe --shot` writes PNG screenshot | GD/GC |
| **REQ-P09** | `anvil assets missing` lists unresolved paths | GC completeness |
| **REQ-P10** | `anvil recipe list/show` exposes skill library | VY |

### 1.2 Runtime kernel

| ID | Requirement | Research |
|----|-------------|----------|
| **REQ-K01** | Fixed timestep simulation with pause | — |
| **REQ-K02** | Seeded RNG for reproducibility | GC/tests |
| **REQ-K03** | Scene stack (push/pop/replace) | — |
| **REQ-K04** | Entity IDs + sparse components (ECS-lite) | — |
| **REQ-K05** | System registration by modules | DG submodules |
| **REQ-K06** | Typed event bus | — |
| **REQ-K07** | Input as named actions (not raw keys only) | — |
| **REQ-K08** | Asset resolve by path; greybox if missing | GD graphics gap |
| **REQ-K09** | Audio cue playback table | — |
| **REQ-K10** | Video cinematic play/skip/loop from file paths | — |
| **REQ-K11** | Save/load JSON snapshot API | — |
| **REQ-K12** | Render backend hidden behind facade (no Phaser in games) | LR, SW |

### 1.3 Genres

| ID | Requirement | Tier |
|----|-------------|------|
| **REQ-G01** | `genre-card`: cards, hand, draw, effects DSL, turns | 0 |
| **REQ-G02** | `genre-topdown2d`: move, collide, anim, AI, maps | 1 |
| **REQ-G03** | `genre-vn`: script graph, choices, portraits | 1 |
| **REQ-G04** | `genre-shmup`: scroll, waves, bullet patterns as data | 1 |
| **REQ-G05** | `genre-fps2`: Doom-like move, billboards, hitscan | 2 |
| **REQ-G06** | `genre-net` design + thin spike only (not full MMO) | 3 |

### 1.4 Agent ergonomics

| ID | Requirement | Research |
|----|-------------|----------|
| **REQ-A01** | Public ACI ≤ 30 entry points v1 | SW, GC §5.1 |
| **REQ-A02** | Structured errors: code, path, hint, example | SW |
| **REQ-A03** | Games must not import raw render engine | LR |
| **REQ-A04** | Templates per genre | GC D-II |
| **REQ-A05** | ≥15 recipes before “agent-ready” | VY |
| **REQ-A06** | AGENTS.md skill documents ACI | SW |

### 1.5 Assets

| ID | Requirement | Research |
|----|-------------|----------|
| **REQ-S01** | Content references assets by relative path | — |
| **REQ-S02** | Engine never calls image/video generation APIs | product decision |
| **REQ-S03** | Missing asset → greybox + label, game still runs | GD |
| **REQ-S04** | Optional manifest is path list only | — |

## 2. Non-functional requirements

| ID | Requirement |
|----|-------------|
| **NFR-01** | TypeScript + Vite monorepo |
| **NFR-02** | Example games run on desktop Chrome/Firefox |
| **NFR-03** | Headless tests run in CI without GPU GUI |
| **NFR-04** | Deterministic tests with fixed seed |
| **NFR-05** | Docs + papers are authoritative over chat memory |
| **NFR-06** | Single package manager (pnpm workspaces) |

## 3. Out of scope requirements (do not implement)

| ID | Description |
|----|-------------|
| **OOS-01** | Built-in Imagine/Stable Diffusion |
| **OOS-02** | Full Unity/Unreal feature parity |
| **OOS-03** | Live service MMO (shards, cash shop, anti-cheat) |
| **OOS-04** | Neural next-frame game engine |
| **OOS-05** | i18n / locale system (v1 = UTF-8 content strings only) |
| **OOS-06** | Full a11y (screen readers, color schemes); keyboard actions via InputMap only |
| **OOS-07** | Platformer genre as first-class module (may compose later) |

## 4. Priority

| Priority | REQs |
|----------|------|
| P0 | P01–P08, K01–K08, K12, A01–A03, S01–S03, G01 |
| P1 | P09–P10, K09–K11, G02–G04, A04–A06 |
| P2 | G05 |
| P3 | G06 |
