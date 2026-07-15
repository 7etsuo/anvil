# Gravewake — Master Plan

**Title:** Gravewake  
**Genre:** Diablo-like top-down 2D ARPG  
**Art:** Grok Imagine (multi-frame + plates + video)  
**Engine/SDK:** **Anvil** (`../../../anvil/`) — separate framework tree  
**Framework plan:** [`../../../anvil/docs/design/README.md`](../../../anvil/docs/design/README.md)

---

## Documentation map (complete for v1 slice)

| Doc | Contents |
|-----|----------|
| [GDD.md](./GDD.md) | Locked product decisions, loop, controls |
| [CONTENT_BIBLE.md](./CONTENT_BIBLE.md) | Every actor, ability, anim state, FX ID |
| [OVERWORLD_CINDER_PARISH.md](./OVERWORLD_CINDER_PARISH.md) | Open world grind map + packs |
| [DUNGEON_BELLCRYPT.md](./DUNGEON_BELLCRYPT.md) | 12 rooms, spawns, key/door, topology |
| [PROGRESSION.md](./PROGRESSION.md) | XP, levels 1–20, rewards |
| [TILES_AND_ENV.md](./TILES_AND_ENV.md) | Plates, logical tiles, every prop |
| [ITEMS_AND_LOOT.md](./ITEMS_AND_LOOT.md) | Every item, affix, drop table, vendor |
| [COMBAT_BALANCE.md](./COMBAT_BALANCE.md) | HP, damage, cooldowns, formulas |
| [SYSTEMS.md](./SYSTEMS.md) | Scenes, modules, save, layers |
| [AUDIO.md](./AUDIO.md) | Every music/SFX cue ID |
| [ASSET_PIPELINE.md](./ASSET_PIPELINE.md) | Imagine process |
| [ASSET_CHECKLIST.md](./ASSET_CHECKLIST.md) | Every file to produce |

If it is not in these docs, it is **out of slice** until docs change.

---

## Build order (do not skip)

```
1. Docs freeze          ← YOU ARE HERE (docs written)
2. Scaffold project     Vite + Phaser + folders
3. Greybox playable     town + overworld packs + dungeon rooms
4. Progression          XP/level/HUD in greybox
5. Pack 0 style bible   Imagine lock
6. Packs A–H art        checklist order
7. Pack J audio         placeholders fine
8. Pack I wire QA
9. Balance pass
10. Ship vertical slice
```

**Start coding only after** you accept this plan; first code milestone = greybox, not art dump.

---

## Vertical slice definition of done

See GDD §15 + ASSET_CHECKLIST Pack I.

---

## Phases (detail)

### Phase 0 — Docs
- [x] Full design suite + asset checklist with real names

### Phase 1 — Scaffold + greybox
- [ ] Repo package, Phaser boot
- [ ] Player move/attack/skills/dodge with rects
- [ ] Town → Overworld → Dungeon scene flow
- [ ] `cinder_parish.json` packs + respawn
- [ ] XP / level-up system
- [ ] Enemies AI stubs with rects
- [ ] `bellcrypt_01.json` all rooms
- [ ] Vendor + inventory logic
- [ ] Boss phases without final art
- [ ] Save/load (level, xp, gear)

### Phase 2 — Style bible (Imagine)
- [ ] Pack 0

### Phase 3 — Production art
- [ ] Packs A–H per checklist

### Phase 4 — Audio + juice
- [ ] Pack J + screen shake, numbers

### Phase 5 — Polish ship
- [ ] Balance, bugs, README playtest script

---

## Risks

| Risk | Mitigation |
|------|------------|
| Scope creep | Roster fixed: 3 enemies + 1 boss |
| Anim identity drift | Base→edit only |
| Art before fun | Greybox first |
| Doc drift | Change GDD+bible+checklist together |

---

## Immediate next action (when you say go)

Scaffold Phaser project + implement greybox against locked JSON content — **no Imagine mass-gen yet**.
