# Gravewake — Tiles, Environment Plates & Props

v1 uses **full room plates** + **prop sprites**, not a classic 32×32 autotile map.  
Collision is **data rects**, not tile flags.  
This doc still lists **every visual piece** so nothing is improvised.

---

## 1. Art strategy (locked)

| Layer | Method |
|-------|--------|
| Floor + walls + architecture | One **Imagine plate** per room type |
| Interactives / blockers decoration | Prop sprites composited at JSON positions |
| Walkability | Invisible collision rectangles in room JSON |
| “Tiles” for mental model | Logical **cell grid 32×32** for placing props & spawns only |

**Logical grid:** room sizes multiple of 32. Default room **30×20 cells** = 960×640.

---

## 2. Environment plates (Required)

### Town
| Env ID | File | Used by | Description for Imagine |
|--------|------|---------|-------------------------|
| `town_main` | `environments/town_main.png` | Ashen Lychgate | Ruined lychgate yard, ash snow, **south gate to parish**, vendor nook, high 3/4 top-down, open center — **no direct dungeon stairs** (crypt is via overworld) |

### Overworld — Cinder Parish (2×2 quadrants, each ~1600×1200)
| Env ID | File | Coverage |
|--------|------|----------|
| `overworld_parish_nw` | `environments/overworld_parish_nw.png` | NW — town-side lanes, ash paths |
| `overworld_parish_ne` | `environments/overworld_parish_ne.png` | NE — open ash fields |
| `overworld_parish_sw` | `environments/overworld_parish_sw.png` | SW — approach + crypt mouth architecture |
| `overworld_parish_se` | `environments/overworld_parish_se.png` | SE — charnel copse, broken fences |

Seamless edges between quadrants; same STYLE phrases; no player characters on plates.

### Dungeon
| Env ID | File | Used by rooms | Description for Imagine |
|--------|------|---------------|-------------------------|
| `dungeon_entrance` | `environments/dungeon_entrance.png` | R0 | Crypt mouth hall, dusty light shaft |
| `dungeon_room_combat_a` | `environments/dungeon_room_combat_a.png` | R1, R7 | Bone-lined ossuary chamber, open center |
| `dungeon_room_combat_b` | `environments/dungeon_room_combat_b.png` | R2, R8 | Collapsed pew rubble crypt |
| `dungeon_room_combat_c` | `environments/dungeon_room_combat_c.png` | R4, R9 | Long ash-dust crypt with pillars (center free) |
| `dungeon_room_elite` | `environments/dungeon_room_elite.png` | R5 | Honor crypt, sarcophagus edges, taller ceiling feel |
| `dungeon_room_loot` | `environments/dungeon_room_loot.png` | R3 | Treasury alcove, chests space, gold dust |
| `dungeon_room_rest` | `environments/dungeon_room_rest.png` | R6 | Quiet ossuary shrine, calmer light |
| `dungeon_room_corridor` | `environments/dungeon_room_corridor.png` | R10 | Narrow approach to great door |
| `dungeon_boss` | `environments/dungeon_boss.png` | R11 | Circular carillon chamber, giant bell motif in architecture, open arena floor |

**Aspect:** generate large square or 4:3; crop/letterbox in engine to 960×640 playfield if needed.

**Plate rules:** no player/enemy figures; no readable UI text; center ≥40% walkable-looking floor.

---

## 3. Logical tile types (collision / markup)

Used in tools & JSON comments; not necessarily painted per-cell.

| Tile code | Meaning | Visual |
|-----------|---------|--------|
| `FLOOR` | Walkable | Painted on plate |
| `WALL` | Blocked | Plate edge + collision rect |
| `PIT` | Blocked (optional) | Plate hole + collision — **unused v1** |
| `DOOR_N/E/S/W` | Exit trigger zone | Gap in wall plate + trigger AABB |
| `SPAWN` | Marker only | Invisible |
| `PROP` | Placement cell | Prop sprite |
| `BLOCKER` | Soft cover | Prop with collision |

Default wall thickness collision: 32px border unless room JSON overrides.

---

## 4. Prop catalog (complete)

