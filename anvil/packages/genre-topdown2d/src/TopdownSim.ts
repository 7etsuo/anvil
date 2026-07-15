import type { InputMap } from "@anvil/core";
import type { World } from "@anvil/core";
import {
  resolveCircleCircle,
  resolveCircleWall,
} from "./collision.js";
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
    this.spawnAll();
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

  /** Spawn an extra actor at runtime (packs, summons). */
  spawnActorPublic(
    def: ActorDef,
    x: number,
    y: number,
    team: TeamId = "enemy",
  ): string {
    return this.spawnActor(def, x, y, team);
  }

  private spawnActor(
    def: ActorDef,
    x: number,
    y: number,
    team: TeamId,
  ): string {
    const radius = def.radius ?? DEFAULT_RADIUS;
    const frames =
      def.animations?.idle ??
      def.animations?.walk ??
      [`actors/${def.id}.png`];
    const id = this.world.spawn({
      id: team === "player" ? "player" : undefined,
      tags: [team, "actor", def.id],
      transform: { x, y },
      health: { hp: def.hp, max: def.hp },
      collider: { kind: "circle", r: radius },
      sprite: { frames: [...frames], fps: 8, loop: true, frame: 0 },
      data: { actorId: def.id, team },
    });

    const rt: ActorRuntime = {
      entityId: id,
      actorId: def.id,
      team,
      ai: def.ai ?? (team === "player" ? "none" : "chase_melee"),
      speed: def.speed,
      radius,
      vx: 0,
      vy: 0,
      contactDamage: def.contactDamage ?? (team === "enemy" ? 5 : 0),
      // Stop when colliders nearly touch so contact damage can fire
      meleeRange: def.meleeRange ?? radius * 2,
      preferredRange: def.preferredRange ?? 120,
      preferredRangeBand: def.preferredRangeBand ?? 30,
      projectileDamage: def.projectileDamage ?? 4,
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
        this.applyAi(rt);
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
      const len = Math.hypot(ix, iy);
      ix /= len;
      iy /= len;
      rt.vx = ix * rt.speed;
      rt.vy = iy * rt.speed;
    } else {
      rt.vx = 0;
      rt.vy = 0;
    }
  }

  private applyAi(rt: ActorRuntime): void {
    const player = this.playerId ? this.actors.get(this.playerId) : null;
    const pe = player && !player.dead ? this.world.get(player.entityId) : null;
    const me = this.world.get(rt.entityId);
    if (!pe?.transform || !me?.transform || !player) {
      rt.vx = 0;
      rt.vy = 0;
      return;
    }

    const dx = pe.transform.x - me.transform.x;
    const dy = pe.transform.y - me.transform.y;
    const dist = Math.hypot(dx, dy) || 1e-6;
    const nx = dx / dist;
    const ny = dy / dist;

    if (rt.ai === "none") {
      rt.vx = 0;
      rt.vy = 0;
      return;
    }

    if (rt.ai === "chase_melee") {
      if (dist > rt.meleeRange) {
        rt.vx = nx * rt.speed;
        rt.vy = ny * rt.speed;
      } else {
        rt.vx = 0;
        rt.vy = 0;
        rt.attackAnimMs = Math.max(rt.attackAnimMs, 120);
      }
      return;
    }

    if (rt.ai === "keep_distance_ranged") {
      const lo = rt.preferredRange - rt.preferredRangeBand;
      const hi = rt.preferredRange + rt.preferredRangeBand;
      if (dist < lo) {
        rt.vx = -nx * rt.speed;
        rt.vy = -ny * rt.speed;
      } else if (dist > hi) {
        rt.vx = nx * rt.speed;
        rt.vy = ny * rt.speed;
      } else {
        rt.vx = 0;
        rt.vy = 0;
        if (rt.projectileTimerMs <= 0) {
          this.spawnProjectile(rt, nx, ny);
          rt.projectileTimerMs = rt.projectileCooldownMs;
          rt.attackAnimMs = 200;
        }
      }
    }
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
