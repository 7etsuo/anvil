# Anvil engine

<p align="center">
  <img src="./assets/brand/github-banner.png" alt="Anvil — agent-native multi-genre game engine" width="100%" />
</p>

Anvil is an **agent-native, multi-genre TypeScript game engine**. The engine
lives here; playable titles live under [`../games/`](../games/).

## Documentation routes

| Goal | Read |
|------|------|
| Build or maintain a game | [`ENGINE.md`](./ENGINE.md) |
| Change engine code | [`docs/design/README.md`](./docs/design/README.md) |
| Follow repository agent rules | [`docs/design/AGENTS.md`](./docs/design/AGENTS.md) |
| Use schema-v2 authoring | [`docs/design/specs/S-AUTHORING.md`](./docs/design/specs/S-AUTHORING.md) |
| Build a declarative ARPG | [`docs/design/specs/S-ARPG.md`](./docs/design/specs/S-ARPG.md) |
| Use RPG systems | [`docs/design/specs/S-RPG.md`](./docs/design/specs/S-RPG.md) |
| Inspect engine extensions | [`docs/design/specs/S-ENGINE_EXTRAS.md`](./docs/design/specs/S-ENGINE_EXTRAS.md) |

## Current status

- M1–M9 runtime, genres, tooling, networking, and the first title are complete.
- M10 authoring libraries exist: schema v2, intent, compiler, migration API,
  capability descriptors, and the Vite IR bridge.
- M11 ARPG libraries and Gravewake integration exist.
- M10/M11 CLI wiring is incomplete. `anvil migrate`, `anvil describe`,
  `anvil capabilities`, and `anvil new --genre arpg` are **not available**.
- Existing CLI scaffolds and examples still use schema v1. Core runtime
  validation accepts v1 and v2; `compileProject` accepts v2 only.
- The full `pnpm check` gate currently fails three CLI integration tests that
  cover those unfinished commands/scaffolds. The standalone authoring and ARPG
  tests pass.

See [`docs/design/16_PLANNING_STATUS_AND_GAPS.md`](./docs/design/16_PLANNING_STATUS_AND_GAPS.md)
for the exact remaining work.

## Development commands

Requires Node.js 22+ and pnpm 9.15.9.

```bash
pnpm install
pnpm -r run build
pnpm test
pnpm --filter @anvil/authoring --filter @anvil/genre-arpg test
pnpm lint
pnpm validate:examples
pnpm test:examples
pnpm dev:hello
```

Use `pnpm anvil --help` as the authoritative list of commands in the current
build. Deprecated docs under `docs/PLAN.md`, `docs/ARCHITECTURE.md`, and
`docs/AGENT_UX.md` are redirect stubs only.
