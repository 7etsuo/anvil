# Spec: Core RPG systems (inventory / equip / stats / loot / zones)

**Package:** `@anvil/core` → `src/rpg/`  
**Status:** Engine-level (games-agnostic). Games supply item defs + content.

## Modules

| API | Role |
|-----|------|
| `CharacterSheet` | level, xp, gold, baseStats, inventory, equipment, `finalStats()` |
| `Inventory` | stacks, capacity, add/remove |
| `Equipment` | slot → item uid, equip/unequip, gear mods |
| `computeFinalStats` / `applyArmor` | stat aggregation + mitigation |
| `spawnGroundLoot` / `tryPickupNearest` | world loot entities (`tags: loot, pickup`) |
| `ZoneGraph` | multi-room graph, `travel`, `requireClear`, save state |

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
