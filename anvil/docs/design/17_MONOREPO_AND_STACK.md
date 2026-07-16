# 17 — Monorepo layout and stack

This is the implemented repository layout, not the original M1 target tree.

## Toolchain

| Item | Current choice |
|------|----------------|
| Language | TypeScript 5.7, strict configs |
| Package manager | pnpm 9.15.9 workspaces |
| Node requirement | 22 or newer |
| Bundler/dev server | Vite 6 |
| Unit/integration runner | Vitest 2 plus Node/tsx scripts where appropriate |
| Schema | Zod 3 |
| Render backend | Phaser 3 only inside `@anvil/render-phaser`; core also has null/canvas facades |
| Desktop | Electron shell package |
| Multiplayer | Legacy transport spike plus Colyseus adapter |
| Lint | ESLint + typescript-eslint |
| CI | GitHub Actions, Node 22/pnpm 9 |
| License | MIT |

## Current high-level tree

```text
x-game/
  AGENTS.md
  README.md
  .github/workflows/ci.yml
  anvil/
    package.json
    pnpm-workspace.yaml
    tsconfig.base.json
    ENGINE.md
    CHANGELOG.md
    assets/
    docs/
    examples/
      hello-empty/ hello-card/ hello-topdown/ hello-vn/
      hello-shmup/ hello-fps2/ hello-net/
    templates/
      card-starter/ topdown-starter/ vn-starter/
      shmup-starter/ fps2-starter/
    packages/
      schema/ core/ authoring/ cli/ recipes/
      render-phaser/ desktop/
      genre-card/ genre-topdown2d/ genre-vn/
      genre-shmup/ genre-fps2/ genre-net/ genre-arpg/
      net-colyseus/
  games/
    gravewake/
      game.yaml game.spec.yaml content/ src/ browser/ tests/ docs/
```

Generated `dist/`, `dist-web/`, and dependency directories are build artifacts,
not source documentation.

## Dependency rules

```text
core → schema
authoring → schema
genre-card/topdown/vn/shmup/fps2/net → core (+ schema where needed)
genre-arpg → core + schema + genre-topdown2d
render-phaser → core
cli → core + schema + recipes (+ authoring after pending M10 wiring)
examples/games → public core + selected genre packages
schema-v2 host boundary → authoring compiler
```

No package except `render-phaser` may import Phaser. Games may not import
kernel internals. `defineArpgGame` deliberately narrows the title surface.

## Workspace scripts

The actual root scripts are in [`../../package.json`](../../package.json).
Important boundaries:

- `pnpm -r run build` builds every package that defines a build script.
- `pnpm test` uses an explicit package filter and currently omits authoring and
  genre-arpg even though it includes the CLI tests.
- `pnpm validate:examples` and `pnpm test:examples` cover all seven hello
  projects.
- `pnpm check` adds lint, examples, Gravewake validate/test/lint, and the
  Gravewake production web build.

The current gate status and CI differences are documented in
[`18_TESTING_AND_CI.md`](./18_TESTING_AND_CI.md).

## Game descriptors

Every game/example/template keeps `game.yaml` at its package root. Schema-v2
projects also point to an intent file. Existing examples/templates are still
v1; Gravewake is v2. See [`06_DATA_MODEL.md`](./06_DATA_MODEL.md).
