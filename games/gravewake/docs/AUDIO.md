# Gravewake — Audio Design

v1 may ship with **placeholder/free** SFX. Every **cue ID** is listed so implementation never invents silent gaps.  
Replace files later without code changes.

Folder: `public/assets/audio/`

---

## 1. Music

| Cue ID | File | Where | Loop |
|--------|------|-------|------|
| `music_title` | `audio/music_title.ogg` | Title | Yes |
| `music_town` | `audio/music_town.ogg` | Town | Yes |
| `music_overworld` | `audio/music_overworld.ogg` | Cinder Parish | Yes |
| `music_dungeon` | `audio/music_dungeon.ogg` | Bellcrypt | Yes |
| `music_boss` | `audio/music_boss.ogg` | R11 | Yes |
| `music_victory` | `audio/music_victory.ogg` | Victory | No / stinger |

---

## 2. Player SFX

| Cue ID | File | Trigger |
|--------|------|---------|
| `sfx_footstep` | `audio/sfx_footstep.ogg` | Walk cycle every 2 frames (light) |
| `sfx_rite_slash` | `audio/sfx_rite_slash.ogg` | Basic attack swing |
| `sfx_cinder_nova` | `audio/sfx_cinder_nova.ogg` | Skill 1 |
| `sfx_grave_veil` | `audio/sfx_grave_veil.ogg` | Skill 2 |
| `sfx_ash_step` | `audio/sfx_ash_step.ogg` | Dodge |
| `sfx_player_hit` | `audio/sfx_player_hit.ogg` | Player damaged |
| `sfx_player_death` | `audio/sfx_player_death.ogg` | Death |
| `sfx_potion` | `audio/sfx_potion.ogg` | Heal |
| `sfx_levelup` | `audio/sfx_levelup.ogg` | Level up |
| `sfx_xp_tick` | `audio/sfx_xp_tick.ogg` | Optional light XP gain |
| `sfx_ui_open` | `audio/sfx_ui_open.ogg` | Inventory open |
| `sfx_ui_click` | `audio/sfx_ui_click.ogg` | Buttons |
| `sfx_equip` | `audio/sfx_equip.ogg` | Equip item |
| `sfx_pickup_gold` | `audio/sfx_pickup_gold.ogg` | Gold |
| `sfx_pickup_item` | `audio/sfx_pickup_item.ogg` | Item |
| `sfx_deny` | `audio/sfx_deny.ogg` | Cannot open door / bag full |

---

## 3. Enemy SFX

| Cue ID | File | Trigger |
|--------|------|---------|
| `sfx_scuttler_attack` | `audio/sfx_scuttler_attack.ogg` | Swipe |
| `sfx_scuttler_death` | `audio/sfx_scuttler_death.ogg` | Death |
| `sfx_wretch_shot` | `audio/sfx_wretch_shot.ogg` | Arrow fire |
| `sfx_arrow_hit` | `audio/sfx_arrow_hit.ogg` | Arrow impact |
| `sfx_guard_cleave` | `audio/sfx_guard_cleave.ogg` | Cleave |
| `sfx_guard_bash` | `audio/sfx_guard_bash.ogg` | Bash |
| `sfx_guard_slam` | `audio/sfx_guard_slam.ogg` | Slam |
| `sfx_guard_death` | `audio/sfx_guard_death.ogg` | Elite death |
| `sfx_boss_swing` | `audio/sfx_boss_swing.ogg` | Swing |
| `sfx_boss_hammer` | `audio/sfx_boss_hammer.ogg` | Hammer |
| `sfx_boss_peal` | `audio/sfx_boss_peal.ogg` | Hungering Peal |
| `sfx_boss_summon` | `audio/sfx_boss_summon.ogg` | Summon |
| `sfx_boss_phase` | `audio/sfx_boss_phase.ogg` | Phase 2 |
| `sfx_boss_death` | `audio/sfx_boss_death.ogg` | Boss death |
| `sfx_enemy_hit` | `audio/sfx_enemy_hit.ogg` | Generic enemy hurt |

---

## 4. World SFX

| Cue ID | File | Trigger |
|--------|------|---------|
| `sfx_chest_open` | `audio/sfx_chest_open.ogg` | Chest |
| `sfx_door_open` | `audio/sfx_door_open.ogg` | Boss door |
| `sfx_portal` | `audio/sfx_portal.ogg` | Portal use |
| `sfx_barrel_break` | `audio/sfx_barrel_break.ogg` | Barrel |
| `sfx_vendor` | `audio/sfx_vendor.ogg` | Open shop |

---

## 5. Implementation notes

- Missing file: fail soft (no throw)  
- Bus: Music vs SFX volume; master mute in pause  
- Duck music 30% during cinematics optional  

## 6. Placeholder policy

Until custom audio exists, use a free CC0 pack mapped 1:1 to cue IDs.  
Checklist audio section can be placeholders marked `[~]` with note “temp”.