| Prop ID | Files | Collision | Interact | Required |
|---------|-------|-----------|----------|----------|
| `prop_chest` | `props/prop_chest_closed.png`, `props/prop_chest_open.png` | 40×30 | Open once → loot | Yes |
| `prop_door_boss` | `props/prop_door_boss_closed.png`, `..._open.png` | full width when closed | Key check | Yes |
| `prop_portal_town` | `props/prop_portal_town_idle.png` | none | Dungeon → town (boss win / optional) | Yes |
| `prop_portal_overworld` | `props/prop_portal_overworld_idle.png` | none | Dungeon R0 → Parish | Yes |
| `prop_gate_town` | `props/prop_gate_town.png` | none | Town → Parish | Yes |
| `prop_crypt_mouth` | `props/prop_crypt_mouth.png` | none | Parish → Bellcrypt (or baked into SW plate) | Yes |
| `prop_shrine_rest` | `props/prop_shrine_rest.png` | none | Overworld heal shrine | Yes |
| `prop_gravestone` | `props/prop_gravestone.png` | small | Overworld flavor | Yes |
| `prop_dead_tree` | `props/prop_dead_tree.png` | 40×40 | Overworld blocker | Yes |
| `prop_fence` | `props/prop_fence.png` | 48×16 | Overworld | Yes |
| `prop_signpost` | `props/prop_signpost.png` | none | Crypt sign | Yes |
| `npc_vendor` | `props/npc_vendor_idle_01.png` | 32×32 | Vendor UI | Yes |
| `prop_torch` | `props/prop_torch_01.png`, `_02.png` | none | — | Yes (flavor min 1 art) |
| `prop_bones` | `props/prop_bones.png` | none or small | — | Yes |
| `prop_barrel` | `props/prop_barrel_idle.png`, `prop_barrel_break_01.png` | 28×28 | Hit to break → 1–3 gold | Yes |
| `prop_crate` | `props/prop_crate_idle.png` | 28×28 | — static | Yes |
| `prop_sarcophagus` | `props/prop_sarcophagus.png` | 64×32 | — static elite flavor | Yes |
| `prop_pillar` | `props/prop_pillar.png` | 36×36 | Blocker | Yes |
| `prop_rubble` | `props/prop_rubble.png` | 48×24 | Blocker | Yes |
| `prop_bell_shard` | `props/prop_bell_shard.png` | none | Boss room flavor | Yes |
| `prop_candle_row` | `props/prop_candle_row.png` | none | Town/rest | Nice |
| `prop_vendor_stall` | `props/prop_vendor_stall.png` | 80×40 | Behind sister | Yes |
| `item_loot_bag` | `props/item_loot_bag.png` | none | Pickup | Yes |
| `item_gold_pile` | `props/item_gold_pile.png` | none | Pickup | Yes |

### Prop placement minimums per env (guidelines)

| Room type | Min props |
|-----------|-----------|
| Town | vendor stall, vendor NPC, portal_dungeon, 2 torch |
| Entrance | portal_town, 2 torch, bones |
| Combat | 1–2 pillar or rubble, 1 torch, bones |
| Elite | sarcophagus, 2 torch, pillar |
| Loot | chest, crate, bones |
| Rest | candle/torch, bones, barrel |
| Corridor | boss door, torch |
| Boss | bell_shard ×3, no chest until death loot bag spawn |

---

## 5. Town scene layout (Ashen Lychgate)

| Element | Asset | Notes |
|---------|-------|-------|
| Background | `town_main` | Full screen plate |
| Sister Marrow | `npc_vendor` | Interact radius 48 |
| Stall | `prop_vendor_stall` | Decorative |
| Parish gate | `prop_gate_town` | → OverworldScene north spawn |
| Player spawn | data | Near center; return from death here |

---

## 6. Ground pickups (world sprites)

| ID | File | On pickup |
|----|------|-----------|
| Gold pile | `item_gold_pile` | +gold |
| Loot bag | `item_loot_bag` | open item roll UI auto-equip or bag |
| Potion world | reuse potion icon scaled | +1 potion if stack < max |
| Key world | optional flash of key icon | add key — usually direct to bag on elite death |

---

## 7. UI environment chrome

| Piece | File | Notes |
|-------|------|-------|
| Panel frame | `ui/ui_frame_panel.png` | Inventory / vendor / pause |
| Boss bar frame | `ui/ui_boss_bar_frame.png` | Nice; code bar OK |
| Title key art | `ui/title_keyart.png` | Also cinema still |

---

## 8. Imagine notes for plates vs props

- **Plates:** empty of characters; leave clear floors  
- **Props:** separate gen, transparent BG, top-down/high angle matching plates  
- **Doors/chests:** state pairs from same base via `image_edit`  

---

## 9. Checklist cross-ref

Every file in §2 and §4 Required column appears in `ASSET_CHECKLIST.md`.
