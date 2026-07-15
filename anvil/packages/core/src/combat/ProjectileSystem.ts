/**
 * Generic projectile pool: move, lifetime, hit callbacks, pierce/chain.
 */

import type { DamageType } from "./Damage.js";

export type ProjectileId = string;

export type Projectile = {
  id: ProjectileId;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Collision radius */
  radius: number;
  damage: number;
  damageType?: DamageType;
  ownerId?: string;
  team?: string;
  lifeMs: number;
  maxLifeMs: number;
  /** Remaining pierces (0 = destroy on first hit) */
  pierce: number;
  /** Extra chain hops after hit */
  chain: number;
  chainRange: number;
  hitIds: Set<string>;
  data?: Record<string, unknown>;
  dead?: boolean;
};

export type ProjectileSpawnOpts = {
  x: number;
  y: number;
  /** Aim angle radians, or pass vx/vy */
  angle?: number;
  speed?: number;
  vx?: number;
  vy?: number;
  radius?: number;
  damage?: number;
  damageType?: DamageType;
  ownerId?: string;
  team?: string;
  lifeMs?: number;
  pierce?: number;
  chain?: number;
  chainRange?: number;
  data?: Record<string, unknown>;
};

export type ProjectileHitEvent = {
  projectile: Projectile;
  targetId: string;
  x: number;
  y: number;
  damage: number;
};

export type ProjectileHitQuery = (
  p: Projectile,
) => Array<{ id: string; x: number; y: number; team?: string }>;

let _seq = 0;
function nextId(): string {
  _seq += 1;
  return `proj_${_seq}`;
}

export class ProjectileSystem {
  private list: Projectile[] = [];
  private onHit: ((e: ProjectileHitEvent) => void) | null = null;
  private query: ProjectileHitQuery | null = null;

  setHitHandler(fn: (e: ProjectileHitEvent) => void): void {
    this.onHit = fn;
  }

  /** Game supplies nearby targets each frame (or spatial hash). */
  setHitQuery(fn: ProjectileHitQuery): void {
    this.query = fn;
  }

  spawn(opts: ProjectileSpawnOpts): Projectile {
    const speed = opts.speed ?? 320;
    let vx = opts.vx;
    let vy = opts.vy;
    if (vx == null || vy == null) {
      const a = opts.angle ?? 0;
      vx = Math.cos(a) * speed;
      vy = Math.sin(a) * speed;
    }
    const p: Projectile = {
      id: nextId(),
      x: opts.x,
      y: opts.y,
      vx,
      vy,
      radius: opts.radius ?? 6,
      damage: opts.damage ?? 1,
      damageType: opts.damageType,
      ownerId: opts.ownerId,
      team: opts.team,
      lifeMs: opts.lifeMs ?? 2000,
      maxLifeMs: opts.lifeMs ?? 2000,
      pierce: opts.pierce ?? 0,
      chain: opts.chain ?? 0,
      chainRange: opts.chainRange ?? 120,
      hitIds: new Set(),
      data: opts.data,
    };
    this.list.push(p);
    return p;
  }

  /** Aim from (x,y) toward (tx,ty). */
  spawnToward(
    x: number,
    y: number,
    tx: number,
    ty: number,
    opts: Omit<ProjectileSpawnOpts, "x" | "y" | "angle" | "vx" | "vy"> = {},
  ): Projectile {
    const angle = Math.atan2(ty - y, tx - x);
    return this.spawn({ ...opts, x, y, angle });
  }

  all(): readonly Projectile[] {
    return this.list;
  }

  clear(): void {
    this.list = [];
  }

  /**
   * Advance projectiles. `dt` in seconds.
   * Returns destroyed ids this frame.
   */
  update(dt: number): { dead: string[]; hits: ProjectileHitEvent[] } {
    const dtMs = dt * 1000;
    const hits: ProjectileHitEvent[] = [];
    const dead: string[] = [];
    const next: Projectile[] = [];

    for (const p of this.list) {
      if (p.dead) {
        dead.push(p.id);
        continue;
      }
      p.lifeMs -= dtMs;
      if (p.lifeMs <= 0) {
        dead.push(p.id);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      if (this.query) {
        const cands = this.query(p);
        for (const c of cands) {
          if (p.dead) break;
          if (c.id === p.ownerId) continue;
          if (p.team && c.team && c.team === p.team) continue;
          if (p.hitIds.has(c.id)) continue;
          const d = Math.hypot(c.x - p.x, c.y - p.y);
          if (d > p.radius + 8) continue;

          p.hitIds.add(c.id);
          const ev: ProjectileHitEvent = {
            projectile: p,
            targetId: c.id,
            x: c.x,
            y: c.y,
            damage: p.damage,
          };
          hits.push(ev);
          this.onHit?.(ev);

          if (p.pierce > 0) {
            p.pierce -= 1;
          } else if (p.chain > 0) {
            p.chain -= 1;
            // retarget nearest unhit in chain range
            let best: (typeof cands)[0] | null = null;
            let bestD = p.chainRange;
            for (const o of cands) {
              if (p.hitIds.has(o.id) || o.id === p.ownerId) continue;
              if (p.team && o.team && o.team === p.team) continue;
              const od = Math.hypot(o.x - p.x, o.y - p.y);
              if (od < bestD) {
                bestD = od;
                best = o;
              }
            }
            if (best) {
              const ang = Math.atan2(best.y - p.y, best.x - p.x);
              const spd = Math.hypot(p.vx, p.vy) || 320;
              p.vx = Math.cos(ang) * spd;
              p.vy = Math.sin(ang) * spd;
            } else {
              p.dead = true;
            }
          } else {
            p.dead = true;
          }
        }
      }

      if (p.dead) dead.push(p.id);
      else next.push(p);
    }

    this.list = next;
    return { dead, hits };
  }
}
