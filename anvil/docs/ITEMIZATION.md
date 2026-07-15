# Anvil itemization (ARPG gear math)

Proper engine-level model for **any** equippable item (weapons, armor, jewelry)—not armor-only.

## Concepts

| Term | Meaning |
|------|---------|
| **ItemDef.stats** | Base template stats at **base item level** (usually 1) |
| **itemLevel (iLvl)** | Power of a *rolled instance* |
| **reqLevel** | Character level required to equip (`charLevel ≥ reqLevel`) |
| **rolledStats** | Final stats on the instance after budget + quality |

Higher character levels **can always wear lower** req gear.

## Formulas

### Level power (primary stats)

\[
\text{power}(L) = 1 + g \cdot (L - L_{\text{base}})
\]

Default \( g = 0.12 \) (12% per level). Linear growth keeps early gear usable longer while still rewarding progression.

### Instance stat

\[
\text{stat} = \text{base} \cdot \text{power}(L) \cdot S_{\text{slot}} \cdot R_{\text{rarity}} \cdot Q
\]

- \( S_{\text{slot}} \): weapon \(>\) chest \(>\) head \(>\) jewelry (budget coefficients)
- \( R_{\text{rarity}} \): common \(0.9\), magic \(1.0\), rare \(1.2\), unique \(1.4\)
- \( Q \): quality roll in \([1-v, 1+v]\), default \( v = 0.12 \) (±12%)

Crit chance/mult use **soft additive** growth so they do not explode.

### Drop item level

\[
\text{iLvl} = \max(1,\ \max(\text{cLvl}, \text{zoneLevel}) + U\{-2..+2\})
\]

### Required level

Default: \(\text{reqLevel} = \text{iLvl}\) (strict). Soft mode: \(\lfloor \text{iLvl} \cdot 0.85 \rfloor\).

## API

```ts
import {
  rollItemInstance,
  rollDropItemLevel,
  scaleStatsForItemLevel,
  canEquipAtLevel,
  DEFAULT_ITEMIZATION,
} from "@anvil/core";

const inst = rollItemInstance(def, 10); // iLvl 10
// inst.rolledStats, inst.reqLevel, inst.minStats/maxStats for tooltips
sheet.pickup(def.id, 1, {
  rolledStats: inst.rolledStats,
  itemLevel: inst.itemLevel,
  reqLevel: inst.reqLevel,
});
sheet.equip(uid); // fails with error "level_req" if cLvl < reqLevel
```

## Content authoring

Define **level-1** (or `itemLevel` on def) base stats only:

```json
{
  "id": "ash_mail",
  "slot": "chest",
  "rarity": "magic",
  "stats": { "armor": 6, "maxHp": 20 }
}
```

Do not author every level by hand—the engine scales instances.

## Design refs

- Diablo: iLvl gates affix/power; monster/area level drives drop iLvl  
- Diablo 4: item power scales base armor/DPS; affix ranges by breakpoints  
- WoW: item level ≈ stat budget; slot modifiers  
- PoE: iLvl gates mod tiers (we use continuous budget + quality as a simpler engine default)

Tune via `DEFAULT_ITEMIZATION` or `rollItemInstance(..., { config: { growthPerLevel: 0.1 } })`.
