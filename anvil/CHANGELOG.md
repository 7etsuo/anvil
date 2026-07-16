# Changelog

## Unreleased — Schema-v2 authoring and declarative ARPG

### Added

- `@anvil/schema`: schema-v2 manifests, `game.spec.yaml` intent, traits,
  prefabs, finite conditions/effects, triggers, and state machines.
- `@anvil/authoring`: deterministic `compileProject`, canonical SHA-256 source
  hash, deeply frozen `AnvilGameIR`, transactional/idempotent `migrateProject`,
  and capability descriptors.
- `@anvil/authoring/vite`: host-side compiler bridge exposing
  `virtual:anvil-game-ir` without bundling Node/compiler code into the browser.
- `@anvil/genre-arpg`: IR materialization, deterministic rule runtime,
  authoring provenance, and the restricted `defineArpgGame` title hook.
- Gravewake now consumes the same compiled authoring model in Node and browser,
  with actor archetypes, campaign rules, five areas, three bosses, level-100
  progression, item-level loot, skill/craft/vendor/socket systems, and
  structured authoring/rule observations.

### Documentation

- Reconciled engine and Gravewake usage docs with the implemented APIs,
  commands, content, controls, test boundaries, and current limitations.
- Marked the original Gravewake vertical-slice design bible as a historical
  archive instead of a live runtime contract.

### Remaining before release

- Implement CLI `migrate`, `describe`, and `capabilities`.
- Make `anvil new` emit schema v2, migrate examples/templates, and connect
  generic validate/test/dev to authoring compilation.
- Add generic `genre-arpg` loading and `new --genre arpg`.
- Include authoring/ARPG tests in routine scripts/CI and restore the full green
  repository gate. Three CLI integration tests currently fail for this work.

## 0.7.0 — Engine systems pack

Reusable systems for ARPGs and multi-genre games:

- **Combat:** ProjectileSystem, ThreatTable, EliteAffixes, DeathSystem
- **Progression:** ResourcePool (mana/stamina), SkillTree, multi-currency Wallet
- **World:** Interactables, Triggers, MinimapFog, line-of-sight / cover
- **Economy:** Vendor shop, Crafting + sockets + reforge
- **FX:** FloatText, ScreenTransition; spatial audio falloff
- **Assets:** SpriteAtlas helpers, bundled sprites catalog hooks
- **Net:** InputPredictor + top-down move helper; `docs/NET_COMBAT_SAMPLE.md`
- **CLI:** `anvil audio list`, `sprites list`, `content list`
- **Observe:** statuses, ability CDs, resources, projectiles, death phases

## 0.5.5 — Combat audio, statuses, damage types

- **Damage types + resists**: physical/fire/cold/lightning/poison/holy/arcane; armor + resist mitigation
- **StatusSystem** on Kernel: chill, burn, poison, stun, blessed, armor_break (+ custom defs)
- **wireCombatAudio / installGameAudio**: combat/UI/zone events → SFX + music cues
- Gravewake: smite=holy+chill, whirl=armor break, potion/loot/UI/zone audio

## 0.5.4 — Bundled CC0 audio library

- **`anvil/assets/audio/`**: 400+ free CC0 SFX + music, foldered for agents (`sfx/ui`, `combat`, `inventory`, `world`, `metal`, `wood`, `foley`, `music/`)
- **`catalog.json`** + `LICENSES.md` + agent README
- **`AudioCatalog`**: `listBundledAudio`, `getSuggestedAudioCues`, `getGameReadyAudioCues`, `loadBundledAudioCatalog`
- **`AudioSystem`**: `addCues`, `listCues`, `getCuePath`, `hasCue`

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

