# Colyseus + top-down ARPG sample (input-only authority)

Server-authoritative pattern for Anvil top-down / Diablo-like games.

## Principle

- **Clients send only input** (move intent, ability id, aim point).
- **Server owns** world sim (`TopdownSim` or custom), combat, loot, inventory.
- **State broadcast** is a compact snapshot / delta (positions, HP, cooldowns, area id).

## Room sketch

```ts
// server (pseudocode using @anvil/net-colyseus helpers)
onMessage("input", (client, msg: {
  moveX?: number; moveY?: number;
  abilityId?: string;
  aimX?: number; aimY?: number;
  clickX?: number; clickY?: number;
}) => {
  const player = room.players.get(client.sessionId);
  if (!player) return;
  // queue for next fixed tick — never apply client positions
  player.inputQueue.push(msg);
});

// fixed tick
for (const p of room.players.values()) {
  while (p.inputQueue.length) {
    const msg = p.inputQueue.shift()!;
    if (msg.clickX != null) sim.setMoveTarget(msg.clickX, msg.clickY);
    if (msg.abilityId) abilities.tryCast(p.entityId, msg.abilityId, { ... });
  }
  sim.update(dt, p.inputMap);
}
// broadcast observe-like snapshot
```

## Security checklist

1. Never trust client world positions or damage numbers.
2. Rate-limit ability casts; server cooldowns via `AbilitySystem`.
3. Validate aim/target distance server-side (`AbilityDef.range`).
4. Loot rolls only on server (`dropFromTable`).
5. Reconnect: restore `RunStateV1` / save slot, not client cache.

## Client

- Local prediction optional for movement; reconcile from server snapshot.
- Presentation: `ViewCamera` + iso project for Diablo view; combat VFX from `combat:hit` / `combat:kill` events replicated as lightweight cues.

## Packages

- `@anvil/net-colyseus` — room factory, reconnect hooks
- `@anvil/genre-topdown2d` — `TopdownSim`, `NavGrid`, path cache, AI radius culling
- `@anvil/core` — `AbilitySystem`, combat events, `ViewCamera`, loot policy, run save

See also `docs/design/specs/S-NET-COLYSEUS.md` if present.
