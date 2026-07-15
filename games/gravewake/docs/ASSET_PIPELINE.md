# Asset Pipeline — Grok Imagine → Game

How we produce **every** visual for the vertical-slice ARPG.  
If it appears on screen and is not pure code UI, it is listed here or in `ASSET_CHECKLIST.md`.

**Companion file:** [`ASSET_CHECKLIST.md`](./ASSET_CHECKLIST.md) — tick every file. **Do not ship the slice with unchecked required rows.**

---

## 0. Hard rules

1. **No single-still combatants.** Player, enemies, and boss are **animation sets**.
2. **Base → edit.** `image_gen` once per identity; every other frame via `image_edit` from that base.
3. **Imagine paints frames; code plays them** (timing, loops, flips, hitboxes).
4. **Video is only cinematics**, never walk/attack gameplay frames.
5. **Text/numbers/bars are code**, never baked into sprites.
6. **Checklist is law.** New asset type → add to checklist before generating.

---

## 1. Imagine vs code (complete split)

| On-screen thing | Owner |
|-----------------|--------|
| Body poses (idle, walk, attack, cast, dodge, hit, death) | **Imagine frames** |
| Advancing which frame is shown | Code |
| Moving entity X/Y | Code |
| Flip facing L/R | Code |
| Projectiles, ground AoE decals, impact bursts (art) | **Imagine** (or simple code shapes if missing) |
| Particle systems, screen shake, flash white | Code |
| Room/town backgrounds | **Imagine** |
| Props (chest, door, portal, barrel…) | **Imagine** |
| Item / skill / currency icons | **Imagine** |
| Decorative UI frames / portraits | **Imagine** |
| HP bars, cooldowns, gold digits, tooltips text | **Code** |
| Collision, fog, minimap dots | **Code** |
| Title / boss intro / victory / death movies | **Imagine still → video** |

---

## 2. Tools map

| Tool | Use |
|------|-----|
| `image_gen` | New identity only (base for hero, each enemy id, boss, new prop family, new room mood) |
| `image_edit` | **All** animation frames, damage variants, open/closed prop states, recolors |
| `image_to_video` | Cinematics from approved stills (6s preferred) |
| Post-process | BG remove, resize, crop, PNG crush |
| Phaser | Load paths from JSON; play animations by name |

---

## 3. Animation state machines (complete)

These are the **gameplay animation states** the engine must support.  
Every state that is **Required** needs Imagine frames (counts in §4 and checklist).

### 3.1 Player (`hero`)

| State ID | When it plays | Loop? | Required v1 |
|----------|---------------|-------|-------------|
| `idle` | No move, no action | Yes (1–2 frames) | **Yes** |
| `walk` | Moving (WASD) | Yes | **Yes** |
| `attack` | Basic attack (LMB) | No, once | **Yes** |
| `cast_skill_1` | Skill 1 | No, once | **Yes** |
| `cast_skill_2` | Skill 2 | No, once | **Yes** |
| `dodge` | Space dodge/roll | No, once | **Yes** |
| `hit` | Took damage (brief) | No | **Yes** |
| `death` | HP ≤ 0 | No, hold last | **Yes** |
| `use_item` | Drink potion | No | Nice |
| `spawn` | Enter dungeon / resurrect | No | Nice |

**Priority (code):** death > dodge > cast > attack > hit > walk > idle  
(Higher wins if multiple request at once.)

### 3.2 Melee trash enemy (`trash_melee`)

| State ID | When | Loop? | Required |
|----------|------|-------|----------|
| `idle` | Aggro wait / pause | Yes | **Yes** |
| `walk` | Chasing / reposition | Yes | **Yes** |
| `attack` | Melee swing | No | **Yes** |
| `hit` | Damaged | No | **Yes** |
| `death` | Die | No | **Yes** |
| `spawn` | Room enter pop-in | No | Nice |

### 3.3 Ranged trash enemy (`trash_ranged`)

| State ID | When | Loop? | Required |
|----------|------|-------|----------|
| `idle` | Holding position | Yes | **Yes** |
| `walk` | Kiting / approach | Yes | **Yes** |
| `attack` / `shoot` | Fire projectile | No | **Yes** |
| `hit` | Damaged | No | **Yes** |
| `death` | Die | No | **Yes** |

### 3.4 Elite (`elite`)

Same as melee trash, **plus**:

