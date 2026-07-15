# Gravewake — Game Design Document (Locked)

**Status:** Decisions locked for vertical slice v1.  
** codename / folder:** `x-game`  
**Title:** **Gravewake**

This document is authoritative for product design.  
Content IDs, assets, numbers: see linked docs. Do not invent parallel lore or systems mid-slice.

| Doc | Role |
|-----|------|
| [CONTENT_BIBLE.md](./CONTENT_BIBLE.md) | Every entity, ability, animation, FX ID |
| [OVERWORLD_CINDER_PARISH.md](./OVERWORLD_CINDER_PARISH.md) | Open grind map, packs, respawns, POIs |
| [DUNGEON_BELLCRYPT.md](./DUNGEON_BELLCRYPT.md) | Instance dungeon graph, rooms, spawns |
| [PROGRESSION.md](./PROGRESSION.md) | XP, levels 1–20, level rewards |
| [TILES_AND_ENV.md](./TILES_AND_ENV.md) | Every plate, tile, prop |
| [ITEMS_AND_LOOT.md](./ITEMS_AND_LOOT.md) | Every item, drop table, vendor |
| [COMBAT_BALANCE.md](./COMBAT_BALANCE.md) | Stats, damage formulas, tuning |
| [SYSTEMS.md](./SYSTEMS.md) | Engine modules, data, save, scenes |
| [AUDIO.md](./AUDIO.md) | Every sound/music cue (stub assets OK) |
| [ASSET_PIPELINE.md](./ASSET_PIPELINE.md) | How Imagine produces frames |
| [ASSET_CHECKLIST.md](./ASSET_CHECKLIST.md) | File-by-file tick list |
| [PLAN.md](./PLAN.md) | Build phases |

---

## 1. Elevator pitch

You are a **Gravewarden**. From the town **Ashen Lychgate** you step into **Cinder Parish** — an open ash-choked overworld where the dead respawn and you grind levels and loot — then descend **Bellcrypt** to silence the **Bellwarden**.  
Classic Diablo loop: **town → open wilds → dungeon → boss**, with XP levels and gear.

---

## 2. Locked decisions

| Decision | Lock |
|----------|------|
| Title | **Gravewake** |
| Setting | Dark fantasy **bone-and-ash crypt** under a ruined cathedral |
| Tone | Grim, readable, slightly gothic — not comedy, not sci-fi |
| Perspective | **High 3/4 top-down** (soft iso-lean, not pure overhead) |
| Controls | **WASD + mouse aim** (not click-to-move in v1) |
| Player class | Single kit: **hybrid melee + rites** (no class select) |
| Player name (fiction) | The player character is a **Gravewarden** (no custom name UI v1) |
| Campaign size | **1 town** + **1 open overworld** + **1 dungeon** |
| Town | `Ashen Lychgate` |
| Overworld | `Cinder Parish` (grind, travel, respawning packs) |
| Dungeon | `Bellcrypt` (instance rooms, key, boss) |
| Session length | **20–45 min** first boss kill; unlimited grind |
| Progression | **XP levels 1–20** + gear (see PROGRESSION.md) |
| Skill tree | **None** — fixed kit; passive skill ranks at levels 5/10/15/20 |
| Multiplayer | **None** |
| Platform | **Desktop web** (keyboard + mouse) |
| Engine/SDK | **Anvil** (Phaser 3 + TypeScript + Vite) |
| Art | **Grok Imagine** multi-frame sets + room/overworld plates + cinematics |
| Difficulty | **One** difficulty |
| Permadeath | **No** — death → town; lose **30% gold**; **no XP loss** |
| Crafting | **None** |
| Rarity | common / magic / rare (uniques **not** in v1) |

---

## 3. Fantasy & world

### World
After the **Last Peal**, the cathedral bells rang once for every living soul in the parish — then the parish stopped answering. The **Cinder Parish** lanes still crawl with the called-back dead. Beneath the **Ashen Lychgate**, **Bellcrypt** holds the carillon and its master.

### Player
A **Gravewarden**: oath-bound to cut down what the bells call back. Fights with a **warden blade** and **ash-runes**.

### Antagonist
**The Bellwarden** — once the cathedral’s sexton, now a colossal ash-and-bronze figure fused to a portable death-bell. Phase 2 shatters the mute and rings the **Hungering Peal**.

### Faction flavor (no faction system)
- Dead parishioners → trash  
- Crypt honor guard → elite  
- Bellwarden → boss  

---

## 4. Core loop (Diablo-style)

```
Title
  → Town (Ashen Lychgate): vendor, heal, stash-in-bag, enter world
       → Overworld (Cinder Parish): grind packs (respawn), chests, XP, loot
            ⇄ return to town anytime via north gate
            → Bellcrypt mouth → Dungeon instance
                 → rooms (stay cleared this run), key, boss
                 → portal / death → town
       → (repeat grind ↔ dungeon until ready)
  → Kill Bellwarden → victory cinematic
```

**Win condition:** defeat Bellwarden once (can still free-play after).  
**Progress:** level + XP + gear + gold saved; overworld packs always farmable; dungeon run resets on each entry from mouth.

---

## 5. Controls (final)

