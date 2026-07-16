# Spec: Core RPG systems (inventory / equip / stats / loot / zones)

**Package:** `@anvil/core` → `src/rpg/`  
**Status:** Engine-level (games-agnostic). Games supply item defs + content.

## Modules

| API | Role |
|-----|------|
| `CharacterSheet` | level, xp, gold, baseStats, inventory, equipment, `finalStats()`, serializable `inventoryView()` |
| `Inventory` | owned stacks, capacity-limited `bag()`, equipped-capacity accounting, add/remove |
| `Equipment` | slot → item uid, equip/unequip, gear mods |
| `computeFinalStats` / `applyArmor` | stat aggregation + mitigation |
| `spawnGroundLoot` / `tryPickupNearest` | world loot entities (`tags: loot, pickup`) |
| `ZoneGraph` | multi-room graph, `travel`, `requireClear`, save state |
| Itemization helpers | item level, rolled stats, equip requirement, power score, drop level |
| `dropFromTable` | weighted ground drops using the shared itemization policy |
| `SkillTree`, `Wallet`, `ResourcePool` | progression choices, currencies, mana/stamina-like pools |
| `Vendor`, `CraftingSystem`, `socketGem` | reusable economy/crafting operations |
| Run-state helpers | lightweight character + area/position + flags browser continuation |

## Save (v2)

`SaveGame` may include:

```ts
character?: CharacterSaveBlob
zones?: ZoneGraphState
```

Register with:

```ts
setCharacterSaveHooks(handle, () => sheet.toJSON(), (d) => sheet.loadJSON(d))
setZoneSaveHooks(handle, () => graph.toJSON(), (d) => graph.loadJSON(d))
```

## Item def (content JSON)

```json
{
  "id": "rusty_sword",
  "name": "Rusty Sword",
  "slot": "weapon",
  "stats": { "damage": 5 },
  "rarity": "common"
}
```

## Character inventory view

`CharacterSheet.inventoryView()` is the renderer/agent contract. It always
returns every paper-doll slot plus a stable, null-padded backpack grid with
`capacity`, `used`, and `free`. Equipped items remain owned by uid for save
compatibility, but do not consume backpack capacity.

## Ground loot entity

```ts
data.loot = { defId, qty, rolledStats?, gold? }
```

## Zone graph

```ts
new ZoneGraph({
  start: "town",
  nodes: [
    { id: "town", exits: { east: "dungeon" } },
    { id: "dungeon", exits: { west: "town", east: "boss" }, requireClear: ["east"] },
  ],
})
```

## Item levels and run-state saves

Use the shared helpers in [`../../ITEMIZATION.md`](../../ITEMIZATION.md)
instead of scaling gear in a title. `CharacterSheet.pickupLeveled`,
`rollItemInstance`, `canEquipAtLevel`, and `dropFromTable` keep item power and
requirements consistent.

For ARPG continuation where a full entity snapshot is undesirable, use
`buildRunState` plus serialization/local-storage helpers. `RunStateV1` stores
the character blob, area and position, seed, and title flags. It is separate
from full `SaveGame` v1/v2.