| State ID | When | Required |
|----------|------|----------|
| `special` | Elite-only ability | **Yes** |

### 3.5 Boss (`boss`)

| State ID | When | Loop? | Required |
|----------|------|-------|----------|
| `idle` | Between attacks | Yes | **Yes** |
| `walk` | Reposition | Yes | **Yes** |
| `attack_a` | Primary pattern | No | **Yes** |
| `attack_b` | Secondary pattern | No | **Yes** |
| `telegraph` | Wind-up before big hit | No | **Yes** |
| `phase2` | Transform / enrage look (can be idle_p2 set) | — | **Yes** |
| `hit` | Damaged | No | **Yes** |
| `death` | Kill sequence | No | **Yes** |
| `spawn` / intro pose | After cinematic | No | Nice |

Phase 2 may reuse states with `boss_p2_*` frame sets (damaged/enraged base edit).

### 3.6 Non-character animated props

| Subject | States | Required |
|---------|--------|----------|
| Chest | `closed`, `open` | **Yes** (if chests exist) |
| Door | `closed`, `open` | **Yes** (boss gate) |
| Portal / town exit | `idle` (1–2 frame pulse ok) | **Yes** |
| Vendor NPC | `idle` (+ optional `talk`) | **Yes** (if vendor shown) |
| Loot bag / pile on ground | `idle` | **Yes** |
| Destructible barrel (optional) | `idle`, `break` | Nice |

---

## 4. Frame counts (locked for v1)

Do not invent different counts mid-slice unless PLAN is updated.

| Subject | idle | walk | attack / shoot | cast / special | dodge | hit | death | Notes |
|---------|------|------|----------------|----------------|-------|-----|-------|-------|
| **Hero** | 2 | **4** | **3** (basic) | **2** per skill (×2 skills) | **3** | **1** | **2** | ~18 combat frames |
| **trash_melee** | 1 | **4** | **2** | — | — | **1** | **2** | ~10 |
| **trash_ranged** | 1 | **4** | **2** shoot | — | — | **1** | **2** | ~10 |
| **elite** | 1 | **4** | **2** | **2** special | — | **1** | **2** | ~12 |
| **boss** | 2 | **4** | **3** A + **3** B | **2** telegraph | — | **1** | **3** | + phase2 idle/attack set |
| **boss phase2** | 1–2 | 2–4 | reuse or 2 | — | — | 1 | — | edit from boss base (scarred/glowing) |

**Facing v1:** generate frames facing **east/right**. Engine **flips X** for west.  
If flip fails QA → only then add 4-dir walk/attack (document in checklist as expansion).

**Walk frame intent (edit prompts):**

| Frame | Body note |
|-------|-----------|
| walk_01 | Contact: left foot forward |
| walk_02 | Passing: weight mid |
| walk_03 | Contact: right foot forward |
| walk_04 | Passing: weight mid (opposite of 02) |

**Attack frame intent:**

| Frame | Body note |
|-------|-----------|
| attack_01 | Wind-up |
| attack_02 | Contact / swing apex (hitbox active in code here) |
| attack_03 | Recovery |

**Dodge intent:** crouch/start → stretch/mid-roll → recover  
**Death intent:** stagger → downed (hold)  
**Hit intent:** flinch / recoil one frame  

---

## 5. VFX & combat decals (Imagine stills)

These are **not** full body characters. Short-lived sprites or ground plates.

| ID | Use | Frames | Required |
|----|-----|--------|----------|
| `fx_slash` | Melee swing arc | 1–3 | **Yes** |
| `fx_impact` | Hit confirm burst | 1–2 | **Yes** |
| `fx_skill1` | Burst skill effect | 1–3 | **Yes** |
| `fx_skill2` | Utility skill effect | 1–3 | **Yes** |
| `fx_projectile_enemy` | Ranged trash bolt | 1 (or 2) | **Yes** |
| `fx_projectile_player` | If hero ranged component | 1–2 | If needed by kit |
| `fx_aoe_ground` | Ground circle / cone telegraph | 1 | **Yes** (boss + skills) |
| `fx_aoe_danger` | Red telegraph variant | 1 | **Yes** |
| `fx_heal` | Potion / heal pulse | 1–2 | Nice |
| `fx_levelup` | Level-up burst | 1–3 | **Yes** (see checklist) |
| `fx_shadow` | Soft blob under feet | 1 | Nice (or code ellipse) |
| `fx_loot_sparkle` | On ground loot | 1–2 | Nice |
| `fx_death_poof` | Enemy despawn | 1–2 | Nice |
| `fx_spawn` | Enemy appear | 1–2 | Nice |

