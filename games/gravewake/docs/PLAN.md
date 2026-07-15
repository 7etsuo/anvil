# Gravewake — Master Plan

**Title:** Gravewake  
**Genre:** Diablo-like top-down 2D ARPG  
**Art:** Grok Imagine (multi-frame + plates + video)  
**Engine/SDK:** **Anvil** (`../../../anvil/`) — separate framework tree  
**Framework plan:** [`../../../anvil/docs/design/README.md`](../../../anvil/docs/design/README.md)

**Runtime status:** M9 playable slice implemented. This file now tracks the remaining polish pass; older detailed design docs remain useful intent, but [`../README.md`](../README.md), `src/`, and `content/` describe the current build.

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
1. Docs freeze          ✓
2. Anvil/Vite scaffold  ✓
3. Playable world loop  ✓
4. Progression/economy  ✓
5. Production art       ✓
6. Audio + combat juice ✓
7. Automated gates      ✓ typecheck, lint, validate, scenarios, web build
8. Balance/playtest     ← CURRENT
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
- [x] Anvil game package + Vite browser host
- [x] Mouse/WASD movement, pathing, attacks, and skills
- [x] Town → overworld → three dungeon flow
- [x] Timed packs + respawn in `content/areas/wastes.json`
- [x] XP, levels, skill points, and HUD
- [x] Melee/ranged enemy AI and elite affixes
- [x] Procedural dungeon layouts via Anvil generators
- [x] Vendor, inventory, equipment, crafting, and sockets
- [x] Three boss encounters and milestone handling
- [x] Run-state save/load (level, XP, gear, area, position, flags)

### Phase 2 — Style bible (Imagine)
- [x] Actor/environment/gear visual identity established

### Phase 3 — Production art
- [x] Current actor, environment, gear, portal, and loot set wired

### Phase 4 — Audio + juice
- [x] Bundled audio cues, screen shake, particles, and floating numbers

### Phase 5 — Polish ship
- [ ] Final balance/playtest pass and browser interaction QA

---

## Risks

| Risk | Mitigation |
|------|------------|
| Scope creep | Current roster/content are data-driven; new reusable mechanics must enter Anvil first |
| Anim identity drift | Base→edit only |
| Art before fun | Greybox first |
| Doc drift | Change GDD+bible+checklist together |

---

## Immediate next action

Run the full quality gates, then playtest the complete economy/combat loop and tune content JSON rather than adding title-only engine workarounds.
