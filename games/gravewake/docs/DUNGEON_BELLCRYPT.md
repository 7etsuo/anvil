# Bellcrypt — Dungeon Design (Locked)

**Dungeon ID:** `bellcrypt_01`  
**Display name:** Bellcrypt  
**Entry from:** Cinder Parish `poi_crypt_mouth` (not directly from town)  
**Town hub:** Ashen Lychgate (via portal or death)  

Data file target: `content/dungeons/bellcrypt_01.json`

---

## 1. Topology

```text
 [Town] ←→ [Cinder Parish overworld] ←→ R0 Entrance
                                         |
                                        R1 Combat
                                         |
                                        R2 Combat -------- R3 Loot (side)
                                         |
                                        R4 Combat
                                         |
                                        R5 Elite (Crypt Guard + key)
                                         |
                                        R6 Rest
                                         |
                                        R7 Combat -------- R8 Combat (side)
                                         |
                                        R9 Combat
                                         |
                                        R10 Gate Corridor (boss door)
                                         |
                                        R11 Boss Arena — Bellwarden
```

**Critical path:** R0→R1→R2→R4→R5→R6→R7→R9→R10→R11  
**Optional:** R3 (from R2), R8 (from R7)  
**Boss entry:** R10 door requires `item_crypt_key` (from R5 elite, guaranteed once per run)

---

## 2. Room catalog

Collision: axis-aligned walls from JSON rects.  
Background: one plate per `env` id (see TILES_AND_ENV).  
Spawns: list of `{ type, x, y }`.  
Exits: doors to neighbor room ids + spawn facing.

### R0 — Entrance `room_entrance`
| Field | Value |
|-------|-------|
| Env plate | `environments/dungeon_entrance.png` |
| Size | 960×640 |
| Spawns | none |
| Props | `prop_portal_overworld` (back to Parish mouth); north door to R1 |
| Notes | Soft level warning if level &lt; 5 (once). Controls tutorial preferably in town/overworld first. |
| Clear rule | Auto-cleared |

### R1 — First blood `room_combat_a`
| Field | Value |
|-------|-------|
| Env | `dungeon_room_combat_a` |
| Spawns | scuttler ×3 |
| Props | torch ×2, bones |
| Clear | all enemies dead |

### R2 — Crossroads `room_combat_b`
| Field | Value |
|-------|-------|
| Env | `dungeon_room_combat_b` |
| Spawns | scuttler ×2, wretch ×1 |
| Exits | north R4, east R3 |
| Clear | all dead |

### R3 — Side cache `room_loot_a`
| Field | Value |
|-------|-------|
| Env | `dungeon_room_loot` |
| Spawns | none (or scuttler ×1 if need threat — **lock: 1 scuttler**) |
| Props | `prop_chest` ×1 (loot table `chest_side`) |
| Exit | west back R2 |
| Clear | chest opened OR enemies dead — **lock: enemies dead + chest may remain** |

### R4 — Ash corridor fight `room_combat_c`
| Field | Value |
|-------|-------|
| Env | `dungeon_room_combat_c` |
| Spawns | wretch ×2, scuttler ×2 |
| Clear | all dead |

### R5 — Honor crypt `room_elite`
| Field | Value |
|-------|-------|
| Env | `dungeon_room_elite` |
| Spawns | **crypt_guard ×1**, scuttler ×2 |
| Props | torch, bones |
| Loot | Guard death: elite table + **guaranteed `item_crypt_key`** if not owned |
| Clear | all dead |

### R6 — Ossuary rest `room_rest`
| Field | Value |
|-------|-------|
| Env | `dungeon_room_rest` (can reuse loot plate with calmer crop — **own plate Required**) |
| Spawns | none |
| Props | optional barrels |
| Effect | On enter once per run: heal **20 HP** (not full) |
| Clear | auto |

