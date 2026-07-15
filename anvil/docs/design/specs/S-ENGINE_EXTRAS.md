# Spec: Engine extras (post-RPG completeness pass)

All live under `@anvil/core` unless noted.

| System | Path | Purpose |
|--------|------|---------|
| UI kit | `ui/UiKit.ts` | Panels, buttons, inventory grid, tooltips |
| Particles | `fx/ParticleSystem.ts` | Bursts for combat/loot |
| Combat feel | `combat/CombatFeel.ts` | Hitstun, knockback, i-frames |
| A* | `path/astar.ts` | Grid pathfinding + `wallsToGrid` |
| AI | `ai/AiHelpers.ts` | Chase/leash + path follow |
| Quests | `quest/QuestSystem.ts` | Steps, flags, counts, rewards hooks |
| Audio bus | `audio/AudioSystem.ts` | master/music/sfx/ui volumes, music loop |
| Input | `input/InputMap.ts` | Rebind, gamepad buttons/axes |
| Content | `content/validateContent.ts` | Item/loot validators + roll |
| Plugins | `plugins/PluginRegistry.ts` | Register/update/dispose plugins |
| Map builder | `map/MapBuilder.ts` | Programmatic maps / editor seed |
| Packaging | `platform/packageGame.ts` | Manifest + Electron main template |
| Net hub | `@anvil/genre-net` `MemoryTransport` / `WebSocketTransport` | Multi-peer + WS shell |
| Phaser | `@anvil/render-phaser` `PhaserRenderFacade` | Optional Phaser inject + canvas fallback |

## Honest limits

- **Phaser** is optional inject, not a full scene editor.
- **WebSocket** transport requires a real server; no lobby/matchmaking.
- **UI kit** is canvas immediate-mode, not React/DOM.
- **Electron template** is a string generator — not a full desktop app in-repo.
