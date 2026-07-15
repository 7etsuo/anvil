# Anvil

**Agent-native multi-genre TypeScript game engine.**  
**Priority: engine quality.** Games sit under `../games/`.

**Start here for the engine surface:** **[ENGINE.md](./ENGINE.md)**

## Documentation

| Need | Doc |
|------|-----|
| **Engine API map** | [ENGINE.md](./ENGINE.md) |
| Full design set | [docs/design/README.md](./docs/design/README.md) |
| AI session boot | [docs/design/AGENTS.md](./docs/design/AGENTS.md) |
| RPG systems | [docs/design/specs/S-RPG.md](./docs/design/specs/S-RPG.md) |
| Engine extras | [docs/design/specs/S-ENGINE_EXTRAS.md](./docs/design/specs/S-ENGINE_EXTRAS.md) |

## Status

Engine milestones M1–M9 **code complete**, plus RPG systems + engine extras (UI, AI, path, quests, audio bus, Phaser, WS server, Electron shell). Ongoing work: harden core, not feature theater.

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
