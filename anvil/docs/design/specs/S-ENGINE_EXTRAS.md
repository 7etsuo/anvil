# Spec: Engine systems (complete surface)

Everything here is **implemented code**, not a design wish-list.

## `@anvil/core`

| System | Module | What it does |
|--------|--------|----------------|
| RPG | `rpg/*` | Inventory, equipment, stats, loot, zones, character save |
| UI | `ui/UiKit.ts` | Canvas panels, buttons, inventory grid, tooltips |
| Particles | `fx/ParticleSystem.ts` | Burst / update / draw |
| Combat feel | `combat/CombatFeel.ts` | Hitstun, knockback, i-frames |
| Pathfinding | `path/astar.ts` | Grid A*, walls→grid |
| AI | `ai/AiHelpers.ts` | Chase, leash, path follow |
| Quests | `quest/QuestSystem.ts` | Steps, flags, counters |
| Audio | `audio/AudioSystem.ts` | Cues, master/music/sfx/ui, music loop |
| Audio catalog | `audio/AudioCatalog.ts` | Bundled CC0 library: list/filter, suggested cues |
| Combat audio | `audio/wireCombatAudio.ts` | Event bus → hit/kill/heal/UI/zone music |
| Damage | `combat/Damage.ts` | Types + armor + resists |
| Statuses | `combat/StatusSystem.ts` | Buffs/debuffs/DoT; Kernel.statuses |
| Projectiles | `combat/ProjectileSystem.ts` | Pool, pierce/chain, hit query |
| Threat | `combat/ThreatTable.ts` | Aggro table + decay |
| Elites | `combat/EliteAffixes.ts` | Data-driven pack affixes |
| Death | `combat/DeathSystem.ts` | Dying → corpse → removed / revive |
| Resources | `rpg/ResourcePool.ts` | Mana/stamina spend/regen |
| Skill tree | `rpg/SkillTree.ts` | Nodes, points, prereqs |
| Wallet | `rpg/Wallet.ts` | Multi-currency |
| Interactables | `world/Interactables.ts` | Chests/shrines/levers/doors |
| Triggers | `world/Triggers.ts` | Enter/exit volumes |
| Fog | `world/MinimapFog.ts` | Reveal + fog of war grid |
| LOS | `world/LineOfSight.ts` | Bresenham LOS + cover |
| Vendor | `economy/Vendor.ts` | Buy/sell |
| Crafting | `economy/Crafting.ts` | Recipes, sockets, reforge |
| Float text | `fx/FloatText.ts` | Damage numbers |
| Transitions | `fx/ScreenTransition.ts` | Fade in/out |
| Spatial audio | `audio/SpatialAudio.ts` | Distance volume |
| Atlas | `assets/SpriteAtlas.ts` | Sheet frames + anim tick |
| Prediction | `net/InputPrediction.ts` | Client predict + reconcile |
| Input | `input/InputMap.ts` | Keys, rebind, gamepad |
| Content | `content/validateContent.ts` | Item/loot validation + roll |
| Plugins | `plugins/PluginRegistry.ts` | Register / update / dispose |
| Map builder | `map/MapBuilder.ts` | Programmatic maps |
| Package manifest | `platform/packageGame.ts` | JSON manifest for desktop |

## `@anvil/render-phaser`

**Real Phaser 3 dependency.** `PhaserRenderFacade` constructs a `Phaser.Game` and draws quads/sprites/text through Phaser Graphics/Images. Headless Node without DOM no-ops safely.

## `@anvil/genre-net`

| Piece | What |
|-------|------|
| `LoopbackTransport` | In-process 2-peer |
| `MemoryHub` | In-process N-peer |
| **`NetServer`** | **Real WebSocket relay server (Node `ws`)** |
| **`WsClientTransport`** | **Connects to NetServer from Node or browser** |

## `@anvil/desktop`

**Real Electron main process** (`main.cjs`) that loads a game `dist-web/index.html`.

```bash
# build game web output first, then:
cd packages/desktop && pnpm install
ANVIL_GAME_DIST=/path/to/game/dist-web pnpm start
```
