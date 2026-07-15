# Authoritative combat sample (Colyseus)

Anvil’s net stack (`@anvil/net-colyseus`) already replicates transform + health.
This note describes a **server-authoritative combat** pattern using engine
primitives — implement in a game room, not in core.

## Principles

1. **Clients send input only** (move axes, skill id, aim point, seq).
2. **Server** owns HP, statuses, projectiles, threat, loot rolls.
3. **Clients** predict movement via `InputPredictor`; reconcile on server pose.

## Room tick (pseudocode)

```ts
import {
  ProjectileSystem,
  StatusSystem,
  ThreatTable,
  mitigateDamage,
  InputPredictor,
  makeTopdownMoveFn,
} from "@anvil/core";

// per tick on server:
projectiles.setHitQuery((p) => nearbyEnemies(p));
const { hits } = projectiles.update(dt);
for (const h of hits) {
  const dmg = mitigateDamage({
    raw: h.damage,
    type: h.projectile.damageType,
    armor: target.armor,
    resists: target.stats,
  });
  applyHp(h.targetId, -dmg.final);
  threat.add(h.targetId, h.projectile.ownerId!, dmg.final);
  statuses.apply(h.targetId, "burn"); // if flame bolt
  broadcast("combat:hit", { ... });
}
statuses.tick(dtMs);
// broadcast state patch: poses, hp, status ids, projectile snapshots
```

## Client

```ts
const predictor = new InputPredictor(makeTopdownMoveFn(200), spawn);
// each frame:
const frame = predictor.sample(inputSnapshot, dt);
net.sendInput(frame);
// on server snapshot:
predictor.reconcile({ x: snap.x, y: snap.y, seq: snap.lastInputSeq });
```

## Messages (suggested)

| Direction | Name | Payload |
|-----------|------|---------|
| C→S | `input` | `{ seq, buttons, aimX, aimY, skill? }` |
| S→C | `state` | `{ entities[], projectiles[], tick }` |
| S→C | `combat` | hit/kill/heal events for VFX/SFX |

## Security

- Never trust client damage or HP.
- Rate-limit skill casts with `AbilitySystem` on server.
- Validate aim range server-side.

See also: `NET_TOPDOWN_SAMPLE.md`, `@anvil/net-colyseus`.
