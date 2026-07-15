# AGENTS.md — Anvil implementer (six areas)

## 1. Overview

Anvil is a multi-genre agent-native game engine. Specs in `docs/design/` are source of truth. Code implements `20_FULL_TASK_BREAKDOWN.md`.

## 2. Commands (after M1)

```bash
cd anvil && pnpm install && pnpm test
pnpm exec anvil validate examples/hello-empty
pnpm exec anvil test examples/hello-empty
pnpm exec anvil observe --json
```

Full CLI: `specs/S-CLI.md`.

## 3. Code style

See `STYLE.md`. No Phaser outside `packages/render-phaser`.

## 4. Testing

See `18_TESTING_AND_CI.md` + `specs/S-TEST.md`. Always validate then test. Use observe on failure.

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
No Gravewake.