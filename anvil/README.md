# Anvil

Agent-native multi-genre game engine / SDK.

## Documentation (canonical)

# → **[docs/design/README.md](./docs/design/README.md)** ← start here always

| Need | Doc |
|------|-----|
| Master map + is planning complete? | [docs/design/README.md](./docs/design/README.md) |
| Honest gaps | [docs/design/16_PLANNING_STATUS_AND_GAPS.md](./docs/design/16_PLANNING_STATUS_AND_GAPS.md) |
| AI session boot | [docs/design/AGENTS.md](./docs/design/AGENTS.md) |
| Diagram inventory | [docs/design/diagrams/DIAGRAM_INDEX.md](./docs/design/diagrams/DIAGRAM_INDEX.md) |
| Research PDFs | [docs/research/papers/](./docs/research/papers/) |

## Status

| Phase | State |
|-------|--------|
| Planning (full engine M1–M9) | **Complete** |
| **M1 code** | **Done** |
| **M2 code** | **Done** |
| **M3 code** | **Done** (genre-card, hello-card, recipes) |
| **M4 code** | **Done** (genre-topdown2d, hello-topdown, recipes) |
| **M5 code** | **Done** (genre-vn, genre-shmup, recipes ≥15) |
| **M6 code** | **Done** (AGENTS, CI matrix, errors, build, perf) |
| **M7 code** | **Done** (genre-fps2, hello-fps2, starter) |
| **M8 code** | **Done** (genre-net loopback spike) |
| Next | **M9** first real game (unpark) |

## Quick start (dev)

```bash
cd anvil
pnpm install
pnpm -r run build
pnpm test
pnpm lint
pnpm validate:examples
pnpm test:examples
pnpm dev:hello          # Vite browser — open localhost:5173
```

## Games (not in this tree)

Playable titles live under **`../games/`** (e.g. `games/gravewake/`), not inside `anvil/`.

## Deprecated paths

`docs/PLAN.md`, `docs/ARCHITECTURE.md`, `docs/AGENT_UX.md` → redirect stubs only.
