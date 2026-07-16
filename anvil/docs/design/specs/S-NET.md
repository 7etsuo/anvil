# Spec: `@anvil/genre-net` legacy replication layer

**Milestone:** M8 spike

**Production-oriented alternative:** [`S-NET-COLYSEUS.md`](./S-NET-COLYSEUS.md)

`@anvil/genre-net` is a small host-authoritative replication experiment. It is
not an authenticated, persistent, scalable multiplayer service, but it is no
longer loopback-only: raw WebSocket transports and a relay server are present.

## Shipped surfaces

| Surface | Role |
|---------|------|
| `Transport` | Byte send/message/close abstraction |
| `LoopbackTransport` | Deterministic in-process pair |
| `MemoryHub` / `MemoryTransport` | Multi-peer in-memory transport |
| `WebSocketTransport` | Adapter around an already-open socket-like client |
| `NetServer` | Minimal Node `ws` relay |
| `WsClientTransport` | Node/browser client for `NetServer` |
| `NetRoom` | Host/client state and input replication |
| `createLoopbackSession` | Two-peer test harness |
| `netModule` | Kernel integration and observation |

## Protocol and authority

JSON protocol v1 uses `hello`, `input`, and `state` messages. Clients send
semantic action names with tick/peer id. The host integrates the last known
inputs and is the only authority for position and health; clients replace
their replicated entity table from host state.

## Appropriate use

Use this package for deterministic tests, transport experiments, local demos,
and compatibility work. Prefer `@anvil/net-colyseus` for rooms, validation,
reconnects, health/metrics, Redis presence, and operational deployment.

## Explicit limitations

The raw relay has no identity/authentication, matchmaking, persistence,
anti-cheat, lag compensation, rate limits, durable rooms, TLS termination, or
horizontal scale. Do not expose it as a production Internet service.

## Acceptance

- Loopback peers replicate movement within the tick budget.
- Only the host changes authoritative health.
- The real WebSocket test connects two clients to an ephemeral local server
  and relays state/messages.

Run `pnpm --filter @anvil/genre-net test`.
