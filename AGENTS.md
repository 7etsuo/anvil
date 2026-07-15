# AGENTS.md — x-game monorepo

Thin dispatcher for coding agents ([agents.md](https://agents.md/) format).

## Layout (do not mix)

| Path | Status | Work allowed |
|------|--------|--------------|
| `anvil/` | **Active** — game engine/framework | Yes |
| `games/gravewake/` | **Parked** — future ARPG | **No** until Anvil M6+ |
| `games/*` | Future titles | Only when unparked |

Framework and games stay separate. Never put game content inside `anvil/`.

## Anvil work — always read first

1. `anvil/docs/design/README.md`  
2. `anvil/docs/design/20_FULL_TASK_BREAKDOWN.md`  
3. `anvil/docs/design/AGENTS.md`  
4. Task’s `anvil/docs/design/specs/S-*.md`

## Commands (after Anvil M1)

```bash
cd anvil
pnpm install
pnpm test
pnpm exec anvil validate examples/hello-empty
pnpm exec anvil test examples/hello-empty
```

## Hard rules

- Specs under `anvil/docs/design/` are source of truth for the **engine**.  
- Do **not** implement `games/gravewake` yet.  
- Do not add image-generation APIs to Anvil.  
- Do not import Phaser outside `@anvil/render-phaser`.  
- One milestone at a time; mark tasks in `20`.  
