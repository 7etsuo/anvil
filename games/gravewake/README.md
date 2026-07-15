# Gravewake

Top-down **Diablo-like ARPG** on **Anvil**.

**Ashen Lychgate** (town) → **Cinder Parish** (grind) → **Bellcrypt** (boss).

| | |
|--|--|
| Engine | **Anvil** (`@anvil/core` + topdown sim) |
| Status | **M9 unparked** — greybox vertical slice |
| Art | Greybox; Imagine packs later |

## Run / test (from repo)

```bash
# build Anvil + game module
cd anvil && pnpm -r run build
cd ../games/gravewake && pnpm install && pnpm run build
pnpm test          # anvil CLI headless scenarios
pnpm validate
```

Or from `anvil/`:

```bash
node packages/cli/dist/index.js validate ../games/gravewake
node packages/cli/dist/index.js test ../games/gravewake
```

## Docs

Full design: **[docs/INDEX.md](docs/INDEX.md)**.  
Slice notes: **[UNPARKED.md](./UNPARKED.md)**.

## Controls (slice)

| Input | Action |
|-------|--------|
| WASD | Move |
| Space / shoot | Rite Slash (melee) |
| Digit 1 | Potion |
| Walk into portal zones | Change area |

## License

TBD
