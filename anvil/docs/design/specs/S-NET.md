# Spec: genre-net (spike only — complete for M8 scope)

**Milestone:** M8  
**Not a production MMO.**

**Implementation:** `@anvil/genre-net` · harness notes `packages/genre-net/SPIKE.md` · demo `examples/hello-net`

## 1. Goals

- 2 peers share a topdown or empty room  
- Replicate `transform` + `health` for player entities  
- Loopback transport for tests  

## 2. Transport interface

```ts
interface Transport {
  send(bytes: Uint8Array): void
  onMessage(cb: (bytes: Uint8Array) => void): void
  close(): void
}
```

`LoopbackTransport.pair()` links two in-process peers (sync delivery for deterministic tests).

## 3. Messages (JSON v1)

| type | payload |
|------|---------|
| `hello` | `{ peerId }` |
| `state` | `{ tick, entities: [{ id, x, y, hp }] }` |
| `input` | `{ tick, actions: string[], peerId }` |

## 4. Authority

- Host authoritative for hp and positions  
- Clients send input; host simulates; broadcast state  

## 5. Out of scope

Shards, matchmaking, anti-cheat, persistence, lag compensation advanced, MMO scale, real WebSocket/WebRTC (implement `Transport` later).

## 6. Acceptance

Loopback 2 logical peers: move one, other observe sees position update within N ticks.

Covered by `packages/genre-net/src/NetRoom.test.ts` and `examples/hello-net`.