Code may use colored circles until these exist — but **checklist required rows must be filled before “art complete.”**

---

## 6. Environments & world plates

### 6.1 Full plates (background images)

| ID | Purpose | Required |
|----|---------|----------|
| `town_main` | Hub | **Yes** |
| `dungeon_room_combat_a` | Standard fight room | **Yes** |
| `dungeon_room_combat_b` | Visual variety | **Yes** |
| `dungeon_room_combat_c` | Visual variety | **Yes** |
| `dungeon_room_elite` | Elite room mood | **Yes** |
| `dungeon_room_loot` | Treasure room | **Yes** |
| `dungeon_room_corridor` | Connector | Nice |
| `dungeon_boss` | Boss arena | **Yes** |
| `dungeon_entrance` | First room | Nice (can reuse combat_a) |

Framing: high-angle, walkable center clear, walls on edges.

### 6.2 Props (separate sprites, composited in rooms)

| ID | States | Required |
|----|--------|----------|
| `prop_chest` | closed, open | **Yes** |
| `prop_door_boss` | closed, open | **Yes** |
| `prop_portal` | idle | **Yes** |
| `prop_barrel` | idle (+ break nice) | Nice |
| `prop_crate` | idle | Nice |
| `prop_bones` / clutter | idle | Nice (flavor) |
| `prop_torch` | idle 1–2 (flicker) | Nice |
| `prop_vendor_stall` | idle | If town needs it |
| `npc_vendor` | idle (+ talk nice) | **Yes** if vendor |

---

## 7. Items, skills, currency (icons)

All **1:1**, single object, neutral backdrop, style-matched.

### 7.1 Equipment icons (minimum slice)

| Slot | Count | Example IDs | Required |
|------|-------|-------------|----------|
| Weapons | ≥ 4 | `item_weapon_01` … `04` | **Yes** |
| Armor | ≥ 4 | `item_armor_01` … `04` | **Yes** |
| Potion | ≥ 1 | `item_potion_health` | **Yes** |
| Gold pile (world + UI) | 1–2 | `item_gold`, `item_gold_pile` | **Yes** |
| Loot bag (world drop) | 1 | `item_loot_bag` | **Yes** |

Rarity can be **code-colored borders**; no need for separate art per rarity unless we want glow variants later.

### 7.2 Skill icons

| ID | Required |
|----|----------|
| `skill_basic` (optional if LMB has no icon) | Nice |
| `skill_1` | **Yes** |
| `skill_2` | **Yes** |
| `skill_dodge` | Nice |

### 7.3 UI decoration (Imagine)

| ID | Required |
|----|----------|
| `ui_frame_panel` | **Yes** |
| `ui_frame_portrait` | Nice |
| `ui_slot_empty` | Nice (or code rect) |
| `ui_slot_rare` glow | Nice |
| `ui_boss_bar_frame` | Nice |
| `portrait_vendor` | Nice |
| `portrait_boss` | Nice |
| `title_logo` / key art still | **Yes** (feeds title cinematic) |

**Never Imagine:** font, exact HP string, “Press Start” letters (unless verified flawless — default to code text).

---

## 8. Cinematics (image → video)

| ID | Still source | Video out | Trigger | Required |
|----|--------------|-----------|---------|----------|
| `cine_title` | Key art still | `title_loop.mp4` | Boot / title scene | **Yes** |
| `cine_boss_intro` | Boss dramatic still | `boss_intro.mp4` | First boss room enter | **Yes** |
| `cine_victory` | Hero triumphant / loot | `victory.mp4` | Boss killed | **Yes** |
| `cine_death` | Hero fallen | `death.mp4` | Player death | **Yes** |
| `cine_town_enter` | Town establishing | optional | First town | Nice |
| `cine_dungeon_enter` | Crypt mouth | optional | First dungeon | Nice |

Pipeline per cinematic:

1. `image_gen` or `image_edit` still (can be cinematic angle, not top-down)  
2. Approve still  
3. `image_to_video` — **one** simple camera/motion, 6s  
4. Drop mp4 in `cinematics/`  
5. Wire in scene; title loops, others play once skippable  

