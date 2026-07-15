# Diagram Index — Required Set and Status

**Source of truth:** Mermaid blocks inside design specs (not separate binary files).  
**Rule:** If you change architecture, update the owning doc **and** this index status.

## Legend

| Status | Meaning |
|--------|---------|
| **OK** | Present in doc; matches current architecture text |
| **MILESTONE** | Add/expand when that milestone starts |
| **N/A** | Not required for Anvil v1 plan |

## Required diagrams for planning completeness

| ID | Diagram | Type | Location | Status | Matches research |
|----|---------|------|----------|--------|------------------|
| D01 | System context (agent–CLI–game–runtime) | flowchart | `04` §1 | **OK** | GC environment ℰ |
| D02 | Logical class / package UML | classDiagram | `04` §2 | **OK** | modular engine |
| D03 | Layer dependency rules | table + text | `04` §3 | **OK** | ACI isolation |
| D04 | Deploy nodes (dev machine) | flowchart | `12` §9 | **OK** | — |
| D05 | Kernel main loop | sequence | `07` §1 | **OK** | — |
| D06 | Scene state machine | stateDiagram | `07` §3 | **OK** | — |
| D07 | Agent happy path (new game) | sequence | `12` §1 | **OK** | GC end-to-end |
| D08 | Validate fail fix loop | sequence | `12` §2 | **OK** | DG feedback |
| D09 | Asset greybox | sequence | `12` §3 | **OK** | GD graphics gap |
| D10 | Module load at boot | sequence | `12` §4 | **OK** | DG submodules |
| D11 | Debug after test fail | flowchart | `12` §5 | **OK** | GC/GD eyes |
| D12 | Recipe apply | sequence | `12` §6 | **OK** | Voyager skills |
| D13 | Cinematic play | sequence | `12` §7 | **OK** | — |
| D14 | Card damage resolve | sequence | `12` §8 | **OK** | — |
| D15 | Agent ACI canonical loop | flowchart | `05` §4 | **OK** | SWE-agent ACI |
| D16 | Card battle states | stateDiagram | `08` §3.2 | **OK** | — |
| D17 | Content ER sketch | erDiagram | `06` §1 | **OK** | data-driven |
| D18 | CI pipeline | sequence | `18` §6 | **OK** | — |
| D19 | Package dependency graph | flowchart | `17` §3 (text) | **OK** (text graph) | — |
| D20 | Topdown activity | flowchart | `specs/S-TOPDOWN.md` | **OK** | — |
| D21 | VN graph | grammar + runtime | `specs/S-VN.md` | **OK** | — |
| D22 | Shmup waves/bullets | tables + rules | `specs/S-SHMUP.md` | **OK** | — |
| D23 | FPS2 ray sequence | sequence | `specs/S-FPS2.md` | **OK** | — |
| D24 | Net messages | tables | `specs/S-NET.md` | **OK** | — |
| D25 | Full task dependency | flowchart | `20` | **OK** | Spec Kit tasks |
| D26 | Use-case (actors) | textual | `01` | **OK** | — |
| D27 | C4 code-level | class | — | **After code** | reverse-engineer |

## Diagram quality rules

1. Names in diagrams must match `05` CLI and `04` component names.  
2. No Phaser types in game-facing diagrams.  
3. On contradiction: **spec text wins**, then fix diagram same day.  

## SVG/PNG exports

Not required. Optional later for slides. Do not treat missing PNG as a planning gap.
