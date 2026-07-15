# Changelog

## 0.5.3 — Net ops + desktop polish

- Colyseus: Redis presence/driver (optional), `/metrics`, richer `/health`, SIGTERM shutdown
- Reconnect seats (`allowReconnection`) + client `reconnect()` with backoff
- Deploy: `nginx-wss.conf`, Redis `docker-compose.yml`
- CLI: `anvil net health`
- Desktop: single-instance lock, sandbox, menu, ANVIL_DEV_URL, dist auto-detect

## 0.5.2 — Content tree Zod validation

- Full Zod schemas for items, loot, quests, actors, maps/areas, cards, audio
- `validateContentTree` wired into `anvil validate` / `validateProject`
- Loot → item REF_MISSING warnings when item catalog present

## 0.5.0 — Agent-native ACI

### Engine
- `agentStep` / `AgentAction` (no raw key codes)
- `observe.summary`, `allowedActions`, `observeDiff`
- `ReplayRecorder` / `playReplay` for deterministic tapes
- `AGENT_TOOL_CATALOG`; CLI `anvil tools`, `anvil doctor`
- Spec: `docs/design/specs/S-AGENT.md`

## 0.4.0 — Colyseus multiplayer

### Engine
- **`@anvil/net-colyseus`**: production multiplayer via **Colyseus**
  - Server-authoritative room (input only from clients)
  - Schema state sync, rate limits, action whitelist, auth hook
  - `createAnvilNetServer` / `connectAnvilNet`
  - Integration smoke + security unit tests
- Spec: `docs/design/specs/S-NET-COLYSEUS.md`
- Legacy `@anvil/genre-net` remains for loopback tests only

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


