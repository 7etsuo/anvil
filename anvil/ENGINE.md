# Anvil engine — what it is

Anvil is a **TypeScript game engine** for browser and headless (tests/agents).  
Priority: **engine quality first**. Games live under `../games/`.

## Agent-first usage (preferred)

Research basis: SWE-agent (small tool surface), ReAct (act→observe), GameCraft (verify with tests).

```ts
import {
  createGame, observe, agentStep, observeDiff, ReplayRecorder, playReplay,
} from "@anvil/core";

const handle = await createGame({ root: "./my-game", headless: true, seed: 1 });

// Structured actions — no KeyW
agentStep(handle, { type: "move", dir: "right" }, 30);
agentStep(handle, { type: "tap", action: "shoot" });

const a = await observe(handle);
// Prefer a.summary in prompts; full JSON only when debugging
const b = await observe(handle);
const delta = observeDiff(a, b); // compact change list

// CLI for agents
// anvil tools --json     → catalog
// anvil doctor [path]    → validate + test one-shot
// anvil observe --json   → state + summary
// anvil test             → primary success signal
```

### Human / runtime usage

```ts
const handle = await createGame({ root: "./my-game", headless: true });
handle.world; handle.input; handle.audio; handle.particles;
handle.quests; handle.plugins; handle.ui; handle.cinema;
handle.tick(1/60);
```

## Engine systems (0.7+)

First-class on `Kernel` / `GameHandle`: projectiles, statuses, resources, threat,
death, interactables, triggers, float text, screen transitions — plus libraries
for skill trees, wallet, vendor, crafting, minimap fog, LOS, elites, spatial
audio, sprite atlases, and input prediction.

```ts
handle.projectiles.spawnToward(x, y, tx, ty, { damage: 12, damageType: "fire" });
handle.resources.attach("player");
handle.resources.spend("player", "mana", 10);
handle.interactables.register({ id: "chest1", kind: "chest", x: 100, y: 80 });
handle.floatText.damage(x, y, 42, true);
handle.transitions.start({ label: "The Wastes", onMid: () => enterZone() });
```

CLI discovery: `anvil audio list`, `anvil sprites list`, `anvil content list`.  
Net combat pattern: `docs/NET_COMBAT_SAMPLE.md`.

## Bundled audio (CC0)

Ready-to-pick library: **`anvil/assets/audio/`** (~400 SFX + music).  
Browse `catalog.json` or:

```ts
import { listBundledAudio, getGameReadyAudioCues } from "@anvil/core";

listBundledAudio({ prefix: "sfx/combat", limit: 20 });
handle.audio.setCues(getGameReadyAudioCues("audio")); // after ln -s pack → assets/audio
handle.audio.play("hit");
handle.audio.playMusic("music_battle");
```

See `assets/audio/README.md` and `docs/design/09_ASSETS_AND_MEDIA.md` §8.

## Packages

| Package | Role |
|---------|------|
| `@anvil/core` | Kernel, world, input, audio, RPG, UI, AI, path, quests, save, observe |
| `@anvil/schema` | game.yaml + errors |
| `@anvil/cli` | validate / test / observe / build / new / recipe |
| `@anvil/render-phaser` | **Real Phaser 3** renderer |
| `@anvil/genre-*` | card, topdown2d, vn, shmup, fps2, net |
| `@anvil/desktop` | **Real Electron** shell for web builds |
| `@anvil/recipes` | content recipes |

## Multiplayer (production): Colyseus

```ts
import { createAnvilNetServer, connectAnvilNet } from "@anvil/net-colyseus";

// server process
const server = await createAnvilNetServer({ port: 2567 });

// game client
const net = await connectAnvilNet({
  endpoint: "ws://127.0.0.1:2567",
  name: "Hero",
});
net.sendInput(["move_right"], 1); // input only — server owns x/y/hp
```

### Ops

```bash
# Redis multi-node (optional)
docker compose -f packages/net-colyseus/deploy/docker-compose.yml up -d
REDIS_URL=redis://127.0.0.1:6379 pnpm --filter @anvil/net-colyseus dev:server

# Health / metrics
curl http://127.0.0.1:2567/health
curl http://127.0.0.1:2567/metrics
anvil net health --url http://127.0.0.1:2567
```

WSS: terminate TLS at nginx (`packages/net-colyseus/deploy/nginx-wss.conf`), set `ANVIL_TRUST_PROXY=1`.  
Client reconnect: `net.reconnect()` within server seat window.  
Legacy spike only: `@anvil/genre-net`. Spec: `docs/design/specs/S-NET-COLYSEUS.md`.

## Desktop

```bash
# after vite build of a game → dist-web/
cd packages/desktop && pnpm install
ANVIL_GAME_DIST=/abs/path/to/game/dist-web pnpm start
```

## Version

`ANVIL_VERSION` on `createGame().version` and `observe().engine`.
