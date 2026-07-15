# 14 — Acceptance and Traceability

## 1. REQ → task → milestone

| REQ | Verification | Milestone | Task IDs |
|-----|--------------|-----------|----------|
| P01 | `anvil new` package tree | M1 | T-M1-013,014 |
| P02 | launch gate on template | M1 | T-M1-011,014 |
| P03 | text-only content/scenes | M1 | policy + review |
| P04 | SCHEMA_INVALID on bad JSON | M1 | T-M1-010 |
| P05 | `anvil dev` serves | M1 | T-M1-015 |
| P06 | fail assert → exit 1 | M1 | T-M1-011 |
| P07 | observe JSON shape | M1 | T-M1-012 |
| P08 | observe --shot PNG | M2 | T-M2-008d |
| P09 | assets missing lists path | M2 | T-M2-004 |
| P10 | recipe list/show | M3 | T-M3-011 |
| K01–K07 | unit + hello | M1 | T-M1-003–008,005b,005c |
| K08 | greybox | M2 | T-M2-003 |
| K09 | audio | M2 | T-M2-005 |
| K10 | cinematic | M2 | T-M2-006 |
| K11 | save/load | M2 | T-M2-008b |
| K12 | no Phaser in examples | M1 | T-M1-017 |
| S01–S03 | asset resolve/greybox | M2 | T-M1-006,T-M2-001–003 |
| S04 | manifest path list | M2 | T-M2-008c |
| G01 | hello-card | M3 | T-M3-* |
| G02 | hello-topdown | M4 | T-M4-* |
| G03–G04 | vn+shmup | M5 | T-M5-* |
| G05 | fps2 | M7 | T-M7-* |
| G06 | net spike | M8 | T-M8-* |
| A01–A03 | ACI constraints | M1 | T-M1-013,016,017 |
| A04 | templates | M3–M7 | template tasks |
| A05 | ≥15 recipes | M5 | T-M5-012 |
| A06 | AGENTS live | M6 | T-M6-001 |
| NFR-01–06 | monorepo/CI | M1/M6 | T-M1-001,018; T-M6-002 |
| OOS-01–07 | not implemented | always | review |

## 2. GameCraft desiderata

| Desideratum | Pass |
|-------------|------|
| Engine grounding | Anvil kernel demos |
| Artifact completeness | `anvil new` runnable |
| Interactive verification | ≥1 interaction test per hello |

## 3. Milestone sign-off

```text
Milestone: M_
- [ ] Tasks for milestone [x] in 20
- [ ] REQs in matrix green
- [ ] Examples validate + test
- [ ] Specs unchanged or updated with API
```
