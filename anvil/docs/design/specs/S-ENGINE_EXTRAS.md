# Spec: implemented engine extensions

This file maps implemented reusable systems beyond the original M1–M8
baseline. The exhaustive symbol authority is each package's public `src/index.ts`.

## Core system groups

| Group | Implemented surfaces |
|-------|----------------------|
| Character/RPG | Inventory, equipment, character sheet, stat breakdown, itemization, loot, zone graph, run-state save |
| Combat | Damage types/resists, combat events/feel, statuses, projectiles, threat, elite affixes, death |
| Abilities/progression | AbilitySystem, ResourcePool, SkillTree, Wallet |
| Economy | Vendor, CraftingSystem, sockets, reforging |
| World/navigation | A*, MapBuilder/procgen, TileMap, SpatialHash, interactables, trigger volumes, minimap fog, LOS/cover |
| Actor behavior | AI helpers, ActorAnimController |
| Presentation | UiKit, ViewCamera, particles, float text, screen transitions, sprite atlases |
| Audio | AudioSystem, combat-event wiring, spatial audio, bundled audio catalog |
| Content/extension | Content validators, PluginRegistry, package manifest helpers |
| Agent/network support | Semantic ACI/diff/replay, InputPredictor/top-down move helper |

These services are exported from `@anvil/core`. Frequently used ones are also
first-class on `GameHandle`/`SceneContext`; library-style helpers are imported
and instantiated/called by the consumer.

The bundled audio catalog contains 421 CC0 files. Sprite catalog APIs exist,
but `anvil/assets/sprites` currently contains no sprite assets/catalog.

## Renderer and desktop

`@anvil/render-phaser` contains the real Phaser 3 dependency and implements the
render facade. Core also includes `NullRenderFacade` and
`CanvasRenderFacade`. No other package may import Phaser.

`@anvil/desktop` is an Electron main process that loads an already-built
`dist-web/index.html` selected through `ANVIL_GAME_DIST` (or its configured
detection behavior).

## Networking

- `@anvil/genre-net` implements loopback/memory/raw-WebSocket experimental
  replication. Its `NetServer` is a minimal unauthenticated relay.
- `@anvil/net-colyseus` implements the supported authoritative room adapter,
  input validation/rate limits, reconnects, health/metrics, and optional Redis
  deployment.

Neither package is a complete MMO/account/economy/anti-cheat platform.

## Authoring and ARPG packages

`@anvil/authoring` implements schema-v2 compilation, migration, capabilities,
canonical hashing, and the Vite IR bridge. `@anvil/genre-arpg` implements IR
materialization, finite campaign rules, and restricted title sessions.

Their libraries are implemented, but generic CLI commands, schema-v2 default
scaffolds, ARPG loader/starter, and complete routine test/CI integration are
pending. See S-AUTHORING, S-ARPG, and the gap register.
