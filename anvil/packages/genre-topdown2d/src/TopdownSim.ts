import type { InputMap } from "@anvil/core";
import type { World } from "@anvil/core";
import {
  resolveCircleCircle,
  resolveCircleWall,
} from "./collision.js";
import { NavGrid, type PathPoint } from "./pathfind.js";
import {
  CONTACT_COOLDOWN_MS,
  DEFAULT_RADIUS,
  EPSILON_SPEED,
  IFRAME_MS,
  type ActorDef,
  type ActorRuntime,
  type AnimState,
  type MapDef,
  type TeamId,
} from "./types.js";

export type Rng = () => number;

export type TopdownSimOptions = {
  /**
   * When true (default for simple demos), clearing all enemies freezes the sim as "won".
   * Multi-area games (Gravewake) must set false so combat continues / zones transition.
   */
  autoWinOnClear?: boolean;
};

export class TopdownSim {
  readonly map: MapDef;
  private actors = new Map<string, ActorRuntime>();
  private world: World;
  private actorDefs: Record<string, ActorDef>;
  private playerId: string | null = null;
  private timeMs = 0;
  private won = false;
  private lost = false;
  private mapId: string;
  private autoWinOnClear: boolean;
  private nav: NavGrid;
  /** Click-to-move destination (Diablo-style). */
  private moveTarget: PathPoint | null = null;
  private playerPath: PathPoint[] = [];
  private playerPathI = 0;
  /** When true, auto-slash nearest enemy in melee while pathing. */
  private autoEngage = false;

  constructor(
    world: World,
    map: MapDef,
    actorDefs: Record<string, ActorDef>,
    _rng: Rng = Math.random,
    opts: TopdownSimOptions = {},
  ) {
    this.world = world;
    this.map = map;
    this.mapId = map.id;
    this.actorDefs = actorDefs;
    this.autoWinOnClear = opts.autoWinOnClear !== false;
    this.nav = new NavGrid(map.width, map.height, map.walls, 28, 14);
    this.spawnAll();
  }

  /**
   * Diablo click-to-move. Optional autoEngage: chase and attack when close.
   */
  setMoveTarget(x: number, y: number, opts?: { autoEngage?: boolean }): void {
    const p = this.getPlayerPos();
    if (!p) return;
    this.moveTarget = {
      x: Math.max(8, Math.min(this.map.width - 8, x)),
      y: Math.max(8, Math.min(this.map.height - 8, y)),
    };
    this.autoEngage = opts?.autoEngage === true;
    this.playerPath = this.nav.findPath(p.x, p.y, this.moveTarget.x, this.moveTarget.y);
    this.playerPathI = 0;
  }

  clearMoveTarget(): void {
    this.moveTarget = null;
    this.playerPath = [];
    this.playerPathI = 0;
    this.autoEngage = false;
  }

  getMoveTarget(): PathPoint | null {
    return this.moveTarget;
  }

  isAutoEngage(): boolean {
    return this.autoEngage;
  }

  getPlayerPath(): PathPoint[] {
    return this.playerPath;
  }

  private spawnAll(): void {
    for (const spawn of this.map.spawns) {
      const def = this.actorDefs[spawn.actor];
      if (!def) throw new Error(`Unknown actor in spawn: ${spawn.actor}`);
      const team: TeamId =
        spawn.team ?? def.team ?? (spawn.actor === "player" ? "player" : "enemy");
      this.spawnActor(def, spawn.x, spawn.y, team);
    }
  }

  /** Optional runtime scale for difficulty tiers / elites. */
  spawnActorPublic(
    def: ActorDef,
    x: number,
    y: number,
    team: TeamId = "enemy",
    scale?: { hpMul?: number; dmgMul?: number; speedMul?: number },
  ): string {
    return this.spawnActor(def, x, y, team, scale);
  }

  /** Remove dead enemy corpses (keeps world lean for endless maps). */
  purgeDeadEnemies(): number {
    let n = 0;
    for (const [id, rt] of [...this.actors.entries()]) {
      if (!rt.dead || rt.team === "player") continue;
      this.actors.delete(id);
      this.world.destroy(id);
      n++;
    }
    return n;
  }

