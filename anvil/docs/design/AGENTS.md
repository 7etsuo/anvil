# AGENTS.md — Anvil implementer (six areas)

## 1. Overview

Anvil is a multi-genre agent-native game engine. Specs in `docs/design/` are source of truth. Code implements `20_FULL_TASK_BREAKDOWN.md`.

**Status:** M1–M8 done. Next: M9 first game (unpark).

## 2. Commands (live)

From monorepo package root `anvil/`:

```bash
cd anvil
pnpm install
pnpm -r run build
pnpm test                 # unit/integration (all packages)
pnpm lint
pnpm validate:examples    # all hello-* examples
pnpm test:examples

# CLI (built bin)
pnpm anvil version
pnpm anvil new my-game --genre card|topdown2d|vn|shmup|fps2|none
pnpm anvil validate examples/hello-empty
pnpm anvil test examples/hello-card
pnpm anvil observe --root examples/hello-empty --json
pnpm anvil observe --root examples/hello-empty --shot
pnpm anvil assets missing examples/hello-empty
pnpm anvil recipe list
pnpm anvil recipe show card.basic-attack
pnpm anvil build examples/hello-empty --out examples/hello-empty/dist
pnpm anvil dev examples/hello-empty
```

Equivalent: `node packages/cli/dist/index.js <cmd> …`

### Examples (CI matrix)

| Example | Genre |
|---------|--------|
| `examples/hello-empty` | none |
| `examples/hello-card` | card |
| `examples/hello-topdown` | topdown2d |
| `examples/hello-vn` | vn |
| `examples/hello-shmup` | shmup |
| `examples/hello-fps2` | fps2 |
| `examples/hello-net` | none + genre-net (spike) |

### Allowed genres for `anvil new`

`none`, `card`, `topdown2d`, `vn`, `shmup`, `fps2`.

Full CLI: `specs/S-CLI.md`. Errors: `specs/S-ERRORS.md`.

## 3. Code style

See `STYLE.md`. No Phaser outside `packages/render-phaser`.

## 4. Testing

See `18_TESTING_AND_CI.md` + `specs/S-TEST.md`. Always `validate` then `test`. Use `observe` on failure.

## 5. Security

See `SECURITY.md`. No path escape, no eval of content, no image-gen APIs.

## 6. PR / commits

See `CONTRIBUTING.md`.

## Boot order

1. `README.md`  
2. `20_FULL_TASK_BREAKDOWN.md`  
3. Linked `specs/S-*.md`  
4. Implement one task; mark `[x]`  

Repo root AGENTS: `../../../AGENTS.md` (from `anvil/docs/design/`).  
No Gravewake until M9 unpark.