| Input | Action |
|-------|--------|
| W A S D | Move |
| Mouse position | Aim / face |
| LMB | **Rite Slash** (basic attack) |
| Q | **Cinder Nova** (Skill 1) |
| E | **Grave Veil** (Skill 2) |
| Space | **Ash Step** (dodge, i-frames) |
| 1 | Use health potion |
| I or Tab | Inventory |
| Esc | Pause |
| F (cinematics) | Skip cinematic |
| MMB or C | Optional: hold to show cursor-only aim lock — **not required v1** |

---

## 6. Player kit (summary)

Full numbers: `COMBAT_BALANCE.md`. Full anims/FX: `CONTENT_BIBLE.md`.

| ID | Name | Input | Role |
|----|------|-------|------|
| `basic_rite_slash` | Rite Slash | LMB | Melee arc, primary DPS |
| `skill_cinder_nova` | Cinder Nova | Q | Point-blank AoE burst |
| `skill_grave_veil` | Grave Veil | E | Brief damage shield + minor slow aura |
| `dodge_ash_step` | Ash Step | Space | Short dash + i-frames |

Resources: **HP** + **potion charges**. Skills use **cooldowns only** (no mana bar in v1).

---

## 7. Enemy roster (locked IDs)

| Content ID | Name | Role |
|------------|------|------|
| `scuttler` | Bone Scuttler | Trash melee |
| `wretch` | Ashbow Wretch | Trash ranged |
| `crypt_guard` | Crypt Guard | Elite |
| `bellwarden` | The Bellwarden | Boss |

No other enemy types in v1.

---

## 8. World structure

### Town: Ashen Lychgate
- Static scene, one background plate  
- **Vendor:** Sister Marrow (potions, gear, sell junk)  
- **South / main gate** → **Cinder Parish** overworld (not straight into dungeon)  
- Full heal on town enter  
- No side quests  

### Overworld: Cinder Parish
- Continuous open map, camera follow  
- Respawning enemy packs for **grind**  
- Chests, rest shrine, POIs  
- **Crypt mouth** → Bellcrypt R0  
- Details: `OVERWORLD_CINDER_PARISH.md`  

### Dungeon: Bellcrypt
- Instanced room graph (clears persist per run only)  
- Crypt Key → boss door → Bellwarden  
- Details: `DUNGEON_BELLCRYPT.md`  

### Progression
- Levels 1–20, XP from all kills, gear power  
- Details: `PROGRESSION.md`

---

## 9. Progression & loot (summary)

- **Level 1–20** from XP (kills in overworld + dungeon)  
- Per level: HP, damage, armor; full heal on ding; potion cap milestones  
- Slots: **Weapon**, **Armor**, **Potion stack**  
- Stats on gear: Damage, Max HP, Armor, Move Speed (items doc)  
- Gold: drops + sell; potions from vendor  
- Inventory: **16 bag slots** + 2 equip + potion slot  
- HUD: HP + **XP bar** + level  

---

## 10. (Reserved numbering — dungeon lives in §8 + DUNGEON doc)

---

## 11. UI (code + decorative art)

- HP bar, **XP bar**, **level number**, potion count, gold  
- Skill icons + cooldown sweeps (Q/E/Space)  
- Boss HP bar in boss room  
- Inventory panel with compare tooltips  
- Damage numbers (toggle in pause: default **on**)  
- Overworld: simple minimap dots (player, town gate, crypt mouth)  
- Dungeon: room progress `Cleared X / Y` optional  
- Pause, death, victory screens  
- Level-up banner + FX

---

## 12. Cinematics

| ID | When |
|----|------|
| `cine_title` | Boot |
| `cine_boss_intro` | First enter boss arena |
| `cine_victory` | Bellwarden dead |
| `cine_death` | Player death |

All skippable with F / click after 0.5s.

---

## 13. Death & save

- Death: play death anim + cinematic → **Ashen Lychgate**, HP full, **lose 30% gold**, **keep all items**  
- Save (`localStorage`): equipped gear, bag, potions, gold, `bossDefeated` flag, settings  
- Entering dungeon: instance fresh spawns; does not wipe inventory  

---

## 14. Non-goals (v1)

Multiplayer, seasons, crafting, skill tree, uniques, click-to-move, controller, mobile, second biome, mounts, pets, dialogue trees beyond vendor one-liner, 8-dir animation sheets.

---

## 15. Acceptance criteria (slice done)

1. Title → town → **overworld** → Bellcrypt → boss → victory  
2. Can **grind** in Cinder Parish: kill pack → wait/respawn → XP gains → level up  
3. XP bar + level-up FX; stats increase on level  
4. Every enemy type fought (open + dungeon); boss p1/p2  
5. Crypt Key → boss door flow  
6. Gear upgrade from overworld or dungeon drops  
7. Death → town; gold penalty; **XP kept**  
8. All **Required** `ASSET_CHECKLIST.md` rows done  
9. `npm run dev` playable end-to-end

---

## 16. Document change policy

Changing enemy count, skills, room graph, or rarity rules requires updating **this GDD + CONTENT_BIBLE + ASSET_CHECKLIST + affected balance/dungeon docs** in the same change. No silent scope drift.
