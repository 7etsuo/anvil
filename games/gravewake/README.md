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

| Input | Action |
|-------|--------|
| **LMB** | Click-to-move / click enemy to chase+attack (Diablo) |
| **RMB** or **Space** | Slash |
| **WASD** | Keyboard move (cancels path) |
| **2** | Whirl |
| **3** | Smite |
| **1** | Potion |
| **F** | Loot / shrine |
| **I** | Inventory |
| **C** | Character stats (base + gear + total) |
| Portals / map edges | Travel |

**Random maps:** overworld and dungeons are **procedurally generated** each visit (engine `generateOverworld` / `generateDungeon`). Hub (Lychgate) stays fixed. **Stats:** character has base stats; weapons/armor add gear mods — see **C**.

Engine: A* pathfinding (`NavGrid`), click pathing, AI path around walls.

### Art

Unique **Grok Imagine** sprites for all 18 combatants (thralls, hounds, ghouls, archers, brutes, death knight, bone tyrant, …), new floor/wall tiles, portal prop, loot pile. No more palette-swap scorpion spam.

**Ash Shrine** in Lychgate: **F** buys a potion for 25g.

### Systems (Anvil)

CharacterSheet, loot tables, equip, multi-skill combat, quests, particles, **PackSpawner** (timed respawns), scaled `spawnActorPublic`.

### Tests

```bash
pnpm test
pnpm validate
```
