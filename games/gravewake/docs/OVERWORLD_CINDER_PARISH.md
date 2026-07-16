# Cinder Parish — original overworld design (historical)

> **Historical design archive — not a current runtime contract.** This file
> preserves the original vertical-slice intent. Do not use its controls,
> filenames, IDs, scope, balance numbers, scene plan, or asset status to change
> the active game. Start with [`../README.md`](../README.md),
> [`INDEX.md`](./INDEX.md), [`SYSTEMS.md`](./SYSTEMS.md), current `content/`, and
> current source.

**Zone ID:** `cinder_parish`  
**Display name:** Cinder Parish  
**Role:** Diablo-style outdoor grind / travel space between **town** and **dungeon**

```text
Ashen Lychgate (town)
        │  south gate
        ▼
┌─────────────────────────────┐
│     CINDER PARISH            │  ← open play, packs respawn
│  (scrollable overworld)      │
│                              │
│  [packs] [chests] [elites]   │
│                              │
│        Bellcrypt Mouth ──────┼──► Bellcrypt (instance dungeon)
└─────────────────────────────┘
```

---

## 1. Fantasy

The **parish green** beyond the lychgate is buried under ash. Paths still lead toward the cathedral crypt mouth. The dead walk the lanes in **respawning packs** — good ground for a Warden to harden steel and soul before the deep dark.

---

## 2. Map structure (v1)

Not a planet-sized open world — a **single continuous overworld map** (like a small D2 wilderness), fully explorable.

| Field | Value |
|-------|-------|
| World size | **3200 × 2400** px (100×75 cells @ 32px) |
| Camera | Follow player, clamp to bounds |
| Collision | Edge walls + prop blockers + building shells |
| Fog of war | **No** (full vision) |
| Minimap | **Simple** — player dot + town gate + dungeon mouth markers (code) |

### Regions (logical; may share or split env art)

| Region ID | Area (approx) | Mood | Content |
|-----------|---------------|------|---------|
| `parish_gate` | North-center | Near town | Safe-ish, 1 tutorial pack, path south |
| `ash_lanes` | Center | Main grind | Multiple scuttler/wretch packs |
| `broken_nave` | West | Ruins | Higher density, chest, elite patrol |
| `bell_approach` | South | Toward crypt | Tougher packs, path to dungeon entrance |
| `charnel_copse` | East | Side grind | Optional packs + chest |

Regions are **trigger AABBs** for music intensity / spawn tables, not load screens.

---

## 3. Environment art

Full plates or **stitched sectors** — see TILES_AND_ENV.

| Env ID | File | Coverage |
|--------|------|----------|
| `overworld_parish_nw` | `environments/overworld_parish_nw.png` | NW quadrant |
| `overworld_parish_ne` | `environments/overworld_parish_ne.png` | NE |
| `overworld_parish_sw` | `environments/overworld_parish_sw.png` | SW (includes crypt mouth approach) |
| `overworld_parish_se` | `environments/overworld_parish_se.png` | SE |
| `overworld_crypt_mouth` | `environments/overworld_crypt_mouth.png` | Optional detail prop-plate at entrance |

**Engine:** 2×2 quadrant tileset, each **1600×1200**, seamless edges (Imagine with matching style + careful edit continuity from style mood).

---

## 4. Points of interest

| POI ID | Type | Position intent | Interact |
|--------|------|-----------------|----------|
| `poi_town_gate` | Exit | North edge center | → TownScene |
| `poi_crypt_mouth` | Dungeon enter | South-west approach | → Bellcrypt R0; confirm if first time |
| `poi_waypoint_cross` | Rest shrine | Map center | Heal **25% max HP** once per **3 min** real-time; sparkle FX |
| `poi_chest_nave` | Chest | West ruins | `chest_overworld` |
| `poi_chest_copse` | Chest | East | `chest_overworld` |
| `poi_sign_crypt` | Flavor | Near mouth | Text: “Bellcrypt — the Peal waits below.” |

