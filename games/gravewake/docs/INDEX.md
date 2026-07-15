# Gravewake — Documentation Index

**Game:** Gravewake  
**Engine/SDK:** [Anvil](../../../anvil/README.md) (repo `anvil/` — not mixed into this game)

**Read order:**

1. **GDD.md** — product (town → overworld → dungeon)  
2. **PLAN.md** — game build order (uses Anvil)  
3. **PROGRESSION.md** — XP & levels 1–20  
4. **OVERWORLD_CINDER_PARISH.md** — open grind zone  
5. **DUNGEON_BELLCRYPT.md** — instance dungeon  
6. **CONTENT_BIBLE.md** — entities & abilities  
7. **TILES_AND_ENV.md** — plates & props  
8. **ITEMS_AND_LOOT.md** — gear & drops  
9. **COMBAT_BALANCE.md** — numbers  
10. **SYSTEMS.md** — game systems (to map onto Anvil)  
11. **AUDIO.md** — sound cues  
12. **ASSET_PIPELINE.md** — Imagine workflow (game-level)  
13. **ASSET_CHECKLIST.md** — every file  

## Loop

**Ashen Lychgate** → **Cinder Parish** → **Bellcrypt** → **Bellwarden**. Levels + loot.

## Monorepo

```text
x-game/
  anvil/              # framework only
  games/
    gravewake/        # this game (parked)
```
