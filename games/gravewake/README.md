# Gravewake

**Playable** top-down Diablo-like ARPG on **Anvil** (browser + keyboard).

Uses the full engine stack: `CharacterSheet`, loot tables, equip, multi-skill combat,
quests, particles, randomized multi-type packs, zone graph.

**Ashen Lychgate** → **Cinder Parish** → **Bellcrypt** → **Bellwarden**.

## Play (browser)

```bash
# from repo
cd anvil && pnpm install && pnpm -r run build

cd ../games/gravewake
pnpm install
pnpm run build      # headless module for tests
pnpm run play       # Vite — http://127.0.0.1:5180/
```

### Controls

| Key | Action |
|-----|--------|
| **WASD** | Move |
| **Space** / **LMB** | Slash (cleave melee) |
| **2** | Whirl (wide AoE) |
| **3** | Smite (single-target, longer range) |
| **1** | Health potion |
| **F** | Pick up nearest loot |
| **I** | Inventory |
| Walk to map edges | Change zone (east exit locked until parish clear) |

### What ships in this slice

- **Random packs** in Parish / Crypt (Fallen, Scuttler, Shade, Wretch, Raider, Crypt Guard)
- **Loot drops** (gold auto-pickup, gear + potions via **F**)
- **Auto-equip** better weapons / armor
- **Quest** Parish Purge (enter → slay 8 → crypt → Bellwarden)
- **Diablo HUD** — life/potion orbs, skill bar, XP, gear strip, inventory panel

### Goal

Leave town east → clear Cinder Parish → enter Bellcrypt → defeat the **Bellwarden**.

## Headless / agents

```bash
pnpm test       # JSON scenario tests
pnpm validate   # content tree (Zod)
```
