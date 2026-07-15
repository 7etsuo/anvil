# Gravewake

Endless Diablo-like ARPG on **Anvil** — open **Ashen Wastes**, dungeon delves, timed packs, scaling threat.

## Play

```bash
cd anvil && pnpm install && pnpm -r run build
cd ../games/gravewake
pnpm install && pnpm run build
pnpm run play   # http://127.0.0.1:5180/
```

### World

| Zone | Role |
|------|------|
| **Ashen Lychgate** | Safe hub |
| **Ashen Wastes** | Large overworld (3200×2400), continuous packs, 4 portals |
| **Bellcrypt** | Mid dungeon + Bellwarden |
| **Howling Catacombs** | Harder dungeon + Death Knight |
| **Bonekeep** | Endgame dungeon + Bone Tyrant |

Boss kills are **milestones**, not the end of the game. Packs keep spawning; threat scales with level, kills, and zone.

### Controls

| Key | Action |
|-----|--------|
| **WASD** | Move |
| **Space / LMB** | Slash |
| **2** | Whirl |
| **3** | Smite |
| **1** | Potion |
| **F** | Loot |
| **I** | Inventory |
| Walk into **portals** / map edges | Travel |

### Systems (Anvil)

CharacterSheet, loot tables, equip, multi-skill combat, quests, particles, **PackSpawner** (timed respawns), scaled `spawnActorPublic`.

### Tests

```bash
pnpm test
pnpm validate
```
