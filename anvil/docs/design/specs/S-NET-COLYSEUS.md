# Spec: Production multiplayer — Colyseus (`@anvil/net-colyseus`)

**This is the supported multiplayer path for Anvil.**  
Legacy `@anvil/genre-net` loopback/raw `ws` relay is for tests/spikes only.

## Stack

| Piece | Library |
|-------|---------|
| Server framework | [Colyseus](https://colyseus.io/) (`colyseus`, `@colyseus/core`) |
| State sync | `@colyseus/schema` (binary patches) |
| Transport | `@colyseus/ws-transport` (WebSocket) |
| Client | `colyseus.js` |

## Authority model

1. Client joins with `{ name, token? }` — `onAuth` runs.
2. Client sends **only** `{ type implicitly via room.send("input"), actions[], seq? }`.
3. Server validates actions (whitelist), rate-limits, applies movement.
4. Server patches `AnvilRoomState` (players map: x, y, hp, …) to all clients.
5. Clients **never** send position or HP.

## Security (built-in)

| Control | Implementation |
|---------|----------------|
| Auth hook | `onAuth` + pluggable `AuthValidator` (default: name + optional token length) |
| Input whitelist | `ALLOWED_INPUT_ACTIONS` — unknown dropped |
| Rate limit | max inputs/sec per client (default 30) |
| Seq reject | optional `seq` ignores replays/old |
| Max clients | room `maxClients` (default 16) |
| No client-trusted state | only server mutates `PlayerState` |

**You still must:** terminate TLS (WSS) at reverse proxy/load balancer; plug real JWT/session verify into `auth`.

## API

```ts
// server
import { createAnvilNetServer } from "@anvil/net-colyseus";
const server = await createAnvilNetServer({ port: 2567 });

// client
import { connectAnvilNet } from "@anvil/net-colyseus";
const net = await connectAnvilNet({
  endpoint: "ws://127.0.0.1:2567",
  name: "Hero",
  // token: "…", // if you enable token checks
});
net.sendInput(["move_right"], 1);
const me = net.getState().players.get(net.sessionId);
```

## Health

`GET http://host:port/health` → `{ ok: true }`.
