# Anvil engine — what it is

Anvil is a **TypeScript game engine** for browser and headless (tests/agents).  
Priority: **engine quality first**. Games live under `../games/`.

## How you use it

```ts
import { createGame, observe, CharacterSheet, attachCharacterSheet } from "@anvil/core";

const handle = await createGame({ root: "./my-game", headless: true });
// First-class services on the handle:
handle.world
handle.input
handle.audio
handle.particles
handle.quests
handle.plugins
handle.ui
handle.cinema
handle.tick(1/60)
```

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

Legacy spike (not for production): `@anvil/genre-net` loopback / raw WS relay.  
Spec: `docs/design/specs/S-NET-COLYSEUS.md`.

## Desktop

```bash
# after vite build of a game → dist-web/
cd packages/desktop && pnpm install
ANVIL_GAME_DIST=/abs/path/to/game/dist-web pnpm start
```

## Version

`ANVIL_VERSION` on `createGame().version` and `observe().engine`.
