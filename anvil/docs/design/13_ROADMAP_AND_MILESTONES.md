# 13 — Roadmap and Milestones

Engine-first. Games (Gravewake) after M6 minimum.

## 1. Milestone table

| ID | Name | Exit criteria | REQs |
|----|------|---------------|------|
| **M0** | Docs freeze | This design suite complete; papers on disk | — |
| **M1** | Kernel + ACI | `new` (none), `validate`, `dev`, `test`, `observe` JSON | P01–P07, K01–K07, K12, A01–A03 |
| **M2** | Assets + save | Greybox, shot, cinematic, audio, **save/load**, manifest | P08–P09, K08–K11, S01–S04 |
| **M3** | genre-card | hello-card playable + ≥5 card recipes + tests | G01, A04–A05 partial |
| **M4** | genre-topdown2d | hello-topdown + topdown recipes | G02 |
| **M5** | vn + shmup | two hellos + recipes ≥15 total | G03–G04, A05 |
| **M6** | Agent-ready | AGENTS.md, CI all examples, error codes stable | A06, NFR-03 |
| **M7** | fps2 | hello-fps2 greybox | G05 |
| **M8** | net spike | design + optional 2p prototype | G06 |
| **M9** | First title | e.g. Gravewake on Anvil only | product |

## 2. M0 checklist (planning)

- [x] Papers downloaded to `docs/research/papers/`  
- [x] Design suite `00`–`19` + master `README.md`  
- [x] Gap register `16` (honest incomplete items listed)  
- [x] Diagram index  
- [x] Monorepo/stack `17`, testing/CI `18`, ADRs `19`  
- [x] Deprecated duplicate docs redirected  
- [x] Gravewake parked  
- [x] Planning accepted **to start M1** (not “zero gaps forever”)

## 3. Definition of done per milestone

Must update `14_ACCEPTANCE_AND_TRACEABILITY.md` checkboxes when completing a milestone.

## 4. Risk register

| Risk | Mitigation |
|------|------------|
| Building engine forever | Hard exit criteria; M3 demo early |
| Phaser leaks into games | Lint boundary + code review |
| Scope creep MMO | G06 spike only |
| Ignoring research eval | Every milestone has test/observe |

## 5. What not to schedule before M6

- Gravewake dungeon content  
- Multiplayer production  
- Art pipelines in engine  
