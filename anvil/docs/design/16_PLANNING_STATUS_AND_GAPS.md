# 16 — Current implementation status and gap register

**Audited:** 2026-07-15

This document supersedes the original pre-code planning audit. It records
observed repository behavior, not aspirational status.

## Verdict

| Area | Current state |
|------|---------------|
| M1–M9 engine/runtime surface | Implemented |
| Gravewake | Active playable campaign, not parked or a one-room greybox |
| M10 authoring libraries | Implemented and package tests pass |
| M11 ARPG library/title integration | Implemented and package/title tests pass |
| Generic M10/M11 CLI workflow | Incomplete |
| Complete repository gate | Not green |
| Relative Markdown link targets | Resolve in the audited checkout |

## Confirmed working M10/M11 surfaces

- Schema v2 manifest, intent, traits, prefabs, triggers, effects, and machines.
- Deterministic `compileProject` with canonical SHA-256 source hash and deeply
  frozen IR.
- Transactional/idempotent `migrateProject` library API.
- `capabilityCatalog` and `capabilitiesForGame` library APIs.
- Vite `virtual:anvil-game-ir` bridge.
- ARPG content materialization, rule runtime, and restricted title hook.
- Gravewake Node/browser consumption of the same compiled content model.

Targeted verification:

```bash
pnpm --filter @anvil/authoring --filter @anvil/genre-arpg test
```

This currently passes 13 tests across those packages.

## Blocking integration gaps

| ID | Gap | Evidence | Required correction |
|----|-----|----------|---------------------|
| G-M10-CLI-1 | `anvil new` emits schema v1 | CLI source/template output and failing integration test | Emit v2 manifest plus intent, then migrate templates/examples |
| G-M10-CLI-2 | `migrate`, `describe`, and `capabilities` are unknown commands | `pnpm anvil --help`; failing CLI integration test | Add command routing, JSON/text output, and tests |
| G-M10-VERIFY | Generic `validate` does not call `compileProject` | core validator implementation | Define and implement v2 validation/test/dev integration |
| G-M11-NEW | `new --genre arpg` is rejected | CLI genre list and failing integration test | Add a schema-v2 ARPG starter |
| G-M11-LOAD | CLI loader has no `genre-arpg` branch | `packages/cli/src/loadModules.ts` | Import/register `arpgModule` or the agreed generic module |
| G-TEST-SCRIPT | Root `pnpm test` omits authoring and genre-arpg package filters | `anvil/package.json` | Add both packages to the routine suite |
| G-CI-PATHS | CI triggers only for `anvil/**` and workflow changes | `.github/workflows/ci.yml` | Include active game paths or add a game workflow |
| G-CI-TITLE | CI does not run Gravewake lint/web production build | workflow versus `pnpm check` | Align CI with the active repository gate |

## Current failing gate

`pnpm check` reaches the CLI package tests and fails three integration tests:

1. the scaffold contains `schemaVersion: 1` instead of 2 and cannot be
   described through the absent command;
2. `migrate` is unknown; and
3. `new --genre arpg` rejects `arpg`.

These are product integration failures, not documentation-only noise. Do not
mark M10/M11 complete or instruct agents to suppress the tests.

## Non-blocking implementation limitations

- The Vite bridge watches the default `game.spec.yaml` path rather than a
  custom manifest `intent` filename.
- Some compiler diagnostics still suggest the future `anvil migrate` command;
  callers must use `migrateProject` until CLI wiring lands.
- Core observe snapshots use observation `schemaVersion: 1`; that is a separate
  protocol version and does not mirror the project manifest version.
- Workspace package versions (`0.1.0`), runtime `ANVIL_VERSION` (`0.7.0`), and
  authoring capability versions (`0.9.0`) are separate and need a release
  reconciliation before publishing.

## Closure rule

A gap closes only when implementation, targeted tests, generic workflow, and
the complete gate agree. Update this document, the relevant spec, `20`, and the
changelog in the same change.