  private spawnActor(
    def: ActorDef,
    x: number,
    y: number,
    team: TeamId,
    scale?: { hpMul?: number; dmgMul?: number; speedMul?: number },
  ): string {
    const hpMul = scale?.hpMul ?? 1;
    const dmgMul = scale?.dmgMul ?? 1;
    const speedMul = scale?.speedMul ?? 1;
    const radius = def.radius ?? DEFAULT_RADIUS;
    const frames =
      def.animations?.idle ??
      def.animations?.walk ??
      [`actors/${def.id}.png`];
    const maxHp = Math.max(1, Math.floor(def.hp * hpMul));
    const id = this.world.spawn({
      id: team === "player" ? "player" : undefined,
      tags: [team, "actor", def.id],
      transform: { x, y },
      health: { hp: maxHp, max: maxHp },
      collider: { kind: "circle", r: radius },
      sprite: { frames: [...frames], fps: 8, loop: true, frame: 0 },
      data: { actorId: def.id, team },
    });

    const baseContact = def.contactDamage ?? (team === "enemy" ? 5 : 0);
    const baseProj = def.projectileDamage ?? 4;
    const rt: ActorRuntime = {
      entityId: id,
      actorId: def.id,
      team,
      ai: def.ai ?? (team === "player" ? "none" : "chase_melee"),
      speed: def.speed * speedMul,
      radius,
      vx: 0,
      vy: 0,
      contactDamage: Math.max(0, Math.floor(baseContact * dmgMul)),
      // Stop when colliders nearly touch so contact damage can fire
      meleeRange: def.meleeRange ?? radius * 2,
      preferredRange: def.preferredRange ?? 120,
      preferredRangeBand: def.preferredRangeBand ?? 30,
      projectileDamage: Math.max(0, Math.floor(baseProj * dmgMul)),
      projectileSpeed: def.projectileSpeed ?? 180,
      projectileCooldownMs: def.projectileCooldownMs ?? 900,
      projectileLifetimeMs: def.projectileLifetimeMs ?? 2000,
      contactCooldownMs: CONTACT_COOLDOWN_MS,
      contactTimerMs: 0,
      iframeMs: IFRAME_MS,
      iframeRemainingMs: 0,
      projectileTimerMs: 0,
      animState: "idle",
      flipX: false,
      attackAnimMs: 0,
      dead: false,
      immovable: false,
      homeX: x,
      homeY: y,
      aggro: team === "player",
      wanderMs: 0,
      wanderAng: Math.random() * Math.PI * 2,
      path: [],
      pathI: 0,
      repathMs: 0,
    };
    this.actors.set(id, rt);
    if (team === "player") this.playerId = id;
    return id;
  }

  getPlayerId(): string | null {
    return this.playerId;
  }

  isWon(): boolean {
    return this.won;
  }

  isLost(): boolean {
    return this.lost;
  }

  /**
   * Player melee strike — damages ALL enemies in range (cleave).
   * Returns hit count and positions for VFX.
   */
  playerMelee(
    range: number,
    damage: number,
  ): { hits: number; targets: Array<{ x: number; y: number; dmg: number }> } {
    return this.playerStrike(range, damage, "cleave");
  }

  /** Single-target strike — damages only the nearest enemy in range. */
  playerMeleeNearest(
    range: number,
    damage: number,
  ): { hits: number; targets: Array<{ x: number; y: number; dmg: number }> } {
    return this.playerStrike(range, damage, "nearest");
  }

