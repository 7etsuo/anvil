# Gravewake

Endless Diablo-like ARPG on **Anvil** — open **Ashen Wastes**, dungeon delves, timed packs, scaling threat.

## Play

```bash
cd anvil
pnpm install
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
| **WASD** | Screen-oriented isometric movement (cancels path) |
| **2** | Whirl |
| **3** | Smite |
| **1** | Potion |
| **F** | Loot / shrine |
| **I** | Character equipment + 32-slot backpack |
| **C** | Character stats (base + gear + total) |
| **LMB in inventory** | Equip bag gear / unequip worn gear |
| Portals / map edges | Travel |

**Random maps:** overworld and dungeons are **procedurally generated** each visit (engine `generateOverworld` / `generateDungeon`). Entrances, portals, and encounter space are reserved and connected before spawning. Hub (Lychgate) stays fixed. **Stats:** character has base stats; weapons/armor add gear mods — see **C**.

Engine: A* pathfinding (`NavGrid`), click pathing, safe procedural-instance
teleports, explicit no-path feedback, AI path around walls, navigation diagnostics,
and an agent-readable paper-doll/backpack view.

### Art

Unique **Grok Imagine** sprites for all 18 combatants (thralls, hounds, ghouls, archers, brutes, death knight, bone tyrant, …), new floor/wall tiles, portal prop, loot pile. No more palette-swap scorpion spam.

**Ash Shrine** in Lychgate: **F** buys a potion for 25g.

### Systems (Anvil)

CharacterSheet, capacity-aware bags, paper-doll equipment, loot tables,
multi-skill combat, quests, particles, **PackSpawner** (timed respawns), scaled
`spawnActorPublic`.

### Tests

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm validate
pnpm build:web
```

From `anvil/`, `pnpm check` runs the complete active engine + Gravewake gate.
