# Gravewake — original content bible (historical)

> **Historical design archive — not a current runtime contract.** This file
> preserves the original vertical-slice intent. Do not use its controls,
> filenames, IDs, scope, balance numbers, scene plan, or asset status to change
> the active game. Start with [`../README.md`](../README.md),
> [`INDEX.md`](./INDEX.md), [`SYSTEMS.md`](./SYSTEMS.md), current `content/`, and
> current source.

The text below catalogues the original v1 proposal. Its “locked” labels apply
only to that archived proposal. Current actors, abilities, animation fields,
and asset ids live in `content/`, `src/`, and `browser/`.

---

## 1. Player — Gravewarden

| Field | Value |
|-------|-------|
| Content ID | `hero` / `gravewarden` |
| Display name | Gravewarden |
| Role | Player avatar |
| Style base asset | `style/hero_base.png` |
| Default weapon look | Straight warden blade, ash-rune inlay, dark leather + bone charms |
| Size class | Medium (128–192 px tall target) |

### 1.1 Animation set (Required)

| State ID | Frames | Files | Gameplay |
|----------|--------|-------|----------|
| `idle` | 2 | `characters/hero_idle_01.png` … `_02` | Stand |
| `walk` | 4 | `characters/hero_walk_01` … `_04` | Move |
| `attack` | 3 | `characters/hero_attack_01` … `_03` | Rite Slash body |
| `cast_skill_1` | 2 | `characters/hero_cast1_01` … `_02` | Cinder Nova |
| `cast_skill_2` | 2 | `characters/hero_cast2_01` … `_02` | Grave Veil |
| `dodge` | 3 | `characters/hero_dodge_01` … `_03` | Ash Step |
| `hit` | 1 | `characters/hero_hit_01.png` | Flinch |
| `death` | 2 | `characters/hero_death_01` … `_02` | Die |

Facing: art faces **right**; engine flips for left. Aim rotates attack FX toward cursor.

### 1.2 Abilities

#### `basic_rite_slash` — Rite Slash
| Field | Value |
|-------|-------|
| Input | LMB |
| Type | Melee arc |
| Animation | `attack` |
| Hitbox | 90° cone, range **72** world units (tune in balance) |
| Active frames | During `attack_02` |
| FX | `fx_slash_*`, on hit `fx_impact_*` |
| Cooldown | Attack rate / swing recovery (see balance) |

#### `skill_cinder_nova` — Cinder Nova
| Field | Value |
|-------|-------|
| Input | Q |
| Type | Point-blank AoE |
| Animation | `cast_skill_1` |
| Hitbox | Circle radius **96** centered on player |
| FX | `fx_skill1_*` + brief `fx_aoe_ground` |
| Effect | Fire/ash damage to all enemies in radius |
| Cooldown | Yes (balance) |

#### `skill_grave_veil` — Grave Veil
| Field | Value |
|-------|-------|
| Input | E |
| Type | Self buff + aura slow |
| Animation | `cast_skill_2` |
| FX | `fx_skill2_*` (veil wisps on player) |
| Effect | Absorb shield (flat HP sponge) for N seconds; enemies in radius **64** get move slow |
| Cooldown | Yes (balance) |

#### `dodge_ash_step` — Ash Step
| Field | Value |
|-------|-------|
| Input | Space |
| Type | Dash |
| Animation | `dodge` |
| Movement | Dash **120** units toward move dir (or face if no input) |
| i-frames | Yes, most of dodge duration |
| FX | Optional trail = code particles; no extra sheet required |
| Cooldown | Yes (balance) |

#### `item_potion_health` use
| Field | Value |
|-------|-------|
| Input | 1 |
| Animation | Optional `hero_use_item` — **Nice**; else instant + `fx_heal` |
| Effect | Heal (balance) |

---

## 2. Enemies

### 2.1 Bone Scuttler — `scuttler`

| Field | Value |
|-------|-------|
| Display | Bone Scuttler |
| Role | Trash melee swarm |
| Base | `style/scuttler_base.png` (alias of trash_melee identity) |
| Look | Low skulking skeleton, too many joints, ash-stained ribs, bone blades for hands |
| Size | Small-medium |

**Behavior AI**
1. Idle until player within **aggro 280**  
2. Chase at walk speed  
3. If in melee range **48**: play `attack`, deal damage on frame 2  
4. Brief recovery, repeat  
5. On death: anim + loot roll  

**Abilities**
| ID | Name | Type | Anim | FX |
|----|------|------|------|-----|
| `scuttler_swipe` | Bone Swipe | Melee | `attack` | `fx_impact` on hit |

**Animations (Required)**

| State | Frames | Path prefix |
|-------|--------|-------------|
| idle | 1 | `enemies/scuttler_idle_01` |
| walk | 4 | `enemies/scuttler_walk_01`…`04` |
| attack | 2 | `enemies/scuttler_attack_01`…`02` |
| hit | 1 | `enemies/scuttler_hit_01` |
| death | 2 | `enemies/scuttler_death_01`…`02` |

