# `@anvil/genre-net` implementation note

This M8 package is an experimental replication layer, not production
multiplayer. For an operational room server, use `@anvil/net-colyseus` and
[`../../docs/design/specs/S-NET-COLYSEUS.md`](../../docs/design/specs/S-NET-COLYSEUS.md).

## What is implemented

| Piece | Location |
|-------|----------|
| `Transport` and deterministic pair | `src/transport.ts` |
| Memory hub/client and open-socket adapter | `src/MemoryTransport.ts` |
| Minimal Node WebSocket relay and client | `src/NetServer.ts` |
| `hello` / `state` / `input` codec | `src/messages.ts` |
| Host-authoritative `NetRoom` | `src/NetRoom.ts` |
| Two-peer harness | `src/loopbackSession.ts` |
| Kernel module and observation | `src/module.ts` |
| Unit and real local-socket tests | `src/*.test.ts` |
| Demonstration project | `examples/hello-net` |

## Authority model

1. A client sends its latest semantic actions and tick.
2. The host integrates peer movement from last inputs.
3. The host broadcasts position/health snapshots.
4. A client replaces its replicated table with host state.

Only the host may apply `damage()` to authoritative health.

## Verification

```bash
pnpm --filter @anvil/genre-net test
```

Tests cover loopback replication and an ephemeral local `ws` server with real
clients.

## Do not infer production guarantees

`NetServer` is a minimal unauthenticated relay. It does not provide TLS,
identity, input validation, persistence, matchmaking, reconnect seats, rate
limits, anti-cheat, lag compensation, or scaling. Those concerns belong in
the Colyseus adapter or a product-specific backend.
