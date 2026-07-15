import type { InputMap, World } from "@anvil/core";
import { patternVelocities } from "./patterns.js";
import {
  BULLET_RADIUS,
  DEFAULT_HEIGHT,
  DEFAULT_LIVES,
  DEFAULT_WIDTH,
  PLAYER_IFRAME_MS,
  PLAYER_RADIUS,
  type BulletPattern,
  type EnemyDef,
  type StageDef,
  type WaveDef,
} from "./types.js";

export class ShmupSim {
  private world: World;
  private stage: StageDef;
  private enemies: Record<string, EnemyDef>;
  private width: number;
  private height: number;
  private time = 0;
  private lives: number;
  private score = 0;
  private won = false;
  private lost = false;
  private playerId: string;
  private fireCooldownMs: number;
  private fireTimer = 0;
  private bulletSpeed: number;
  private playerSpeed: number;
  private iframeMs = 0;
  private wavesFired = new Set<string>();
  private waveList: WaveDef[];
  private enemyFireTimers = new Map<string, number>();

  constructor(
    world: World,
    stage: StageDef,
    enemies: Record<string, EnemyDef>,
    extraWaves: Record<string, WaveDef> = {},
  ) {
    this.world = world;
    this.stage = stage;
    this.enemies = enemies;
    this.width = stage.width ?? DEFAULT_WIDTH;
    this.height = stage.height ?? DEFAULT_HEIGHT;
    this.lives = stage.lives ?? DEFAULT_LIVES;
    this.fireCooldownMs = stage.fireCooldownMs ?? 180;
    this.bulletSpeed = stage.bulletSpeed ?? 280;
    this.playerSpeed = stage.playerSpeed ?? 160;

    // Merge stage.waves with content waves referenced by id-only if needed
    this.waveList = [...(stage.waves ?? [])];
    for (const w of Object.values(extraWaves)) {
      if (!this.waveList.some((x) => x.id === w.id)) this.waveList.push(w);
    }
    this.waveList.sort((a, b) => a.t - b.t);

    this.playerId = world.spawn({
      id: "player",
      tags: ["player", "ship"],
      transform: {
        x: stage.playerX ?? this.width / 2,
        y: stage.playerY ?? this.height - 40,
      },
      health: { hp: 1, max: 1 },
      collider: { kind: "circle", r: PLAYER_RADIUS },
      data: { team: "player" },
    });
  }

  update(dt: number, input: InputMap): void {
    if (this.won || this.lost) return;

    this.time += dt;
    this.fireTimer = Math.max(0, this.fireTimer - dt * 1000);
    this.iframeMs = Math.max(0, this.iframeMs - dt * 1000);

    this.spawnWaves();
    this.movePlayer(dt, input);
    this.playerFire(input);
    this.moveEnemies(dt);
    this.enemyFire(dt);
    this.moveBullets(dt);
    this.collisions();
    this.cullOffscreen();
    this.checkEnd();
  }

  private spawnWaves(): void {
    for (const wave of this.waveList) {
      if (this.wavesFired.has(wave.id)) continue;
      if (this.time + 1e-9 < wave.t) continue;
      this.wavesFired.add(wave.id);
      for (const s of wave.spawns) {
        const def = this.enemies[s.enemy];
        if (!def) throw new Error(`Unknown enemy: ${s.enemy}`);
        const id = this.world.spawn({
          tags: ["enemy", def.id],
          transform: { x: s.x, y: s.y },
          health: { hp: def.hp, max: def.hp },
          collider: { kind: "circle", r: def.radius ?? 10 },
          data: {
            team: "enemy",
            enemyId: def.id,
            speed: s.speed ?? def.speed ?? 60,
            score: def.score ?? 100,
            movePattern: s.movePattern ?? s.pattern ?? "down",
            fire: def.fire ?? null,
            fireCooldownMs: def.fireCooldownMs ?? 800,
          },
        });
        this.enemyFireTimers.set(id, def.fireCooldownMs ?? 800);
      }
    }
  }