---

## 9. Style bible (before content packs)

Generate and lock (see checklist Pack 0):

- hero_base  
- trash_melee_base, trash_ranged_base, elite_base, boss_base  
- one dungeon room mood, one town mood  
- 3 item icons sample  
- one UI frame mood  
- write `public/assets/style/STYLE.md` with winning phrases  

No mass production until STYLE.md exists.

---

## 10. Folder tree (complete)

```text
public/assets/
  style/
    STYLE.md
    hero_base.png
    trash_melee_base.png
    trash_ranged_base.png
    elite_base.png
    boss_base.png
    room_mood.png
    town_mood.png
  characters/
    hero_idle_01.png
    hero_idle_02.png
    hero_walk_01.png … hero_walk_04.png
    hero_attack_01.png … hero_attack_03.png
    hero_cast1_01.png hero_cast1_02.png
    hero_cast2_01.png hero_cast2_02.png
    hero_dodge_01.png … hero_dodge_03.png
    hero_hit_01.png
    hero_death_01.png hero_death_02.png
  enemies/
    trash_melee_idle_01.png
    trash_melee_walk_01.png … _04.png
    trash_melee_attack_01.png _02.png
    trash_melee_hit_01.png
    trash_melee_death_01.png _02.png
    trash_ranged_*  (same pattern; attack = shoot)
    elite_*         (+ elite_special_01 _02)
  bosses/
    boss_idle_01.png _02.png
    boss_walk_01.png … _04.png
    boss_attack_a_01.png … _03.png
    boss_attack_b_01.png … _03.png
    boss_telegraph_01.png _02.png
    boss_hit_01.png
    boss_death_01.png … _03.png
    boss_p2_idle_01.png
    boss_p2_attack_01.png … (minimal p2 set)
  fx/
    fx_slash_01.png …
    fx_impact_01.png …
    fx_skill1_01.png …
    fx_skill2_01.png …
    fx_projectile_enemy_01.png
    fx_aoe_ground.png
    fx_aoe_danger.png
    …
  environments/
    town_main.png
    dungeon_room_combat_a.png
    dungeon_room_combat_b.png
    dungeon_room_combat_c.png
    dungeon_room_elite.png
    dungeon_room_loot.png
    dungeon_boss.png
  props/
    prop_chest_closed.png
    prop_chest_open.png
    prop_door_boss_closed.png
    prop_door_boss_open.png
    prop_portal_idle.png
    npc_vendor_idle.png
    item_loot_bag.png
    item_gold_pile.png
  items/
    item_weapon_01.png … _04.png
    item_armor_01.png … _04.png
    item_potion_health.png
    item_gold.png
  skills/
    skill_1.png
    skill_2.png
  ui/
    ui_frame_panel.png
    title_keyart.png
  cinematics/
    title_loop.mp4
    boss_intro.mp4
    victory.mp4
    death.mp4
    _stills/          # source stills for video, optional keep
      title_keyart.png
      boss_intro_still.png
      victory_still.png
      death_still.png
```

**Naming:** `{subject}_{state}_{##}.png` — zero-padded frame index, snake_case, stable forever.

---

## 11. JSON contract (animations)

Every combatant content entry must list **all required states**:

```json
{
  "id": "hero",
  "animations": {
    "idle": ["characters/hero_idle_01.png", "characters/hero_idle_02.png"],
    "walk": [
      "characters/hero_walk_01.png",
      "characters/hero_walk_02.png",
      "characters/hero_walk_03.png",
      "characters/hero_walk_04.png"
    ],
    "attack": [
      "characters/hero_attack_01.png",
      "characters/hero_attack_02.png",
      "characters/hero_attack_03.png"
    ],
    "cast_skill_1": ["characters/hero_cast1_01.png", "characters/hero_cast1_02.png"],
    "cast_skill_2": ["characters/hero_cast2_01.png", "characters/hero_cast2_02.png"],
    "dodge": [
      "characters/hero_dodge_01.png",
      "characters/hero_dodge_02.png",
      "characters/hero_dodge_03.png"
    ],
    "hit": ["characters/hero_hit_01.png"],
    "death": ["characters/hero_death_01.png", "characters/hero_death_02.png"]
  },
  "frameRate": {
    "idle": 4,
    "walk": 10,
    "attack": 12,
    "cast_skill_1": 10,
    "cast_skill_2": 10,
    "dodge": 14,
    "hit": 8,
    "death": 6
  }
}
```

