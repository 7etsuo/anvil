# 17 — Monorepo Layout and Tech Stack (locked for M1)

## 1. Stack lock

| Item | Choice | Notes |
|------|--------|-------|
| Language | TypeScript **5.x** | strict mode |
| Package manager | **pnpm** workspaces | lockfile committed |
| Node | **20 LTS** or **22 LTS** | engines field in root package.json |
| Bundler / dev | **Vite 6.x** | game examples + playground |
| Test runner | **Vitest** | unit + integration |
| Schema | **Zod 3.x** | `@anvil/schema` |
| Render backend | **Phaser 3.80.x** | **only** `@anvil/render-phaser` (never core) |
| Lint | ESLint + typescript-eslint | ban `phaser` import outside render package |
| CI | GitHub Actions | see `18` |
| License | **MIT** | T-M1-019 |
| Node (single) | **22 LTS** | engines field exact major |

## 2. Target monorepo tree (create in M1)

```text
anvil/
  package.json                 # private workspace root
  pnpm-workspace.yaml
  tsconfig.base.json
  .npmrc
  .gitignore
  LICENSE                      # M1
  README.md
  docs/                        # already exists
  packages/
    core/
      package.json             # @anvil/core
      src/
        index.ts               # public API barrel
        kernel/
        world/
        scene/
        assets/
        input/
        events/
        observe/
        test/
        render/                # facade types only OR
    render-phaser/
      package.json             # @anvil/render-phaser
      src/
        PhaserRenderFacade.ts
    schema/
      package.json             # @anvil/schema
      src/
        gameDescriptor.ts
        content/
        errors.ts
    cli/
      package.json             # @anvil/cli
      src/
        index.ts               # bin: anvil
        commands/
    recipes/
      package.json             # @anvil/recipes
      src/
        index.ts
      recipes/                 # yaml recipes filled M3+
    genre-card/
      package.json
      src/
    genre-topdown2d/
      package.json
      src/
    genre-vn/
      package.json
      src/
    genre-shmup/
      package.json
      src/
    genre-fps2/                # M7
      package.json
      src/
  templates/                   # populated M3+
    card-starter/
    topdown-starter/
    vn-starter/
    shmup-starter/
  examples/
    hello-empty/               # M1 smoke
    hello-card/                # M3
    hello-topdown/             # M4
    hello-vn/                  # M5
    hello-shmup/               # M5
    hello-fps2/                # M7
  .github/
    workflows/
      ci.yml                   # M1/M6
```

## 3. Package dependency rules

```text
cli → core, schema, recipes
examples → core, genre-*, render-phaser
genre-* → core, schema
core → schema
render-phaser → core (implements facade)
recipes → (data only; no runtime deps on phaser)
```

**Forbidden:** `examples/*` or `genre-*` import `phaser` directly.

## 4. Public API surface of `@anvil/core` (M1 minimum)

Must export (names locked unless ADR):

```ts
createGame(opts: CreateGameOptions): Promise<GameHandle>
validateProject(root: string): Promise<ValidationResult>
runTests(root: string, opts?: TestOpts): Promise<TestReport>
observe(handle: GameHandle, opts?: ObserveOpts): Promise<ObserveSnapshot>
```

Full method list expands in M1 with JSDoc; if renamed, write ADR.

## 5. `game.yaml` location

Always at package root of a game (template/example).

## 6. Workspace scripts (root)

```json
{
  "scripts": {
    "build": "pnpm -r run build",
    "test": "pnpm -r run test",
    "validate:examples": "anvil validate examples/hello-empty",
    "lint": "eslint ."
  }
}
```
