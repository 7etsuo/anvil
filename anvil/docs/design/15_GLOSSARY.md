# 15 — Glossary

| Term | Definition |
|------|------------|
| **ACI** | Agent–Computer Interface — the commands/tools an agent uses (SWE-agent) |
| **Anvil** | This engine/SDK |
| **AnvilGameIR** | Deeply frozen schema-v2 output containing manifest, intent, capabilities, resolved authoring data, raw content, and source hash |
| **Artifact completeness** | Full launchable game package (GameCraft D-II) |
| **ECS-lite** | Entities + optional components + systems, not full SoA ECS |
| **Engine grounding** | Real engine semantics, not abstract pseudocode (GameCraft D-I) |
| **Genre module** | Pluggable domain systems (card, topdown, …) |
| **Greybox** | Placeholder quad when asset missing |
| **Interactive verification** | Judge by play/tests under input (GameCraft D-III) |
| **Kernel** | Core loop: time, world, scenes, assets, facade |
| **Observe** | Export state JSON + optional screenshot |
| **Project schema version** | Version of `game.yaml` authoring boundary; currently v1 legacy or v2 intent-based |
| **Observation schema version** | Independent version of `ObserveSnapshot`; currently 1 |
| **Prefab** | Schema-v2 authored component bundle composed from one parent, ordered traits, and local overrides |
| **Recipe** | Verified small skill/patch (Voyager-like) |
| **Render facade** | Abstraction over Phaser/Pixi |
| **Skill library** | Set of recipes agents retrieve |
| **Template** | Full starter from `anvil new` |
| **Trait** | Reusable schema-v2 component record with optional requirements/conflicts |
| **Restricted title hook** | `defineArpgGame` boundary that supplies public scene services but withholds renderer/kernel/scheduler ownership |

## Paper short keys

See `02_RESEARCH_BASIS.md` registry (GC, GD, DG, …).
