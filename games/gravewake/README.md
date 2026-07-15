# Gravewake

**Playable** top-down Diablo-like ARPG on **Anvil** (browser + keyboard).

**Ashen Lychgate** → **Cinder Parish** → **Bellcrypt** → **Bellwarden**.

## Play (browser)

```bash
# from repo
cd anvil && pnpm install && pnpm -r run build

cd ../games/gravewake
pnpm install
pnpm run build      # headless module for tests
pnpm run play       # opens Vite — open the URL it prints (default http://127.0.0.1:5180/)
```

Or:

```bash
cd anvil
pnpm anvil dev ../games/gravewake
# (uses vite.config.ts in the game folder)
```

### Controls

| Key | Action |
|-----|--------|
| **WASD** | Move |
| **Space** or **mouse click** | Rite Slash (melee) |
| **1** | Health potion |
| Walk into **green** portals | Change area |
| **Red** portal | Locked until Parish is clear |

### Goal

Leave town east → clear Cinder Parish → enter Bellcrypt → defeat the **Bellwarden**.

## Headless tests (CI / agents)

```bash
pnpm test
# or: node ../../anvil/packages/cli/dist/index.js test .
```

## Assets

Character/enemy art generated with **Grok Imagine**, under `public/assets/` (and `assets/`).

## Design docs

Full GDD bible: [docs/INDEX.md](docs/INDEX.md).  
This package is the **playable vertical slice**, not every planned room/system yet.
