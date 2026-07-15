# Spec: Production multiplayer — Colyseus (`@anvil/net-colyseus`)

**This is the supported multiplayer path for Anvil.**  
Legacy `@anvil/genre-net` loopback/raw `ws` relay is for tests/spikes only.

## Stack

| Piece | Library |
|-------|---------|
| Server framework | [Colyseus](https://colyseus.io/) |
| State sync | `@colyseus/schema` |
| Transport | `@colyseus/ws-transport` |
| Client | `colyseus.js` |
| Multi-node (optional) | `@colyseus/redis-presence` + `@colyseus/redis-driver` |

## Authority model

1. Client joins with `{ name, token? }` — `onAuth` runs.
2. Client sends **only** `room.send("input", { actions, seq? })`.
3. Server validates (whitelist), rate-limits, simulates.
4. Server patches `AnvilRoomState` to clients.
5. Clients **never** send position or HP.

## Security

| Control | Implementation |
|---------|----------------|
| Auth hook | pluggable `AuthValidator` |
| Input whitelist | `ALLOWED_INPUT_ACTIONS` |
| Rate limit | max inputs/sec (default 30) |
| Seq reject | ignores old/duplicate `seq` |
| Max clients | default 16 |
| Reconnect window | `allowReconnection` (default 60s) |
| TLS | terminate at reverse proxy (see `deploy/nginx-wss.conf`) |

## Ops

| Endpoint | Purpose |
|----------|---------|
| `GET /health` | JSON stats (rooms, clients, redis, uptime) |
| `GET /metrics` | Prometheus text exposition |

| Env | Purpose |
|-----|---------|
| `REDIS_URL` | Enable Redis presence/driver |
| `ANVIL_PUBLIC_ADDRESS` | Public WSS/HTTPS URL |
| `ANVIL_TRUST_PROXY` | `1` behind nginx |
| `ANVIL_RECONNECT_SEC` | Reconnect seat seconds |
| `PORT` / `HOST` | Bind address |

```bash
# local multi-node deps
docker compose -f packages/net-colyseus/deploy/docker-compose.yml up -d
REDIS_URL=redis://127.0.0.1:6379 pnpm --filter @anvil/net-colyseus dev:server

# agent/ops probe
anvil net health --url http://127.0.0.1:2567
```

## API

```ts
import { createAnvilNetServer, connectAnvilNet } from "@anvil/net-colyseus";

const server = await createAnvilNetServer({
  port: 2567,
  redisUrl: process.env.REDIS_URL,
  trustProxy: true,
  publicAddress: "https://game.example.com",
});

const net = await connectAnvilNet({
  endpoint: "wss://game.example.com",
  name: "Hero",
  token: "…",
});
net.sendInput(["move_right"], 1);

// after disconnect:
// const again = await net.reconnect();
```

## Deploy files

- `packages/net-colyseus/deploy/nginx-wss.conf` — WSS terminator
- `packages/net-colyseus/deploy/docker-compose.yml` — Redis
