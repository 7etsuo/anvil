# Gravewake documentation index

Gravewake is an active schema-v2 ARPG on Anvil. This directory contains both
current operational documentation and the historical vertical-slice design.

## Current operational references

Read these when changing or testing the shipped game:

1. [`../README.md`](../README.md) — run commands, controls, world, limitations
2. [`PLAN.md`](./PLAN.md) — implementation status and remaining work
3. [`SYSTEMS.md`](./SYSTEMS.md) — real architecture and engine/title ownership
4. [`PROGRESSION.md`](./PROGRESSION.md) — current authored/runtime numbers
5. [`../game.spec.yaml`](../game.spec.yaml) — executable player-experience intent
6. [`../content/`](../content/) and [`../src/`](../src/) — authoritative data and behavior

For engine APIs, use [`../../../anvil/ENGINE.md`](../../../anvil/ENGINE.md),
[`S-AUTHORING`](../../../anvil/docs/design/specs/S-AUTHORING.md), and
[`S-ARPG`](../../../anvil/docs/design/specs/S-ARPG.md).

## Historical design archive

These documents describe the original one-overworld/one-dungeon vertical
slice. They are retained for creative provenance and possible future content,
but they are not the current runtime contract:

- [`GDD.md`](./GDD.md)
- [`CONTENT_BIBLE.md`](./CONTENT_BIBLE.md)
- [`OVERWORLD_CINDER_PARISH.md`](./OVERWORLD_CINDER_PARISH.md)
- [`DUNGEON_BELLCRYPT.md`](./DUNGEON_BELLCRYPT.md)
- [`TILES_AND_ENV.md`](./TILES_AND_ENV.md)
- [`ITEMS_AND_LOOT.md`](./ITEMS_AND_LOOT.md)
- [`COMBAT_BALANCE.md`](./COMBAT_BALANCE.md)
- [`AUDIO.md`](./AUDIO.md)
- [`ASSET_PIPELINE.md`](./ASSET_PIPELINE.md)
- [`ASSET_CHECKLIST.md`](./ASSET_CHECKLIST.md)

Do not copy their Cinder Parish naming, level-20 cap, Q/E/Space kit, fixed room
graph, cinematic promises, file inventory, or balance values into current code
without a new product decision and synchronized data/spec change.

## Current loop

```text
Ashen Lychgate
      ↓
Ashen Wastes
  ├─ Bellcrypt
  ├─ Howling Catacombs
  └─ Bonekeep
      ↓
repeat with increasing level, kills, bosses, loot, and threat
```
