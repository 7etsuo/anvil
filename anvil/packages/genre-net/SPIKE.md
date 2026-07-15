# genre-net spike (M8)

**Not production multiplayer.** See `docs/design/specs/S-NET.md`.

## What shipped

| Piece | Location |
|-------|----------|
| `Transport` + `LoopbackTransport` | `src/transport.ts` |
| Messages `hello` / `state` / `input` | `src/messages.ts` |
| Host-authoritative `NetRoom` | `src/NetRoom.ts` |
| 2-peer harness | `src/loopbackSession.ts` |
| Kernel module (observe) | `src/module.ts` |
| Acceptance tests | `src/NetRoom.test.ts` |
| Demo example | `examples/hello-net` |

## Authority model

1. Client sends `{ type: "input", actions, peerId }` each step  
2. Host integrates movement for all entities from last inputs  
3. Host broadcasts `{ type: "state", tick, entities: [{ id, x, y, hp }] }`  
4. Client replaces local entity table with host state  

Host alone may change `hp` (`damage()`).

## Acceptance (automated)

```bash
pnpm --filter @anvil/genre-net test
# "move one peer; other observes position within N ticks"
```

## Out of scope (explicit)

Shards, matchmaking, anti-cheat, persistence, lag compensation, real sockets, MMO scale.

WebSocket / WebRTC can implement `Transport` later without changing `NetRoom`.
