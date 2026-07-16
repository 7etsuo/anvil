# 13 — Roadmap and milestones

Anvil follows an engine-first loop: a title requirement becomes a reusable
engine capability when it applies beyond that title. The authoritative task
status is [`20_FULL_TASK_BREAKDOWN.md`](./20_FULL_TASK_BREAKDOWN.md).

## Milestone status

| ID | Outcome | Current status |
|----|---------|----------------|
| M0 | Design and agent documentation baseline | Complete |
| M1 | Kernel, schema v1, CLI ACI, empty scaffold | Complete |
| M2 | Assets, media, save/load, screenshots | Complete |
| M3 | Card genre, recipes, starter | Complete |
| M4 | Top-down 2D genre, navigation/combat foundation | Complete |
| M5 | Visual-novel and scrolling-shooter genres | Complete |
| M6 | Agent-ready errors, docs, CI, static build | Complete |
| M7 | Raycast FPS genre | Complete |
| M8 | Transport-neutral multiplayer spike | Complete |
| M9 | Gravewake built only on Anvil APIs | Complete and subsequently expanded |
| M10 | Schema-v2 intent, compiler, migration, capabilities, Vite bridge | Libraries complete; CLI/scaffold/example integration pending |
| M11 | Declarative ARPG runtime and Gravewake IR integration | Library/title complete; generic loader/scaffold and full gate pending |

## Current delivery boundary

M1–M9 are the stable runtime baseline. M10/M11 have useful implemented APIs,
but are not release-complete until the generic CLI can create, migrate,
describe, validate, test, and launch the new project form without title-local
wiring.

The immediate roadmap is therefore integration rather than another genre:

1. implement M10 CLI commands and schema-v2 default scaffolding;
2. migrate examples/templates and route generic verification through the
   authoring compiler;
3. load `genre-arpg` generically and add an ARPG starter;
4. include authoring/ARPG coverage in the normal test and CI gates; and
5. make the complete engine plus Gravewake gate green.

## Definition of done

A milestone is complete only when:

- every required task is checked in `20`;
- its targeted unit and integration tests pass;
- affected examples or titles validate, test, and build;
- public API, CLI, and agent workflow docs match implementation; and
- acceptance traceability is updated.

Code existing in a package is not sufficient when the milestone also promises
generic CLI or scaffold behavior.

## Current risks

| Risk | Mitigation |
|------|------------|
| Agents invoke designed but absent commands | Status callouts plus `pnpm anvil --help` as command authority |
| Schema v1 and v2 boundaries are confused | Document compiler/core distinction and keep migration explicit |
| Title glue becomes an engine fork | Promote reusable capability to Anvil; restrict title hook ownership |
| Phaser leaks into games | ESLint boundary and renderer facade |
| New packages evade routine tests | Add them to root scripts and CI in M10/M11 pending tasks |
| Game-only changes receive no CI | Expand workflow path filters before relying on CI for title safety |

The original pre-M6 scheduling restrictions are historical and no longer
apply; the repository has already passed those milestones.
