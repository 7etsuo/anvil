# AGENTS.md — x-game monorepo

Thin dispatcher for coding agents ([agents.md](https://agents.md/) format).

## Layout (do not mix)

| Path | Status | Work allowed |
|------|--------|--------------|
| `anvil/` | **Active** — game engine (M1–M7 done) | Yes |
| `games/gravewake/` | **Parked** — future ARPG | **No** until Anvil M9 unpark |
| `games/*` | Future titles | Only when unparked |

Framework and games stay separate. Never put game content inside `anvil/`.

## Anvil work — always read first

1. `anvil/docs/design/README.md`  
2. `anvil/docs/design/20_FULL_TASK_BREAKDOWN.md`  
3. `anvil/docs/design/AGENTS.md`  
4. Task’s `anvil/docs/design/specs/S-*.md`

## Commands

```bash
cd anvil
pnpm install
pnpm -r run build
pnpm test
pnpm lint
pnpm validate:examples
pnpm test:examples

# CLI
pnpm anvil version
pnpm anvil validate examples/hello-empty
pnpm anvil test examples/hello-card
pnpm anvil observe --root examples/hello-empty --json
pnpm anvil recipe list
pnpm anvil build examples/hello-empty
pnpm anvil new demo --genre topdown2d
```

Supported genres: `none`, `card`, `topdown2d`, `vn`, `shmup`, `fps2`.

## Hard rules

- Specs under `anvil/docs/design/` are source of truth for the **engine**.  
- Do **not** implement `games/gravewake` yet.  
- Do not add image-generation APIs to Anvil.  
- Do not import Phaser outside `@anvil/render-phaser`.  
- One milestone at a time; mark tasks in `20`.  