  private movePlayer(dt: number, input: InputMap): void {
    const p = this.world.get(this.playerId);
    if (!p?.transform) return;
    let ix = 0;
    let iy = 0;
    if (input.isDown("move_left")) ix -= 1;
    if (input.isDown("move_right")) ix += 1;
    if (input.isDown("move_up")) iy -= 1;
    if (input.isDown("move_down")) iy += 1;
    if (ix || iy) {
      const len = Math.hypot(ix, iy) || 1;
      p.transform.x += (ix / len) * this.playerSpeed * dt;
      p.transform.y += (iy / len) * this.playerSpeed * dt;
    }
    const r = PLAYER_RADIUS;
    p.transform.x = clamp(p.transform.x, r, this.width - r);
    p.transform.y = clamp(p.transform.y, r, this.height - r);
  }

  private playerFire(input: InputMap): void {
    if (!input.isDown("shoot") && !input.isPressed("shoot")) return;
    if (this.fireTimer > 0) return;
    const p = this.world.get(this.playerId);
    if (!p?.transform) return;
    this.fireTimer = this.fireCooldownMs;
    this.world.spawn({
      tags: ["bullet", "player_bullet"],
      transform: { x: p.transform.x, y: p.transform.y - PLAYER_RADIUS - 2 },
      collider: { kind: "circle", r: BULLET_RADIUS },
      lifetime: { remainingMs: 3000 },
      data: {
        team: "player",
        vx: 0,
        vy: -this.bulletSpeed,
        damage: 1,
      },
    });
  }

  private moveEnemies(dt: number): void {
    const player = this.world.get(this.playerId);
    for (const e of this.world.all()) {
      if (!e.tags.includes("enemy") || !e.transform) continue;
      const speed = Number(e.data.speed ?? 60);
      const pat = String(e.data.movePattern ?? "down");
      if (pat === "aim_player" && player?.transform) {
        const dx = player.transform.x - e.transform.x;
        const dy = player.transform.y - e.transform.y;
        const len = Math.hypot(dx, dy) || 1;
        e.transform.x += (dx / len) * speed * dt;
        e.transform.y += (dy / len) * speed * dt;
      } else {
        e.transform.y += speed * dt;
      }
    }
  }

  private enemyFire(dt: number): void {
    const player = this.world.get(this.playerId);
    const px = player?.transform?.x ?? this.width / 2;
    const py = player?.transform?.y ?? this.height / 2;

    for (const e of this.world.all()) {
      if (!e.tags.includes("enemy") || !e.transform) continue;
      const fire = e.data.fire as BulletPattern | null;
      if (!fire) continue;
      let t = this.enemyFireTimers.get(e.id) ?? 0;
      t -= dt * 1000;
      if (t <= 0) {
        const cooldown = Number(e.data.fireCooldownMs ?? 800);
        t = cooldown;
        const vels = patternVelocities(
          fire,
          e.transform.x,
          e.transform.y,
          px,
          py,
        );
        for (const v of vels) {
          this.world.spawn({
            tags: ["bullet", "enemy_bullet"],
            transform: {
              x: e.transform.x,
              y: e.transform.y + 8,
            },
            collider: { kind: "circle", r: BULLET_RADIUS },
            lifetime: { remainingMs: 4000 },
            data: {
              team: "enemy",
              vx: v.vx,
              vy: v.vy,
              damage: 1,
            },
          });
        }
      }
      this.enemyFireTimers.set(e.id, t);
    }
  }

  private moveBullets(dt: number): void {
    for (const e of this.world.all()) {
      if (!e.tags.includes("bullet") || !e.transform) continue;
      e.transform.x += Number(e.data.vx ?? 0) * dt;
      e.transform.y += Number(e.data.vy ?? 0) * dt;
    }
  }

