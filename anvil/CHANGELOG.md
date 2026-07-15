# Changelog

## 0.3.0 — Engine extras completeness pass

### Engine (`@anvil/core` + net/render)
- **UiKit**, **ParticleSystem**, **CombatFeel** (hitstun/knockback/iframes)
- **A\*** pathfinding, **AI** chase/leash/path-follow
- **QuestSystem**, **AudioSystem** multi-channel + music
- **InputMap** rebind + gamepad
- **Content validators** + loot roll, **PluginRegistry**, **MapBuilder**
- **Package manifest** / Electron template
- **MemoryHub** / **WebSocketTransport** (`@anvil/genre-net`)
- **PhaserRenderFacade** optional inject (`@anvil/render-phaser`)
- Specs: `S-RPG.md`, `S-ENGINE_EXTRAS.md`

## 0.2.0 — Core RPG systems

### Engine (`@anvil/core`)
- **Inventory**, **Equipment**, **CharacterSheet**, **stats** (`finalStats`, armor)
- **Ground loot** helpers (`spawnGroundLoot`, `tryPickupNearest`)
- **ZoneGraph** multi-room travel + clear gates
- **Save v2**: `character` + `zones` via `setCharacterSaveHooks` / `setZoneSaveHooks`
- Spec: `docs/design/specs/S-RPG.md`

## 0.1.0 — M9 Gravewake unpark

### Added
- **Gravewake** greybox vertical slice under `games/gravewake/` (Anvil APIs only)
- Relative game modules (`./dist/module.js`) via CLI loadModules
- `TopdownSim.playerMelee` / `livingEnemyCount` for game-layer combat
- Prior: full genre suite M1–M8, net spike, recipes, CI matrix

### Docs
- Gravewake UNPARKED; AGENTS/task breakdown M1–M9 complete


