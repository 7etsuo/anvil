# Anvil documentation — master map

This directory contains Anvil's normative design contracts and their current
implementation status. It is written for coding agents: planned APIs are
marked as planned, and commands are not considered available until they exist
in `pnpm anvil --help` and pass their tests.

## Required reading order

| Order | File | Why |
|-------|------|-----|
| 0 | [`../../../AGENTS.md`](../../../AGENTS.md) | Repository boundaries and engine-first rule |
| 1 | This README | Documentation hierarchy and status |
| 2 | [`20_FULL_TASK_BREAKDOWN.md`](./20_FULL_TASK_BREAKDOWN.md) | Completed and pending work |
| 3 | [`specs/README.md`](./specs/README.md) | Contract for the component being changed |
| 4 | [`ENGINE.md`](../../ENGINE.md) | Current consumer-facing usage |

## Authority and status

Specs under `docs/design/` are the source of truth for intended engine
behavior. The task breakdown and each spec's implementation-status section say
whether that behavior is shipped in this checkout. For current command
availability, `pnpm anvil --help` is authoritative.

| Layer | Status |
|-------|--------|
| M1–M9 engine, genres, tools, networking, and first title | Complete |
| RPG systems and engine extras | Implemented |
| M10 schema-v2 authoring libraries | Implemented |
| M10 CLI/scaffold/example integration | Pending |
| M11 `genre-arpg` library and Gravewake integration | Implemented |
| M11 generic CLI loader/scaffold and full green gate | Pending |

The repository is therefore usable now, but it has two authoring paths:

- Schema v1: existing examples, templates, CLI scaffolding, core validation,
  and the established genre runtimes.
- Schema v2: `@anvil/authoring` compilation plus explicit consumer wiring, as
  demonstrated by Gravewake. It is not yet a fully automatic CLI path.

## Documentation hierarchy

```text
L0  /AGENTS.md                         repository boundaries
L1  anvil/ENGINE.md                    current game-author usage
L1  design/README.md                   engine contributor map
L2  design/20_*.md + design/specs/*    task status and contracts
L3  design/01–19 + policies            rationale and supporting detail
L4  packages/* + games/*               implementation and executable examples
```

When prose conflicts, prefer the lower-numbered authority in this list only
after applying implementation status: a planned contract does not make an
unimplemented CLI command callable.

## Component specifications

| Area | Specs |
|------|-------|
| Kernel, renderer, schema, test, CLI | [`S-CORE`](./specs/S-CORE.md), [`S-RENDER`](./specs/S-RENDER.md), [`S-SCHEMA`](./specs/S-SCHEMA.md), [`S-TEST`](./specs/S-TEST.md), [`S-CLI`](./specs/S-CLI.md) |
| Assets, save, errors, recipes | [`S-ASSETS`](./specs/S-ASSETS.md), [`S-SAVE`](./specs/S-SAVE.md), [`S-ERRORS`](./specs/S-ERRORS.md), [`S-RECIPES`](./specs/S-RECIPES.md) |
| Genres | [`S-CARD`](./specs/S-CARD.md), [`S-TOPDOWN`](./specs/S-TOPDOWN.md), [`S-VN`](./specs/S-VN.md), [`S-SHMUP`](./specs/S-SHMUP.md), [`S-FPS2`](./specs/S-FPS2.md), [`S-ARPG`](./specs/S-ARPG.md) |
| Higher-level systems | [`S-RPG`](./specs/S-RPG.md), [`S-ENGINE-EXTRAS`](./specs/S-ENGINE_EXTRAS.md), [`S-AGENT`](./specs/S-AGENT.md) |
| Networking | [`S-NET`](./specs/S-NET.md), [`S-NET-COLYSEUS`](./specs/S-NET-COLYSEUS.md) |
| Authoring v2 | [`S-AUTHORING`](./specs/S-AUTHORING.md) |

## Safe workflow for an agent

1. Read the repository and design agent instructions.
2. Find the relevant task in `20_FULL_TASK_BREAKDOWN.md`.
3. Read the linked component contract and its status callout.
4. Inspect the public exports and an executable example before coding.
5. Keep reusable capability in `anvil/packages/*`; keep title content under
   `games/<title>/`.
6. Run the targeted package tests, then the documented repository gates.
7. Update task status and every affected user-facing document in the same
   change.

Research under [`../research/`](../research/) records historical evidence and
design rationale. It is not an API reference.
