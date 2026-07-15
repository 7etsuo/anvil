import type { InputMap } from "@anvil/core";
import { castColumns, castRay } from "./dda.js";
import type {
  Billboard,
  Fps2EnemySpawn,
  Fps2LevelDef,
  Fps2MapDef,
  WallHit,
} from "./types.js";

interface EnemyState {
  id: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  radius: number;
  dead: boolean;
}

export class Fps2Sim {
  private map: Fps2MapDef;
  private level: Fps2LevelDef;
  private cells: number[][];
  x: number;
  y: number;
  angle: number;
  private moveSpeed: number;
  private turnSpeed: number;
  private fov: number;
  private screenCols: number;
  private weaponDamage: number;
  private weaponMaxDist: number;
  private aimConeRad: number;
  private fireCooldownMs: number;
  private fireTimer = 0;
  private playerRadius: number;
  private enemies: EnemyState[] = [];
  private won = false;
  private lost = false;
  private lastShotHit: string | null = null;
  private lastCenterHit: WallHit | null = null;

  constructor(map: Fps2MapDef, level: Fps2LevelDef) {
    this.map = map;
    this.level = level;
    this.cells = map.cells.map((row) => [...row]);
    const start = map.playerStart ?? { x: 1.5, y: 1.5, angle: 0 };
    this.x = start.x;
    this.y = start.y;
    this.angle = start.angle ?? 0;
    this.moveSpeed = level.moveSpeed ?? 3;
    this.turnSpeed = level.turnSpeed ?? 2.5;
    this.fov = level.fov ?? Math.PI / 3;
    this.screenCols = level.screenCols ?? 80;
    this.weaponDamage = level.weaponDamage ?? 1;
    this.weaponMaxDist = level.weaponMaxDist ?? 12;
    this.aimConeRad = level.aimConeRad ?? 0.12;
    this.fireCooldownMs = level.fireCooldownMs ?? 250;
    this.playerRadius = level.playerRadius ?? 0.2;

    const spawns: Fps2EnemySpawn[] = map.enemies ?? [];
    this.enemies = spawns.map((s, i) => ({
      id: s.id ?? `enemy_${i}`,
      x: s.x,
      y: s.y,
      hp: s.hp ?? 3,
      maxHp: s.hp ?? 3,
      radius: s.radius ?? 0.35,
      dead: false,
    }));
  }

  update(dt: number, input: InputMap): void {
    if (this.won || this.lost) return;

    this.fireTimer = Math.max(0, this.fireTimer - dt * 1000);

    if (input.isDown("turn_left")) this.angle -= this.turnSpeed * dt;
    if (input.isDown("turn_right")) this.angle += this.turnSpeed * dt;

    let mx = 0;
    let my = 0;
    // Spec: move_forward/back/left/right; also accept WASD move_* for agents
    if (input.isDown("move_forward") || input.isDown("move_up")) {
      mx += Math.cos(this.angle);
      my += Math.sin(this.angle);
    }
    if (input.isDown("move_back") || input.isDown("move_down")) {
      mx -= Math.cos(this.angle);
      my -= Math.sin(this.angle);
    }
    // strafe
    if (input.isDown("move_left")) {
      mx += Math.cos(this.angle - Math.PI / 2);
      my += Math.sin(this.angle - Math.PI / 2);
    }
    if (input.isDown("move_right")) {
      mx += Math.cos(this.angle + Math.PI / 2);
      my += Math.sin(this.angle + Math.PI / 2);
    }

    if (mx !== 0 || my !== 0) {
      const len = Math.hypot(mx, my) || 1;
      const step = this.moveSpeed * dt;
      this.tryMove((mx / len) * step, (my / len) * step);
    }

    if (
      (input.isPressed("shoot") || input.isDown("shoot")) &&
      this.fireTimer <= 0
    ) {
      this.fireTimer = this.fireCooldownMs;
      this.doHitscan();
    }

    this.lastCenterHit = castRay(this.cells, this.x, this.y, this.angle);

    // Win: clear all enemies; optional exit cell is for future levels
    if (this.enemies.length > 0 && this.enemies.every((e) => e.dead)) {
      this.won = true;
    } else {
      const ex = this.map.exit;
      if (ex) {
        const r = ex.radius ?? 0.6;
        if (Math.hypot(this.x - ex.x, this.y - ex.y) < r) {
          this.won = true;
        }
      }
    }
  }