### R7 — Parish dead `room_combat_d`
| Field | Value |
|-------|-------|
| Env | `dungeon_room_combat_a` (reuse plate OK) |
| Spawns | scuttler ×3, wretch ×2 |
| Exits | north R9, east R8 |
| Clear | all dead |

### R8 — Bell storage side `room_combat_e`
| Field | Value |
|-------|-------|
| Env | `dungeon_room_combat_b` reuse |
| Spawns | wretch ×3 |
| Props | chest `chest_side` |
| Clear | all dead |

### R9 — Approach `room_combat_f`
| Field | Value |
|-------|-------|
| Env | `dungeon_room_combat_c` reuse |
| Spawns | scuttler ×2, wretch ×1, crypt_guard **no** — scuttler×4 wretch×2 |
| Clear | all dead |

### R10 — Gate corridor `room_gate`
| Field | Value |
|-------|-------|
| Env | `dungeon_room_corridor` |
| Spawns | none |
| Props | `prop_door_boss` north |
| Logic | Interact door: if inventory has key, open → R11; else floating text “The door demands the Crypt Key.” |
| Clear | auto |

### R11 — Carillon heart `room_boss`
| Field | Value |
|-------|-------|
| Env | `dungeon_boss` |
| Spawns | bellwarden ×1 center |
| On enter first time | lock exits, play `cine_boss_intro`, then AI enable |
| On boss death | unlock, spawn portal town, `cine_victory`, loot `boss_table` |
| Clear | boss dead |

---

## 3. Spawn density summary

| Room | scuttler | wretch | crypt_guard | boss |
|------|----------|--------|-------------|------|
| R0 | 0 | 0 | 0 | 0 |
| R1 | 3 | 0 | 0 | 0 |
| R2 | 2 | 1 | 0 | 0 |
| R3 | 1 | 0 | 0 | 0 |
| R4 | 2 | 2 | 0 | 0 |
| R5 | 2 | 0 | 1 | 0 |
| R6 | 0 | 0 | 0 | 0 |
| R7 | 3 | 2 | 0 | 0 |
| R8 | 0 | 3 | 0 | 0 |
| R9 | 4 | 2 | 0 | 0 |
| R10 | 0 | 0 | 0 | 0 |
| R11 | 0 | 0 | 0 | 1 |
| **Totals** | **17** | **10** | **1** | **1** |

Boss summons add temporary scuttlers/wretches (not in table).

---

## 4. JSON schema (rooms)

```json
{
  "id": "bellcrypt_01",
  "rooms": [
    {
      "id": "R1",
      "env": "dungeon_room_combat_a",
      "width": 960,
      "height": 640,
      "walls": [ { "x": 0, "y": 0, "w": 960, "h": 32 } ],
      "spawns": [ { "type": "scuttler", "x": 400, "y": 300 } ],
      "props": [ { "type": "prop_torch", "x": 100, "y": 120 } ],
      "exits": [ { "to": "R2", "x": 480, "y": 16, "spawnX": 480, "spawnY": 560 } ]
    }
  ]
}
```

Exact coordinates filled at greybox time; topology and spawn **counts** are locked here.

---

## 5. Navigation rules

- Only one room loaded at a time (Phaser scene room swap or single scene stream)  
- **Decision:** single `DungeonScene`, swap room data, fade 150ms  
- Player keeps HP/items between rooms  
- Cleared rooms stay cleared for the run; re-entry = empty (no respawn)  
- Leaving dungeon to town ends the run instance (new spawns next entry) but **keeps inventory**  

---

## 6. Key & door

| Item | `item_crypt_key` |
|------|------------------|
| Drop | Crypt Guard death in R5, guaranteed if player lacks key |
| Icon | `items/item_crypt_key.png` |
| Bag | Quest-like; not sellable |
| Use | Auto on door interact; consumed **no** — **lock: key stays**, door opens permanent this run |

---

## 7. Ambient / presentation

- Optional looping dust particles (code)  
- Torches: 2-frame flicker if art exists  
- Music: `audio/music_dungeon.ogg` (see AUDIO.md)  
