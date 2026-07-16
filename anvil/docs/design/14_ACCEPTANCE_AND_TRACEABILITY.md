# 14 — Acceptance and traceability

This matrix maps intended behavior to executable evidence and task status.
Completed historical milestones remain listed; M10/M11 rows show the current
integration gap.

## Runtime and genre baseline

| Requirement | Verification | Milestone/tasks | Status |
|-------------|--------------|-----------------|--------|
| P01–P03 | Scaffold tree, launch, data-driven scenes/content | M1 T-M1-013–015 | Pass for schema-v1 starters |
| P04 | Structured schema/content failure | M1 T-M1-010 | Pass |
| P05 | Development server starts | M1 T-M1-015 | Pass |
| P06 | Failed scenario returns nonzero | M1 T-M1-011 | Pass |
| P07 | Structured observation | M1 T-M1-012 | Pass |
| P08 | `observe --shot` PNG | M2 T-M2-008d | Pass |
| P09 | Missing-asset inventory | M2 T-M2-004 | Pass |
| P10 | Recipe discovery | M3 T-M3-011 | Pass |
| K01–K07, K12 | Kernel, scenes, input, modules, deterministic loop, renderer boundary | M1 | Pass |
| K08–K11 | Greybox, audio, cinematic, save/load | M2 | Pass |
| S01–S04 | Asset resolution and manifest behavior | M1–M2 | Pass |
| G01 | Card example/runtime | M3 | Pass |
| G02 | Top-down example/runtime | M4 | Pass |
| G03–G04 | VN and shmup examples/runtimes | M5 | Pass |
| G05 | FPS2 example/runtime | M7 | Pass |
| G06 | Legacy networking spike | M8 | Pass for spike scope |
| A01–A06 | Agent CLI, errors, examples, recipes, live instructions | M1–M7 | Pass for stable CLI surface |

## Schema-v2 authoring and ARPG

| Acceptance id | Evidence | Tasks | Current status |
|---------------|----------|-------|----------------|
| AU01 Manifest/intent parse | schema unit tests | T-M10-001 | Pass |
| AU02 Declarative source parse | schema + compiler tests | T-M10-002 | Pass |
| AU03 Deterministic immutable IR | compiler repeat/hash/freeze tests | T-M10-003 | Pass |
| AU04 Composition and reference errors | compiler merge/cycle/conflict tests | T-M10-004 | Pass |
| AU05 Migration preview/write/idempotence | migration tests | T-M10-005 | Pass as library API |
| AU06 Machine-readable capabilities | capability/compiler tests | T-M10-006 | Pass as library API |
| AU07 Browser IR parity | Vite bridge tests and Gravewake build | T-M10-007,T-M11-004 | Pass |
| AU08 Agent CLI projections | CLI integration tests | T-M10-008 | **Fail: commands absent** |
| AU09 Schema-v2 starter/default examples | CLI integration + example matrix | T-M10-009,010 | **Fail: scaffolds/examples remain v1** |
| AU10 Generic verification compiles intent/rules | CLI integration | T-M10-011 | **Pending** |
| AR01 Deterministic ARPG materialization | genre-arpg unit tests | T-M11-001 | Pass |
| AR02 Finite rule execution and observation | genre-arpg unit tests + Gravewake tests | T-M11-002,005 | Pass |
| AR03 Restricted title hook | genre-arpg tests + API review | T-M11-003 | Pass |
| AR04 Generic ARPG loading/scaffold | CLI integration tests | T-M11-006,007 | **Fail/pending** |
| GATE Complete repo verification | `pnpm check` | T-M10-013,T-M11-009 | **Fail: three CLI integration tests** |

## GameCraft-style criteria

| Desideratum | Evidence |
|-------------|----------|
| Engine grounding | Executable hello projects and Gravewake |
| Artifact completeness | Schema-v1 CLI starters; schema-v2 completeness demonstrated by Gravewake |
| Interactive verification | Scenario tests, semantic agent actions, observe/diff/replay |
| Intent traceability | Schema-v2 `game.spec.yaml` requirements and compiled source hash |

## Sign-off template

```text
Milestone: M__
- [ ] All required tasks are checked in 20
- [ ] Targeted package tests pass
- [ ] Affected examples/titles validate and test
- [ ] Browser or packaging build passes when applicable
- [ ] Full repository gate passes
- [ ] Specs, CLI help, agent docs, and changelog agree
```