---

### 2.2 Ashbow Wretch — `wretch`

| Field | Value |
|-------|-------|
| Display | Ashbow Wretch |
| Role | Trash ranged |
| Base | `style/wretch_base.png` |
| Look | Hooded half-flesh archer, bow of fused vertebrae, ash-ember arrows |
| Size | Medium |

**Behavior AI**
1. Aggro range **320**  
2. Prefer distance **180–240**; back up if player closer than **140**  
3. If in band and LOS: `attack` (shoot)  
4. Projectile: `proj_ash_arrow`  
5. Death → loot  

**Abilities**
| ID | Name | Type | Anim | Projectile |
|----|------|------|------|------------|
| `wretch_shot` | Ash Arrow | Ranged | `attack` | `fx/fx_projectile_ash_arrow_01.png` |

Projectile: speed **220**, radius **8**, destroyed on hit or max range **420**.

**Animations (Required)** — same pattern as scuttler with prefix `enemies/wretch_*`.

---

### 2.3 Crypt Guard — `crypt_guard` (Elite)

| Field | Value |
|-------|-------|
| Display | Crypt Guard |
| Role | Elite bruiser |
| Base | `style/crypt_guard_base.png` |
| Look | Tall armored skeletal knight, tower shield fragments, rusted greatblade, cathedral tabard rags |
| Size | Large |

**Behavior AI**
1. Aggro **300**, chase  
2. Cycle: **Shield Bash** → walk → **Great Cleave** → walk  
3. Special every 3rd attack cycle: **Bell Toll Slam** (telegraphed)  
4. Death: always rolls elite table; **guarantees Crypt Key** if not yet dropped this run (see loot)  

**Abilities**
| ID | Name | Type | Anim | Notes |
|----|------|------|------|-------|
| `guard_cleave` | Great Cleave | Melee wide | `attack` | 120° cone |
| `guard_bash` | Shield Bash | Melee + short stun/hitstun | `special` frames  or attack alt | Uses `special` anim |
| `guard_bell_slam` | Bell Toll Slam | AoE ground | `special` | Danger decal `fx_aoe_danger` then damage |

**Animations (Required)**

| State | Frames | Prefix |
|-------|--------|--------|
| idle | 1 | `enemies/crypt_guard_idle_01` |
| walk | 4 | `enemies/crypt_guard_walk_*` |
| attack | 2 | `enemies/crypt_guard_attack_*` (cleave) |
| special | 2 | `enemies/crypt_guard_special_*` (bash / slam windup+hit) |
| hit | 1 | `enemies/crypt_guard_hit_01` |
| death | 2 | `enemies/crypt_guard_death_*` |

For slam: code shows `fx_aoe_danger` during special_01; damage on special_02.

---

### 2.4 The Bellwarden — `bellwarden` (Boss)

| Field | Value |
|-------|-------|
| Display | The Bellwarden |
| Role | Final boss |
| Base | `style/bellwarden_base.png` |
| P2 base | `style/bellwarden_p2_base.png` (cracked bronze, glowing ash rifts) |
| Look P1 | Giant sexton-wraith, bronze death-bell fused to left arm, hammer-flail right, cathedral ash mitre |
| Look P2 | Bell ruptured, shockwave rings, brighter runes, more aggressive stance |
| Size | Very large (256–384 px) |

**Phases**
- **Phase 1:** HP 100% → 50%  
- **Phase 2:** at 50%: invuln 1.0s, swap to p2 sprites, roar (screen shake), then new weights  

**Arena:** room `R11_boss` locked doors until death or player death.

#### Phase 1 attacks
| ID | Name | Telegraph | Anim | Effect |
|----|------|-----------|------|--------|
| `bw_swing` | Bell Arm Swing | Short face windup | `attack_a` | Wide melee arc |
| `bw_hammer` | Hammer Crash | `telegraph` + danger circle at impact point | `attack_b` | Ground smash AoE |
| `bw_summon` | Call Scuttlers | Raise bell | `telegraph` | Spawn **2** `scuttler` (cap 4 alive) |

Pattern weights P1: swing 40%, hammer 35%, summon 25%. Walk between casts.

#### Phase 2 attacks
| ID | Name | Telegraph | Anim | Effect |
|----|------|-----------|------|--------|
| `bw_swing` | (faster) | shorter | `p2_attack` | Same arc, higher dmg |
| `bw_peal` | Hungering Peal | Full ring danger | `telegraph` + `attack_b` | Expanding ring damage from boss |
| `bw_hammer` | Hammer Crash | larger radius | `p2_attack` | Bigger smash |
| `bw_summon` | Call mixed | — | `telegraph` | 1 scuttler + 1 wretch (cap 4) |

**Animations (Required)**

Phase 1 prefix `bosses/bellwarden_`:
- idle ×2, walk ×4, attack_a ×3, attack_b ×3, telegraph ×2, hit ×1, death ×3  