Missing required key = content bug; greybox may use colored rects only in Phase 1.

---

## 12. Generation workflow (every frame)

### New identity
1. Read `STYLE.md`  
2. `image_gen` base (top-down rules §13)  
3. Save `style/{id}_base.png`  
4. Human accept  

### Each animation frame
1. `image_edit` with **base** as input  
2. Prompt: same character/style; **only** change pose to state intent (§4)  
3. Save exact checklist filename  
4. QA: identity, silhouette, angle  
5. Post-process; register in JSON  

### Prop state pairs
Base closed → edit open (chest lid, door gap).

### Icons
`image_gen` per icon (or edit from a master “object on cloth” if consistency needs it).

### Cinematics
Still approve → `image_to_video` → mp4 path in checklist.

---

## 13. Framing rules

### Gameplay bodies (hero, enemies, boss, NPC)
- High-angle **top-down or 3/4 top-down**  
- Full body, centered, clear silhouette  
- Simple / removable background  
- No baked HUD  

### Environments
- High-angle readable floor  
- Center playable  
- Edges suggest walls  

### Icons / FX
- Centered subject  
- 1:1 for icons  
- FX: transparent-friendly, high contrast  

### Cinematic stills
- Dramatic angles allowed  

---

## 14. Target sizes

| Class | Size |
|-------|------|
| Hero / trash / elite | 128–256 px tall |
| Boss | 256–512 px tall |
| Props | 64–256 px |
| FX | 64–256 px |
| Icons | 64 or 128 px |
| Room plates | 1024–2048 px |
| Cinematic still | match 16:9 or 1:1 video |

Fix final sizes after greybox camera zoom (Phase 1), then freeze.

---

## 15. Content packs (order of work)

| Pack | What | Depends on |
|------|------|------------|
| **0** Style bible | Bases + STYLE.md | — |
| **A** Hero full anim set | All hero states §3.1 | Pack 0 |
| **B** Trash melee + ranged | Full enemy sets | Pack 0 |
| **C** Elite + boss + p2 | Full + telegraphs | Pack 0 |
| **D** FX pack | All required fx_ | Pack 0 |
| **E** Environments | All required plates | Pack 0 |
| **F** Props + NPC + loot world | chest/door/portal/vendor/bags | Pack 0 |
| **G** Items + skills + UI frames | Icons | Pack 0 |
| **H** Cinematics | 4 videos | Key stills |
| **I** Wire + in-game QA | JSON + play every state | A–H |

Never skip pack I. Generating without wiring = not done.

---

## 16. Prompt skeletons

**Body frame**
```
[Subject from STYLE], [exact pose intent], high-angle top-down full body
for a 2D ARPG sprite, [STYLE phrases], centered, clear silhouette,
simple plain background, game asset frame.
```

**Edit frame**
```
Same character, same outfit, same art style, same high-angle top-down camera.
Change only the pose: [walk_02 / attack wind-up / etc]. Full body visible.
```

**Icon**
```
[Object], single game inventory icon, centered, [STYLE], simple backdrop, 1:1.
```

**Room**
```
Top-down dungeon room plate, [theme], open center for player movement,
walls at edges, [STYLE], no characters, no UI text.
```

**Cinematic video**
```
Slow [push-in / drift], [light motion: embers / fog], subject mostly stable,
single simple camera move, dramatic lighting.
```

---

## 17. Accept / reject

**Accept:** style match, readable at zoom, correct state pose, identity stable, usable angle.  
**Reject:** wrong angle, style drift, identity drift, garbled text, unusable crop, weapon/outfit random change between frames.

---

## 18. Agent rules (no forgetting)

When producing art:

1. Open `ASSET_CHECKLIST.md`  
2. Only generate **unchecked** items in the active pack  
3. After save, mark checklist row done  
4. Update content JSON paths  
5. Do not mark pack complete until **every Required** row in that pack is checked  
6. Play the animation in-game before calling it finished  

---

## 19. Out of scope (do not “helpfully” invent mid-slice)

- 8-directional sheets  
- Mounts, pets, town full NPC cast  
- Per-rarity full item redraws  
- Lip-sync dialog  
- Full spell particle movies as gameplay  
- Second biome art  

Add to checklist + PLAN first if scope expands.