  private collisions(): void {
    const player = this.world.get(this.playerId);
    if (!player?.transform) return;

    const enemies = this.world.all().filter((e) => e.tags.includes("enemy"));
    const pBullets = this.world
      .all()
      .filter((e) => e.tags.includes("player_bullet"));
    const eBullets = this.world
      .all()
      .filter((e) => e.tags.includes("enemy_bullet"));

    // Player bullets vs enemies
    for (const b of pBullets) {
      if (!b.transform || !this.world.has(b.id)) continue;
      const br = b.collider?.kind === "circle" ? b.collider.r : BULLET_RADIUS;
      for (const en of enemies) {
        if (!en.transform || !this.world.has(en.id)) continue;
        const er = en.collider?.kind === "circle" ? en.collider.r : 10;
        const d = Math.hypot(
          b.transform.x - en.transform.x,
          b.transform.y - en.transform.y,
        );
        if (d < br + er) {
          const dmg = Number(b.data.damage ?? 1);
          if (en.health) {
            en.health.hp -= dmg;
            if (en.health.hp <= 0) {
              this.score += Number(en.data.score ?? 100);
              this.enemyFireTimers.delete(en.id);
              this.world.destroy(en.id);
            }
          }
          this.world.destroy(b.id);
          break;
        }
      }
    }

    // Damage player helper
    const hurtPlayer = () => {
      if (this.iframeMs > 0) return;
      this.lives -= 1;
      this.iframeMs = PLAYER_IFRAME_MS;
      if (this.lives <= 0) this.lost = true;
    };

    // Enemy bullets vs player
    if (!this.lost) {
      const pr = PLAYER_RADIUS;
      for (const b of eBullets) {
        if (!b.transform || !this.world.has(b.id)) continue;
        const br = b.collider?.kind === "circle" ? b.collider.r : BULLET_RADIUS;
        const d = Math.hypot(
          b.transform.x - player.transform.x,
          b.transform.y - player.transform.y,
        );
        if (d < br + pr) {
          this.world.destroy(b.id);
          hurtPlayer();
          if (this.lost) return;
        }
      }

      // Enemy body vs player
      for (const en of this.world.all().filter((e) => e.tags.includes("enemy"))) {
        if (!en.transform) continue;
        const er = en.collider?.kind === "circle" ? en.collider.r : 10;
        const d = Math.hypot(
          en.transform.x - player.transform.x,
          en.transform.y - player.transform.y,
        );
        if (d < er + pr) hurtPlayer();
      }
    }
  }

  private cullOffscreen(): void {
    const margin = 40;
    for (const e of this.world.all()) {
      if (!e.transform) continue;
      if (e.id === this.playerId) continue;
      const { x, y } = e.transform;
      if (
        x < -margin ||
        x > this.width + margin ||
        y < -margin ||
        y > this.height + margin
      ) {
        if (e.tags.includes("enemy")) this.enemyFireTimers.delete(e.id);
        this.world.destroy(e.id);
      }
    }
  }

  private checkEnd(): void {
    if (this.lost) return;
    const allWavesDone = this.waveList.every((w) => this.wavesFired.has(w.id));
    const enemiesLeft = this.world.all().some((e) => e.tags.includes("enemy"));
    if (allWavesDone && !enemiesLeft && this.waveList.length > 0) {
      this.won = true;
    }
  }

  observeBlob(): Record<string, unknown> {
    const p = this.world.get(this.playerId);
    return {
      stageId: this.stage.id,
      time: this.time,
      lives: this.lives,
      score: this.score,
      won: this.won,
      lost: this.lost,
      wavesFired: [...this.wavesFired],
      enemyCount: this.world.all().filter((e) => e.tags.includes("enemy")).length,
      bulletCount: this.world.all().filter((e) => e.tags.includes("bullet"))
        .length,
      player: {
        x: p?.transform?.x ?? 0,
        y: p?.transform?.y ?? 0,
        iframeMs: this.iframeMs,
      },
    };
  }
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