Props: reuse dungeon set + new overworld props (fence, dead tree, gravestone) listed in TILES_AND_ENV.

---

## 5. Enemy packs (grind)

Packs are **spawn groups** with **respawn rules**.

### Respawn rules (locked)

| Rule | Value |
|------|-------|
| On kill | Pack marked dead |
| Respawn timer | **45 seconds** after last pack member dies |
| Respawn condition | Player **> 400 px** away from pack anchor OR timer elapsed **and** not in combat with that pack |
| Soft cap | Max **6 packs** alive globally; if cap hit, delay further respawns |
| On zone re-entry from town | All packs force respawn immediately |
| On return from dungeon | Packs keep state (timer continues) |

### Pack catalog

| Pack ID | Region | Composition | Level band* | Table |
|---------|--------|-------------|-------------|-------|
| `pack_gate_01` | parish_gate | scuttler ×2 | 1–2 | `table_trash` |
| `pack_lane_01` | ash_lanes | scuttler ×3 | 1–3 | trash |
| `pack_lane_02` | ash_lanes | scuttler ×2, wretch ×1 | 2–4 | trash |
| `pack_lane_03` | ash_lanes | wretch ×2 | 2–4 | trash |
| `pack_lane_04` | ash_lanes | scuttler ×4 | 3–5 | trash |
| `pack_nave_01` | broken_nave | scuttler ×2, wretch ×2 | 3–5 | trash |
| `pack_nave_02` | broken_nave | **crypt_guard ×1**, scuttler ×1 | 4–6 | `table_elite_open` |
| `pack_copse_01` | charnel_copse | scuttler ×3, wretch ×1 | 2–4 | trash |
| `pack_copse_02` | charnel_copse | wretch ×3 | 3–5 | trash |
| `pack_approach_01` | bell_approach | scuttler ×3, wretch ×2 | 4–6 | trash |
| `pack_approach_02` | bell_approach | scuttler ×2, wretch ×2, **crypt_guard ×1** | 5–7 | elite_open |

\*Level band = recommended player level; enemies still spawn if underleveled (harder grind).

**No Bellwarden in overworld.**

### Elite open table
Like elite but **never** drops dungeon Crypt Key (key remains Bellcrypt R5 only). Can drop magic/rare gear + gold.

---

## 6. XP from overworld

See `PROGRESSION.md`. Overworld is the **primary safe grind** for levels before/between dungeon pushes.

| Source | XP note |
|--------|---------|
| Pack trash | Full XP |
| Open elite | Full XP + bonus |
| Repeat kills after respawn | Full XP (grind allowed) |

---

## 7. Danger & death

- Death in overworld → **Ashen Lychgate**, 30% gold loss, gear kept (same as dungeon)  
- No corpse run  
- Optional: drop a **ash stain** marker at death site (code circle, Nice)  

---

## 8. Flow vs dungeon

| | Overworld | Bellcrypt |
|--|-----------|-----------|
| Structure | Continuous map | Room-by-room instance |
| Clears | Packs **respawn** | Rooms **stay clear** for the run |
| Goal | Grind XP/loot, travel | Key, boss, story win |
| Exit | Town gate / crypt mouth | Portal to town or mouth |

**Typical session:** Town → Parish grind to comfortable level → Bellcrypt push → die or retreat → grind → push again → boss.

---

## 9. Data file

`content/overworld/cinder_parish.json`

```json
{
  "id": "cinder_parish",
  "width": 3200,
  "height": 2400,
  "quadrants": ["overworld_parish_nw", "overworld_parish_ne", "overworld_parish_sw", "overworld_parish_se"],
  "pois": [],
  "packs": [
    {
      "id": "pack_lane_01",
      "anchor": { "x": 1600, "y": 1000 },
      "respawnSec": 45,
      "members": [ { "type": "scuttler" }, { "type": "scuttler" }, { "type": "scuttler" } ]
    }
  ],
  "collision": []
}
```

---

## 10. Scene

`OverworldScene` — see SYSTEMS.md.  
Music: `music_overworld`.
