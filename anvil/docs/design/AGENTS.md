# AGENTS.md — Anvil engine contributor

## Scope and status

Anvil is a multi-genre, agent-native game engine. Design specs in this
directory are normative; implementation status lives in
[`20_FULL_TASK_BREAKDOWN.md`](./20_FULL_TASK_BREAKDOWN.md).

M1–M9 are complete. M10/M11 libraries and Gravewake integration are present,
but generic CLI/scaffold integration remains unfinished. Never document a
planned command as usable until it appears in `pnpm anvil --help`.

## Boot order

1. [`../../../AGENTS.md`](../../../AGENTS.md)
2. [`README.md`](./README.md)
3. [`20_FULL_TASK_BREAKDOWN.md`](./20_FULL_TASK_BREAKDOWN.md)
4. The task's [`specs/S-*.md`](./specs/README.md)
5. [`../../ENGINE.md`](../../ENGINE.md) for the consumer-facing contract

## Commands that exist

Run from `anvil/`:

```bash
pnpm install
pnpm -r run build
pnpm test
pnpm --filter @anvil/authoring --filter @anvil/genre-arpg test
pnpm lint
pnpm validate:examples
pnpm test:examples

pnpm anvil version
pnpm anvil new my-game --genre none
pnpm anvil new my-card-game --genre card
pnpm anvil validate examples/hello-empty
pnpm anvil test examples/hello-card
pnpm anvil observe --root examples/hello-empty --json
pnpm anvil observe --root examples/hello-empty --shot
pnpm anvil assets missing examples/hello-empty
pnpm anvil audio list --kind sfx --limit 20
pnpm anvil sprites list --limit 20
pnpm anvil content list examples/hello-empty
pnpm anvil recipe list
pnpm anvil recipe show card.basic-attack
pnpm anvil build examples/hello-empty
pnpm anvil tools --json
pnpm anvil doctor examples/hello-empty --json
pnpm anvil net health --url http://127.0.0.1:2567
```

`anvil new` currently accepts `none`, `card`, `topdown2d`, `vn`, `shmup`, and
`fps2`. It emits schema v1. The following designed M10/M11 commands are not yet
implemented: `migrate`, `describe`, `capabilities`, and `new --genre arpg`.

`pnpm check` is the intended full gate, but the current checkout fails three
CLI integration tests for that unfinished work. Do not conceal or normalize
the failure. See [`18_TESTING_AND_CI.md`](./18_TESTING_AND_CI.md).

## Examples

| Example | Runtime |
|---------|---------|
| `examples/hello-empty` | core / none |
| `examples/hello-card` | card |
| `examples/hello-topdown` | topdown2d |
| `examples/hello-vn` | visual novel |
| `examples/hello-shmup` | scrolling shooter |
| `examples/hello-fps2` | raycast FPS |
| `examples/hello-net` | legacy transport spike |
| `../games/gravewake` | schema-v2 authoring + declarative ARPG |

## Boundaries

- No Phaser imports outside `packages/render-phaser`.
- No image-generation APIs in Anvil.
- No title lore, named skills, balance tables, maps, or art in engine packages.
- Promote reusable mechanics required by a game into an existing Anvil
  package when possible.
- Use public Anvil APIs from games. Gravewake may compile authoring data in its
  Node/Vite boundary; it may not own engine scheduling or renderer access.

See [`STYLE.md`](./STYLE.md), [`SECURITY.md`](./SECURITY.md), and
[`CONTRIBUTING.md`](./CONTRIBUTING.md).