  private playerStrike(
    range: number,
    damage: number,
    mode: "cleave" | "nearest",
  ): { hits: number; targets: Array<{ x: number; y: number; dmg: number }> } {
    const empty = { hits: 0, targets: [] as Array<{ x: number; y: number; dmg: number }> };
    if (!this.playerId || this.won || this.lost) return empty;
    const pr = this.actors.get(this.playerId);
    const pe = this.world.get(this.playerId);
    if (!pr || pr.dead || !pe?.transform) return empty;

    type Cand = { rt: ActorRuntime; x: number; y: number; d: number };
    const cands: Cand[] = [];
    for (const rt of this.actors.values()) {
      if (rt.dead || rt.team !== "enemy") continue;
      const e = this.world.get(rt.entityId);
      if (!e?.transform) continue;
      const d = Math.hypot(
        e.transform.x - pe.transform.x,
        e.transform.y - pe.transform.y,
      );
      if (d <= range) {
        cands.push({ rt, x: e.transform.x, y: e.transform.y, d });
      }
    }
    cands.sort((a, b) => a.d - b.d);

    const targets: Array<{ x: number; y: number; dmg: number }> = [];
    const hitList = mode === "nearest" ? cands.slice(0, 1) : cands;
    for (const c of hitList) {
      this.applyDamage(c.rt, damage);
      targets.push({ x: c.x, y: c.y, dmg: damage });
    }

    const face = cands[0] ?? null;
    if (face) {
      const dx = face.x - pe.transform.x;
      const dy = face.y - pe.transform.y;
      pe.data.facing = Math.atan2(dy, dx);
      pe.data.dir =
        Math.abs(dx) >= Math.abs(dy)
          ? dx >= 0
            ? "right"
            : "left"
          : dy >= 0
            ? "down"
            : "up";
      pr.flipX = dx < 0;
    }
    pr.attackAnimMs = 220;
    return { hits: targets.length, targets };
  }

  /** World-space player position for VFX. */
  getPlayerPos(): { x: number; y: number } | null {
    if (!this.playerId) return null;
    const e = this.world.get(this.playerId);
    if (!e?.transform) return null;
    return { x: e.transform.x, y: e.transform.y };
  }

  /** Count of living enemies (for multi-area games). */
  livingEnemyCount(): number {
    return [...this.actors.values()].filter(
      (a) => a.team === "enemy" && !a.dead,
    ).length;
  }

  /** Restart map from defs (confirm on death). */
  restart(): void {
    for (const id of [...this.actors.keys()]) {
      this.world.destroy(id);
    }
    // destroy projectiles
    for (const e of this.world.all()) {
      if (e.tags.includes("projectile")) this.world.destroy(e.id);
    }
    this.actors.clear();
    this.playerId = null;
    this.won = false;
    this.lost = false;
    this.timeMs = 0;
    this.spawnAll();
  }

