# AGENTS.md — x-game monorepo

Thin dispatcher for coding agents ([agents.md](https://agents.md/) format).

## Layout (do not mix)

| Path | Status | Work allowed |
|------|--------|--------------|
| `anvil/` | **Active** — game engine (M1–M8 done) | Yes |
| `games/gravewake/` | **Active M9** — Diablo-like ARPG on Anvil | Yes (Anvil APIs only) |
| `games/*` | Future titles | When unparked |

Framework and games stay separate. Never put game content inside `anvil/`.

## Game builds the engine (standing rule)

While shipping Gravewake (or any title), **treat missing capability as an engine gap**, not a one-off game hack:

1. **Need something the game must do** (combat API, loot, input edge, observe field, multiplayer hook, particles, etc.).
2. **If Anvil should own it for any genre/title** → implement it in `anvil/packages/*` (core / genre / net / schema), with a small test if practical.
3. **Gravewake only consumes** the new API — content, balance, presentation, and title-specific glue stay under `games/gravewake/`.
4. **Title-only** logic (lore, specific skill names, map art, balance tables) stays in the game. **Reusable mechanics** promote into Anvil.
5. Prefer extending existing modules (`@anvil/core`, `@anvil/genre-topdown2d`, …) over parallel reimplementation in the game.

Recent examples of the right loop: `CharacterSheet` / loot, `playerMeleeNearest`, InputMap short-tap latch, particles/quests on `SceneContext`, `autoWinOnClear: false` for multi-area games, `NavGrid` pathfinding, `equippedVisuals()` paper-doll layers, browser `setSkipDefaultDraw`, `ViewCamera`, `AbilitySystem`, combat events, `TileMap`, `SpatialHash`, `ActorAnimController`, `dropFromTable` / run-state save.

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
- Gravewake lives under `games/gravewake/`; use Anvil APIs only (no raw Phaser).  
- When a game needs a reusable system, **add it to Anvil** (see above) — do not forever special-case only in the title.  
- Do not add image-generation APIs to Anvil.  
- Do not import Phaser outside `@anvil/render-phaser`.  
- One milestone at a time; mark tasks in `20`.  