  private tryMove(dx: number, dy: number): void {
    const nx = this.x + dx;
    const ny = this.y + dy;
    if (!this.solidAt(nx, this.y)) this.x = nx;
    if (!this.solidAt(this.x, ny)) this.y = ny;
  }

  /** True if circle of playerRadius around (px,py) overlaps a wall cell. */
  solidAt(px: number, py: number): boolean {
    const r = this.playerRadius;
    const samples = [
      [px - r, py - r],
      [px + r, py - r],
      [px - r, py + r],
      [px + r, py + r],
      [px, py],
    ];
    for (const [sx, sy] of samples) {
      const cx = Math.floor(sx!);
      const cy = Math.floor(sy!);
      if (this.wallCell(cx, cy)) return true;
    }
    return false;
  }

  wallCell(cx: number, cy: number): boolean {
    if (cy < 0 || cx < 0 || cy >= this.cells.length) return true;
    const row = this.cells[cy]!;
    if (cx >= row.length) return true;
    return row[cx]! > 0;
  }

  private doHitscan(): void {
    this.lastShotHit = null;
    let best: EnemyState | null = null;
    let bestDist = this.weaponMaxDist;

    for (const e of this.enemies) {
      if (e.dead) continue;
      const dx = e.x - this.x;
      const dy = e.y - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist > this.weaponMaxDist || dist < 1e-6) continue;
      const ang = Math.atan2(dy, dx);
      let diff = ang - this.angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      if (Math.abs(diff) > this.aimConeRad) continue;

      // wall occlusion: if wall closer than enemy, miss
      const wall = castRay(this.cells, this.x, this.y, this.angle);
      if (wall && wall.dist < dist - 0.05) continue;

      if (dist < bestDist) {
        bestDist = dist;
        best = e;
      }
    }

    if (best) {
      best.hp -= this.weaponDamage;
      this.lastShotHit = best.id;
      if (best.hp <= 0) {
        best.hp = 0;
        best.dead = true;
      }
    }
  }

  /** Force a shot (tests). */
  shoot(): void {
    this.fireTimer = 0;
    this.doHitscan();
  }

  getBillboards(): Billboard[] {
    return this.enemies.map((e) => {
      const dx = e.x - this.x;
      const dy = e.y - this.y;
      const dist = Math.hypot(dx, dy);
      let angleDiff = Math.atan2(dy, dx) - this.angle;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      return {
        id: e.id,
        x: e.x,
        y: e.y,
        dist,
        angleDiff,
        hp: e.hp,
        maxHp: e.maxHp,
        dead: e.dead,
      };
    });
  }

  getColumns(): Array<WallHit | null> {
    return castColumns(
      this.cells,
      this.x,
      this.y,
      this.angle,
      this.fov,
      this.screenCols,
    );
  }

  observeBlob(): Record<string, unknown> {
    const cols = this.getColumns();
    const center = cols[Math.floor(cols.length / 2)] ?? this.lastCenterHit;
    return {
      levelId: this.level.id,
      mapId: this.map.id,
      player: {
        x: this.x,
        y: this.y,
        angle: this.angle,
      },
      won: this.won,
      lost: this.lost,
      lastShotHit: this.lastShotHit,
      centerRay: center
        ? {
            dist: center.dist,
            mapX: center.mapX,
            mapY: center.mapY,
            texId: center.texId,
            side: center.side,
          }
        : null,
      billboards: this.getBillboards(),
      enemyCount: this.enemies.filter((e) => !e.dead).length,
      columnCount: cols.length,
      columnsSample: cols
        .filter(Boolean)
        .slice(0, 5)
        .map((c) => c!.dist),
    };
  }
}