  update(dt: number, input: InputMap): void {
    if (this.lost || this.won) {
      if (this.lost && input.isPressed("confirm")) this.restart();
      return;
    }

    const dtMs = dt * 1000;
    this.timeMs += dtMs;

    // 1. Input / AI → velocity
    for (const rt of this.actors.values()) {
      if (rt.dead) {
        rt.vx = 0;
        rt.vy = 0;
        continue;
      }
      rt.contactTimerMs = Math.max(0, rt.contactTimerMs - dtMs);
      rt.iframeRemainingMs = Math.max(0, rt.iframeRemainingMs - dtMs);
      rt.projectileTimerMs = Math.max(0, rt.projectileTimerMs - dtMs);
      rt.attackAnimMs = Math.max(0, rt.attackAnimMs - dtMs);

      if (rt.team === "player") {
        this.applyPlayerInput(rt, input);
      } else {
        this.applyAi(rt, dtMs);
      }
    }

    // 2. Integrate + walls (X then Y) per S-TOPDOWN
    for (const rt of this.actors.values()) {
      if (rt.dead) continue;
      const e = this.world.get(rt.entityId);
      if (!e?.transform) continue;

      // X
      e.transform.x += rt.vx * dt;
      let hitX = false;
      for (const wall of this.map.walls) {
        const r = resolveCircleWall(
          e.transform.x,
          e.transform.y,
          rt.radius,
          wall,
        );
        if (r.hit) {
          e.transform.x = r.x;
          hitX = true;
        }
      }
      if (hitX) rt.vx = 0;

      // Y
      e.transform.y += rt.vy * dt;
      let hitY = false;
      for (const wall of this.map.walls) {
        const r = resolveCircleWall(
          e.transform.x,
          e.transform.y,
          rt.radius,
          wall,
        );
        if (r.hit) {
          e.transform.y = r.y;
          hitY = true;
        }
      }
      if (hitY) rt.vy = 0;

      // Clamp to map bounds
      e.transform.x = clamp(e.transform.x, rt.radius, this.map.width - rt.radius);
      e.transform.y = clamp(
        e.transform.y,
        rt.radius,
        this.map.height - rt.radius,
      );
    }

    // 3. Actor-actor circle separation
    const list = [...this.actors.values()].filter((a) => !a.dead);
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i]!;
        const b = list[j]!;
        const ea = this.world.get(a.entityId);
        const eb = this.world.get(b.entityId);
        if (!ea?.transform || !eb?.transform) continue;
        const res = resolveCircleCircle(
          ea.transform.x,
          ea.transform.y,
          a.radius,
          eb.transform.x,
          eb.transform.y,
          b.radius,
          b.immovable,
        );
        if (res.hit) {
          ea.transform.x = res.ax;
          ea.transform.y = res.ay;
          eb.transform.x = res.bx;
          eb.transform.y = res.by;
        }
      }
    }

    // 4. Projectiles integrate + hit
    this.updateProjectiles(dt);

    // 5. Contact combat
    this.resolveContactCombat();

    // 6. Win/lose
    this.checkEnd();

    // 7. Anim states
    for (const rt of this.actors.values()) {
      this.updateAnim(rt);
    }
  }

  private applyPlayerInput(rt: ActorRuntime, input: InputMap): void {
    let ix = 0;
    let iy = 0;
    // Support both topdown names and fps-style forward/back (shared WASD)
    if (input.isDown("move_left")) ix -= 1;
    if (input.isDown("move_right")) ix += 1;
    if (input.isDown("move_up") || input.isDown("move_forward")) iy -= 1;
    if (input.isDown("move_down") || input.isDown("move_back")) iy += 1;
    if (ix !== 0 || iy !== 0) {
      // Keyboard overrides click path (classic hybrid control)
      this.clearMoveTarget();
      const len = Math.hypot(ix, iy);
      ix /= len;
      iy /= len;
      rt.vx = ix * rt.speed;
      rt.vy = iy * rt.speed;
      return;
    }

    // Follow click-to-move path
    if (this.moveTarget && this.playerPath.length) {
      const e = this.world.get(rt.entityId);
      if (!e?.transform) {
        rt.vx = 0;
        rt.vy = 0;
        return;
      }
      // advance waypoints
      while (this.playerPathI < this.playerPath.length) {
        const wp = this.playerPath[this.playerPathI]!;
        const d = Math.hypot(wp.x - e.transform.x, wp.y - e.transform.y);
        if (d < 14) this.playerPathI++;
        else break;
      }
      if (this.playerPathI >= this.playerPath.length) {
        this.clearMoveTarget();
        rt.vx = 0;
        rt.vy = 0;
        return;
      }
      const wp = this.playerPath[this.playerPathI]!;
      const dx = wp.x - e.transform.x;
      const dy = wp.y - e.transform.y;
      const d = Math.hypot(dx, dy) || 1;
      rt.vx = (dx / d) * rt.speed;
      rt.vy = (dy / d) * rt.speed;
      return;
    }

    rt.vx = 0;
    rt.vy = 0;
  }

  /** Nearest living enemy to point (for click-on-enemy). */
  nearestEnemy(x: number, y: number, maxDist = 48): string | null {
    let best: string | null = null;
    let bestD = maxDist;
    for (const rt of this.actors.values()) {
      if (rt.dead || rt.team !== "enemy") continue;
      const e = this.world.get(rt.entityId);
      if (!e?.transform) continue;
      const d = Math.hypot(e.transform.x - x, e.transform.y - y);
      if (d < bestD) {
        bestD = d;
        best = rt.entityId;
      }
    }
    return best;
  }

  /**
   * Diablo-like AI: aggro radius, leash home, idle wander, soft separation.
   * No more whole-map death-ball of perfectly-synced chasers.
   */
  private applyAi(rt: ActorRuntime, dtMs: number): void {
    const AGGRO = 260;
    const LEASH = 480;
    const player = this.playerId ? this.actors.get(this.playerId) : null;
    const pe = player && !player.dead ? this.world.get(player.entityId) : null;
    const me = this.world.get(rt.entityId);
    if (!me?.transform) {
      rt.vx = 0;
      rt.vy = 0;
      return;
    }

    if (rt.ai === "none" || !pe?.transform || !player) {
      rt.vx = 0;
      rt.vy = 0;
      return;
    }

    const dx = pe.transform.x - me.transform.x;
    const dy = pe.transform.y - me.transform.y;
    const dist = Math.hypot(dx, dy) || 1e-6;
    const homeDist = Math.hypot(me.transform.x - rt.homeX, me.transform.y - rt.homeY);

    // Acquire / drop aggro
    if (!rt.aggro && dist <= AGGRO) rt.aggro = true;
    if (rt.aggro && homeDist > LEASH) {
      rt.aggro = false;
    }

    let wishX = 0;
    let wishY = 0;

    if (!rt.aggro) {
      // Return home if far, else idle wander near home
      if (homeDist > 28) {
        wishX = (rt.homeX - me.transform.x) / homeDist;
        wishY = (rt.homeY - me.transform.y) / homeDist;
      } else {
        rt.wanderMs -= dtMs;
        if (rt.wanderMs <= 0) {
          rt.wanderMs = 600 + Math.random() * 1400;
          rt.wanderAng += (Math.random() - 0.5) * 1.8;
        }
        wishX = Math.cos(rt.wanderAng) * 0.35;
        wishY = Math.sin(rt.wanderAng) * 0.35;
      }
    } else if (rt.ai === "chase_melee") {
      if (dist > rt.meleeRange * 0.9) {
        // Path around walls instead of sliding into them
        rt.repathMs -= dtMs;
        if (rt.repathMs <= 0 || rt.path.length === 0) {
          rt.path = this.nav.findPath(
            me.transform.x,
            me.transform.y,
            pe.transform.x,
            pe.transform.y,
          );
          rt.pathI = 0;
          rt.repathMs = 280 + Math.random() * 120;
        }
        const steer = this.followPath(rt, me.transform.x, me.transform.y);
        if (steer) {
          wishX = steer.x;
          wishY = steer.y;
        } else {
          wishX = dx / dist;
          wishY = dy / dist;
        }
      } else {
        wishX = -dy / dist * 0.25;
        wishY = dx / dist * 0.25;
        rt.attackAnimMs = Math.max(rt.attackAnimMs, 120);
        rt.path = [];
      }
    } else if (rt.ai === "keep_distance_ranged") {
      const lo = rt.preferredRange - rt.preferredRangeBand;
      const hi = rt.preferredRange + rt.preferredRangeBand;
      if (dist < lo) {
        wishX = -dx / dist;
        wishY = -dy / dist;
      } else if (dist > hi) {
        wishX = dx / dist;
        wishY = dy / dist;
      } else {
        // orbit + shoot
        wishX = -dy / dist * 0.4;
        wishY = dx / dist * 0.4;
        if (rt.projectileTimerMs <= 0) {
          this.spawnProjectile(rt, dx / dist, dy / dist);
          rt.projectileTimerMs = rt.projectileCooldownMs;
          rt.attackAnimMs = 200;
        }
      }
    }

    // Separation from nearby living enemies (prevents blob)
    let sepX = 0;
    let sepY = 0;
    let n = 0;
    for (const other of this.actors.values()) {
      if (other.dead || other.entityId === rt.entityId || other.team !== "enemy")
        continue;
      const oe = this.world.get(other.entityId);
      if (!oe?.transform) continue;
      const sdx = me.transform.x - oe.transform.x;
      const sdy = me.transform.y - oe.transform.y;
      const sd = Math.hypot(sdx, sdy);
      const minD = rt.radius + other.radius + 18;
      if (sd > 0 && sd < minD) {
        const push = (minD - sd) / minD;
        sepX += (sdx / sd) * push;
        sepY += (sdy / sd) * push;
        n++;
      }
    }
    if (n > 0) {
      wishX += sepX * 1.4;
      wishY += sepY * 1.4;
    }

    const wlen = Math.hypot(wishX, wishY);
    if (wlen > 1e-4) {
      const spd = rt.aggro ? rt.speed : rt.speed * 0.45;
      rt.vx = (wishX / wlen) * spd;
      rt.vy = (wishY / wlen) * spd;
    } else {
      rt.vx = 0;
      rt.vy = 0;
    }
  }

  private followPath(
    rt: ActorRuntime,
    x: number,
    y: number,
  ): { x: number; y: number } | null {
    if (!rt.path.length) return null;
    while (rt.pathI < rt.path.length) {
      const wp = rt.path[rt.pathI]!;
      if (Math.hypot(wp.x - x, wp.y - y) < 16) rt.pathI++;
      else break;
    }
    if (rt.pathI >= rt.path.length) {
      rt.path = [];
      return null;
    }
    const wp = rt.path[rt.pathI]!;
    const dx = wp.x - x;
    const dy = wp.y - y;
    const d = Math.hypot(dx, dy) || 1;
    return { x: dx / d, y: dy / d };
  }

  private spawnProjectile(from: ActorRuntime, nx: number, ny: number): void {
    const e = this.world.get(from.entityId);
    if (!e?.transform) return;
    const r = 4;
    this.world.spawn({
      tags: ["projectile", from.team === "enemy" ? "enemy_projectile" : "player_projectile"],
      transform: {
        x: e.transform.x + nx * (from.radius + r + 2),
        y: e.transform.y + ny * (from.radius + r + 2),
      },
      collider: { kind: "circle", r },
      lifetime: { remainingMs: from.projectileLifetimeMs },
      data: {
        vx: nx * from.projectileSpeed,
        vy: ny * from.projectileSpeed,
        damage: from.projectileDamage,
        team: from.team,
        owner: from.entityId,
      },
    });
  }

  private updateProjectiles(dt: number): void {
    for (const e of this.world.all()) {
      if (!e.tags.includes("projectile") || !e.transform) continue;
      const vx = Number(e.data.vx ?? 0);
      const vy = Number(e.data.vy ?? 0);
      e.transform.x += vx * dt;
      e.transform.y += vy * dt;

      // walls
      const pr = e.collider?.kind === "circle" ? e.collider.r : 4;
      for (const wall of this.map.walls) {
        const r = resolveCircleWall(e.transform.x, e.transform.y, pr, wall);
        if (r.hit) {
          this.world.destroy(e.id);
          break;
        }
      }
      if (!this.world.has(e.id)) continue;

      const team = e.data.team as TeamId;
      const damage = Number(e.data.damage ?? 0);
      for (const rt of this.actors.values()) {
        if (rt.dead || rt.team === team) continue;
        const target = this.world.get(rt.entityId);
        if (!target?.transform) continue;
        const d = Math.hypot(
          target.transform.x - e.transform.x,
          target.transform.y - e.transform.y,
        );
        if (d < rt.radius + pr) {
          this.applyDamage(rt, damage);
          this.world.destroy(e.id);
          break;
        }
      }
    }
  }

  private resolveContactCombat(): void {
    const list = [...this.actors.values()].filter((a) => !a.dead);
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i]!;
        const b = list[j]!;
        if (a.team === b.team) continue;
        // enemy damages player (or any opposing team with contactDamage)
        this.tryContact(a, b);
        this.tryContact(b, a);
      }
    }
  }

  private tryContact(attacker: ActorRuntime, defender: ActorRuntime): void {
    if (attacker.contactDamage <= 0) return;
    if (attacker.contactTimerMs > 0) return;
    const ea = this.world.get(attacker.entityId);
    const ed = this.world.get(defender.entityId);
    if (!ea?.transform || !ed?.transform) return;
    const d = Math.hypot(
      ea.transform.x - ed.transform.x,
      ea.transform.y - ed.transform.y,
    );
    // include epsilon so post-separation grazing still damages
    if (d > attacker.radius + defender.radius + 0.5) return;
    if (defender.iframeRemainingMs > 0) return;
    this.applyDamage(defender, attacker.contactDamage);
    attacker.contactTimerMs = attacker.contactCooldownMs;
    attacker.attackAnimMs = 150;
  }

  private applyDamage(rt: ActorRuntime, amount: number): void {
    const e = this.world.get(rt.entityId);
    if (!e?.health || rt.dead) return;
    e.health.hp = Math.max(0, e.health.hp - amount);
    rt.iframeRemainingMs = rt.iframeMs;
    if (e.health.hp <= 0) {
      rt.dead = true;
      rt.vx = 0;
      rt.vy = 0;
      rt.animState = "death";
      e.tags = e.tags.includes("dead") ? e.tags : [...e.tags, "dead"];
    }
  }

  private checkEnd(): void {
    const player = this.playerId ? this.actors.get(this.playerId) : null;
    if (player?.dead) {
      this.lost = true;
      return;
    }
    if (!this.autoWinOnClear) return;
    const enemies = [...this.actors.values()].filter(
      (a) => a.team === "enemy" && !a.dead,
    );
    if (enemies.length === 0 && this.actors.size > 0) {
      const hadEnemy = this.map.spawns.some((s) => {
        const def = this.actorDefs[s.actor];
        const team = s.team ?? def?.team ?? "enemy";
        return team === "enemy";
      });
      if (hadEnemy) this.won = true;
    }
  }

  private updateAnim(rt: ActorRuntime): void {
    const e = this.world.get(rt.entityId);
    if (!e) return;
    let state: AnimState = "idle";
    if (rt.dead) state = "death";
    else if (rt.attackAnimMs > 0) state = "attack";
    else if (Math.hypot(rt.vx, rt.vy) > EPSILON_SPEED) state = "walk";
    rt.animState = state;
    const speed = Math.hypot(rt.vx, rt.vy);
    if (speed > EPSILON_SPEED) {
      // facing: 0 right, +PI/2 down (canvas y+)
      e.data.facing = Math.atan2(rt.vy, rt.vx);
      // flip only when using a right-facing sheet drawn leftward
      rt.flipX = rt.vx > 0 ? false : rt.vx < 0 ? true : rt.flipX;
    } else if (e.data.facing === undefined) {
      e.data.facing = Math.PI / 2;
    }
    e.data.animState = state;
    e.data.flipX = rt.flipX;
    e.data.vx = rt.vx;
    e.data.vy = rt.vy;
    e.data.speed = speed;
    e.data.attacking = rt.attackAnimMs > 0;
    e.data.actorId = rt.actorId;
    e.data.dir =
      Math.abs(rt.vx) >= Math.abs(rt.vy)
        ? rt.vx >= 0
          ? "right"
          : "left"
        : rt.vy >= 0
          ? "down"
          : "up";
  }

  observeBlob(): Record<string, unknown> {
    const entities = [...this.actors.values()].map((rt) => {
      const e = this.world.get(rt.entityId);
      return {
        id: rt.entityId,
        actorId: rt.actorId,
        team: rt.team,
        ai: rt.ai,
        x: e?.transform?.x ?? 0,
        y: e?.transform?.y ?? 0,
        hp: e?.health?.hp ?? 0,
        maxHp: e?.health?.max ?? 0,
        vx: rt.vx,
        vy: rt.vy,
        anim: rt.animState,
        dead: rt.dead,
      };
    });
    return {
      mapId: this.mapId,
      timeMs: this.timeMs,
      won: this.won,
      lost: this.lost,
      playerId: this.playerId,
      entities,
    };
  }
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
