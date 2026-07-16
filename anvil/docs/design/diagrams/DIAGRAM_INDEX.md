# Diagram index

Mermaid blocks live with the text they explain. Update this index when a flow
or ownership boundary changes.

| ID | Diagram | Type | Current location/status |
|----|---------|------|-------------------------|
| D01 | System/authoring context | flowchart | `04` Context — current |
| D02 | Package dependencies | flowchart | `04` Package view — current |
| D03 | Layer ownership | table | `04` Dependency and ownership rules — current |
| D04 | Development nodes | flowchart | `12` §9 — current |
| D05 | Kernel main loop | sequence | `07` §1 — current |
| D06 | Illustrative scene lifecycle | state diagram | `07` §3 — illustrative, games define actual scenes |
| D07 | Schema-v1 new-game flow | sequence | `12` §1 — current for supported scaffolds |
| D08 | Validation repair loop | sequence | `12` §2 — current |
| D09 | Asset greybox flow | sequence | `12` §3 — current |
| D10 | Module load flow | sequence | `12` §4 — current, includes ARPG limitation note |
| D11 | Test-failure debug loop | flowchart | `12` §5 — current |
| D12 | Manual recipe use | sequence | `12` §6 — current |
| D13 | Cinematic flow | sequence | `12` §7 — engine capability, not used by Gravewake |
| D14 | Card damage resolution | sequence | `12` §8 — current concept |
| D15 | Agent validation/test loop | flowchart | `05` — current |
| D16 | Card battle states | retired | No live Mermaid; `specs/S-CARD.md` and tests are authoritative |
| D17 | Project/content/authoring model | ER diagram | `06` — current |
| D18 | CI workflow | flowchart | `18` CI flow — current with known coverage gaps |
| D19 | Repository dependency rules | text graph | `17` — current |
| D20 | Top-down activity | flowchart | `specs/S-TOPDOWN.md` — current |
| D21 | VN graph | grammar/runtime | `specs/S-VN.md` — current |
| D22 | Shmup waves/bullets | tables/rules | `specs/S-SHMUP.md` — current |
| D23 | FPS2 ray flow | sequence | `specs/S-FPS2.md` — current |
| D24 | Networking protocol | tables | `specs/S-NET.md` and `S-NET-COLYSEUS.md` — current |
| D25 | Milestone dependency | flowchart | `20` — current through M11 |
| D26 | Product actors | text | `01` — current |
| D27 | Schema-v2 compile/materialize/runtime | sequence | `12` §10 — current |

Rules:

1. Names in diagrams must match code/current command docs.
2. Game-facing diagrams must not expose Phaser or kernel internals.
3. Text/spec status wins a contradiction; fix the diagram in the same change.
4. PNG/SVG exports are optional presentation artifacts, not implementation
   evidence.
