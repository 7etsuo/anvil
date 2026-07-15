# Itemization (generic gear progression)

Engine module: `@anvil/core` → `rpg/itemization.ts`  
**One implementation** — no parallel item-level helpers.

Applies to **any equippable item** (weapons, armor, jewelry, tools…), not one genre.

## Why this lives in the engine

Titles should author **base stats once**. The engine owns:

- instance **item level**
- **stat budget** scaling
- **quality** rolls
- **required level** for equip
- optional **drop level** suggestion

Games that do not want this can ignore it and pass flat `rolledStats` / skip `reqLevel`.

## Data model

| Field | Where | Meaning |
|-------|--------|---------|
| `ItemDef.stats` | content JSON | Base stats at `ItemDef.itemLevel` (default 1) |
| `ItemDef.slot` / `rarity` | content | Slot + rarity budget coefficients |
| `ItemStack.itemLevel` | runtime instance | Power level of this drop |
| `ItemStack.reqLevel` | runtime | Min character level to equip |
| `ItemStack.rolledStats` | runtime | Final stats (prefer over def.stats when set) |

## Default math (override with `ItemizationConfig`)

```
power(L)  = 1 + growthPerLevel * (L - baseLevel)     // default growth 0.12
quality   ∈ [1 − variance, 1 + variance]               // default ±0.12
stat      = base × power × slotMul × rarityMul × quality
reqLevel  = itemLevel                                  // soft mode optional
```

Crit chance / crit mult use soft additive growth so they do not explode.

**Equip rule:** `characterLevel >= reqLevel` (higher levels may wear lower gear).

**Suggested drop level:** `max(cLvl, zoneLevel) + U{-jitter..+jitter}`.

## API (public)

```ts
import {
  DEFAULT_ITEMIZATION,
  rollItemInstance,
  rollDropItemLevel,
  scaleStatsForItemLevel,
  canEquipAtLevel,
  itemPowerScore,
  dropFromTable,
} from "@anvil/core";

// Full instance
const inst = rollItemInstance(def, 10);
// inst: { itemLevel, reqLevel, rolledStats, minStats, maxStats }

// Or only scale
const stats = scaleStatsForItemLevel(def.stats, 10, def, {
  config: { growthPerLevel: 0.08 }, // custom curve
  fixedQuality: 1,                  // no RNG
});

// Drops (loot policy uses the same math)
dropFromTable(world, x, y, table, {
  itemDefs,
  characterLevel: 5,
  zoneLevel: 7,
});
```

## Ownership (no overlap)

| Concern | Module |
|---------|--------|
| Budget / level / quality math | `itemization.ts` only |
| Equip slot map + level gate | `Equipment.ts` calls `canEquipAtLevel` |
| Inventory rows | `Inventory.ts` stores fields |
| Sheet helpers | `CharacterSheet.pickupLeveled` / `equip` |
| Ground piles | `Loot.ts` carries fields on entity |
| Weighted tables + drop roll | `LootPolicy.dropFromTable` |

Do **not** reimplement scaling inside games. Call `rollItemInstance` / `dropFromTable`.

## Tuning without forking

```ts
rollItemInstance(def, level, {
  config: {
    growthPerLevel: 0.05,      // flatter progression
    variance: 0.05,            // tighter rolls
    rarityMul: { ...DEFAULT_ITEMIZATION.rarityMul, unique: 2.0 },
  },
  softReq: true,               // reqLevel = floor(ilvl * 0.85)
});
```
