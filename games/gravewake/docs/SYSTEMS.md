# Gravewake — Technical Systems Design

Implementation map for the **game layer** on **Anvil** (`@anvil/core` +
`@anvil/genre-topdown2d` + `@anvil/genre-arpg`).
Gravewake uses Anvil APIs only. The conceptual systems below may be separate engine services or responsibilities inside `GravewakeGame`; do not recreate reusable mechanics in the title.

---

## 1. Stack

| Piece | Choice |
|-------|--------|
| Language | TypeScript |
| Bundler | Vite |
| Engine | Anvil |
| Browser rendering | Anvil `CanvasRenderFacade` + game presentation layer |
| Content | Schema-v2 JSON compiled to immutable `AnvilGameIR` |
| Assets | `public/assets/` |
| Save | Anvil run state, `localStorage` key `anvil_run_gravewake_run0` |

---

## 2. Runtime areas and presentation

The current runtime uses one Anvil `main` scene and transitions between area states. The table below describes responsibilities, not separate raw renderer scenes.

| Scene | Responsibility |
|-------|----------------|
| `BootScene` | Load pack, parse JSON |
| `TitleScene` | Title video/loop, Start |
| `TownScene` | Lychgate, vendor, gate to overworld |
| `OverworldScene` | Cinder Parish continuous map, packs, POIs |
| `DungeonScene` | Bellcrypt room instance, combat |
| `UIScene` | HUD: HP, XP bar, level, skills (parallel) |
| `CinematicScene` or modal | Play mp4 then resume |
| `DeathScene` / overlay | Death flow → town |
| `VictoryOverlay` | Post-boss |

---

## 3. Core modules

| Module | Responsibility |
|--------|----------------|
| `InputSystem` | WASD, mouse world pos, skills, inventory toggle |
| `PlayerController` | Move, state machine anims, dash |
| `CombatSystem` | Damage formula, hitboxes, i-frames, shield |
| `EnemyAI` | Per-type behaviors (scuttler/wretch/guard/boss) |
| `ProjectileSystem` | Ash arrows, lifetimes |
| `AnimationDriver` | Frame lists from JSON, flip X |
| `RoomManager` | Dungeon rooms, spawns, exits, cleared set |
| `OverworldManager` | Packs, respawn timers, POIs, quadrant art |
| `ProgressionSystem` | XP grant, level-up, stat recompute, skill ranks |
| `LootSystem` | Tables, spawn pickups |
| `InventorySystem` | Equip, bag, potions, key |
| `VendorSystem` | Buy/sell |
| `SaveSystem` | Serialize/deserialize |
| `AudioSystem` | Bus, mute, cue keys |
| `CinematicSystem` | Play/skip videos |
| `FXSystem` | One-shot sprites, AoE decals |

---

## 4. Entity model (simple, not full ECS)

```ts
// Conceptual
Actor {
  id, team: 'player' | 'enemy',
  level, // enemies: native or pack level
  xp, // player only
  hp, maxHp, armor, damageStat, moveSpeed,
  x, y, vx, vy, facing,
  state: AnimState,
  hurtbox: Circle,
  invulnUntil,
  shieldHp,
}
```

Player and enemies are Actors. Props are separate.

---

## 5. Animation driver

- Config from content bible paths  
- `play(state)` restarts non-loop; loop for idle/walk  
- Attack/cast lock movement partially (attack: 50% speed or 0 — **lock: 40% move during attack**)  
- Dodge overrides  

---

## 6. Hit detection

- Melee: cone test vs enemy positions  
- AoE: circle overlap  
- Projectiles: circle vs circle  
- No pixel-perfect  

Debug flag `DEBUG_HITBOXES=false`.

---

## 7. Save schema

```json
{
  "v": 1,
  "level": 1,
  "xp": 0,
  "gold": 0,
  "potions": 3,
  "equipped": { "weapon": {}, "armor": {} },
  "bag": [],
  "hasCryptKey": false,
  "bossDefeated": false,
  "settings": { "damageNumbers": true, "muted": false },
  "seenTutorial": false,
  "seenCryptWarning": false
}
```

Dungeon room clears **not** saved across town trips.  
Overworld pack timers **not** required to persist (refresh on town→world entry).

---

## 8. Content files

```text
content/
  heroes/gravewarden.json
  enemies/scuttler.json
  enemies/wretch.json
  enemies/crypt_guard.json
  enemies/bellwarden.json
  items/items.json
  loot/tables.json
  skills/skills.json
  progression/levels.json
  overworld/cinder_parish.json
  dungeons/bellcrypt_01.json
  fx/fx.json
```

---

## 9. Layer / depth

| Z | Content |
|---|---------|
| 0 | Room plate |
| 1 | Ground decals (AoE) |
| 2 | Props (y-sort) |
| 3 | Actors (y-sort) |
| 4 | Projectiles |
| 5 | FX bursts |
| 6 | UI |

Y-sort actors/props by feet Y.

---

## 10. Performance budgets

- ≤ 25 actors typical; boss + 4 adds peak  
- Texture atlas optional later; individual PNGs OK for slice  
- Room swap destroys prior enemies  

---

## 11. Greybox mode

`GREYBOX=true`: colored rects if texture missing; log warning once per id.  
Phase 1 develops with greybox; art replaces without logic change.

---

## 12. Testing checklist (dev)

- [ ] Player moves and attacks dummy  
- [ ] Town → overworld → dungeon → town  
- [ ] Pack kill + respawn + XP + level-up  
- [ ] Each enemy AI  
- [ ] Room transitions  
- [ ] Key door  
- [ ] Boss p1/p2  
- [ ] Loot equip  
- [ ] Vendor  
- [ ] Save/load (level/xp)  
- [ ] Death gold loss, XP kept  
- [ ] All cinematics skippable  