Phase 2 prefix `bosses/bellwarden_p2_`:
- idle ×2, walk ×4, attack ×3, telegraph ×2  

Death uses phase-current body then `bellwarden_death_*` (generate from p2 base if died in p2 — **decision:** always use one death set from p2-scarred look for simplicity; if kill in p1, still play same death art).

**Boss intro cinematic still:** `cinematics/_stills/boss_intro_still.png` (dramatic, not top-down required).

---

## 3. NPC

### Sister Marrow — `npc_vendor`

| Field | Value |
|-------|-------|
| Display | Sister Marrow |
| Location | Ashen Lychgate |
| Base | `style/npc_vendor_base.png` or direct prop  
| Look | Veiled bone-nun, reliquary satchel, candle crown |
| Interact | Open vendor UI |
| Line (text code) | “Steel rusts. Rites don’t. Buy what keeps you breathing.” |

**Anims:** `props/npc_vendor_idle_01.png` (Required), `npc_vendor_talk_01` Nice.

---

## 4. Projectiles & FX catalog (complete v1)

| FX ID | Files | Used by |
|-------|-------|---------|
| `fx_slash` | `fx/fx_slash_01`…`03` | Rite Slash |
| `fx_impact` | `fx/fx_impact_01`…`02` | Any successful hit |
| `fx_skill1` | `fx/fx_skill1_01`…`03` | Cinder Nova |
| `fx_skill2` | `fx/fx_skill2_01`…`03` | Grave Veil |
| `fx_projectile_ash_arrow` | `fx/fx_projectile_ash_arrow_01.png` | Wretch |
| `fx_projectile_player` | `fx/fx_projectile_player_01.png` | **Unused v1** (reserve) |
| `fx_aoe_ground` | `fx/fx_aoe_ground.png` | Friendly telegraph / nova residual |
| `fx_aoe_danger` | `fx/fx_aoe_danger.png` | Enemy/boss telegraph |
| `fx_heal` | `fx/fx_heal_01.png` | Potion |
| `fx_shadow` | `fx/fx_shadow.png` | Under feet all actors Nice |
| `fx_loot_sparkle` | `fx/fx_loot_sparkle_01.png` | Ground loot |
| `fx_death_poof` | `fx/fx_death_poof_01.png` | Enemy remove Nice |
| `fx_spawn` | `fx/fx_spawn_01.png` | Summons Nice |
| `fx_veil_loop` | can reuse skill2 | Buff active indicator Nice |
| `fx_ring_peal` | `fx/fx_ring_peal_01.png` | Boss Hungering Peal expanding ring | Required |
| `fx_levelup` | `fx/fx_levelup_01.png` … `_03` | Player level-up burst | Required |

---

## 5. World interactables

| ID | States / files | Function |
|----|----------------|----------|
| `prop_chest` | closed/open | Loot roll once |
| `prop_door_boss` | closed/open | Needs `item_crypt_key` |
| `prop_portal_town` | idle | Return to town (appears after first room clear or always in entrance — **lock:** entrance + post-boss) |
| `prop_portal_dungeon` | idle | Town → crypt |
| `prop_crypt_stairs` | static in town plate or prop | Same as dungeon portal |
| `item_loot_bag` | world sprite | Pickup container |
| `item_gold_pile` | world sprite | Gold pickup |
| `item_crypt_key` | icon + optional world | Key to boss door |
| `prop_barrel` | idle / break | Nice destructible, tiny gold |
| `prop_torch` | 2-frame | Flavor |
| `prop_bones` | static | Flavor |
| `prop_crate` | idle | Flavor |

---

## 6. Skills UI icons

| Skill | Icon file |
|-------|-----------|
| Cinder Nova | `skills/skill_cinder_nova.png` |
| Grave Veil | `skills/skill_grave_veil.png` |
| Ash Step | `skills/skill_ash_step.png` (Nice; can use code keycap) |
| Rite Slash | `skills/skill_rite_slash.png` (Nice) |

---

## 7. Cinematics

| ID | Still | Video | Content |
|----|-------|-------|---------|
| `cine_title` | Title key art: Gravewarden before Bellcrypt mouth, ash snow | `title_loop.mp4` | Slow push-in, ash drift |
| `cine_boss_intro` | Bellwarden ringing once in arena | `boss_intro.mp4` | Bell motion / camera push |
| `cine_victory` | Bell cracked, warden standing, light shaft | `victory.mp4` | Embers up, slow drift |
| `cine_death` | Warden kneeling in ash | `death.mp4` | Fade ash, slow push |

---

## 8. Naming migration

Old pipeline placeholders map as follows (use **new** names in files going forward):

| Old placeholder | New ID |
|-----------------|--------|
| trash_melee | `scuttler` |
| trash_ranged | `wretch` |
| elite | `crypt_guard` |
| boss | `bellwarden` |
| hero | `hero` / Gravewarden |

Checklist uses **new** IDs only.
