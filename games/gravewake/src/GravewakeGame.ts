import type { InputMap, World } from "@anvil/core";
import { TopdownSim, type ActorDef, type MapDef } from "@anvil/genre-topdown2d";
import type { AreaId, AreaMapDef, ProgressionDef } from "./types.js";

export type FxEvent =
  | { kind: "slash"; x: number; y: number; t: number }
  | { kind: "hit"; x: number; y: number; dmg: number; t: number }
  | { kind: "kill"; x: number; y: number; gold: number; t: number }
  | { kind: "levelup"; t: number }
  | { kind: "shake"; mag: number; t: number };

/**
 * Gravewake vertical-slice controller on Anvil topdown sim.
 */
export class GravewakeGame {
  private world: World;
  private actors: Record<string, ActorDef>;
  private areas: Record<string, AreaMapDef>;
  private progression: ProgressionDef;
  private sim: TopdownSim | null = null;
  private area: AreaId = "town";
  private xp = 0;
  private level = 1;
  private gold: number;
  private potions = 3;
  private victory = false;
  private killed = new Set<string>();
  private meleeCdMs = 0;
  private rng: () => number;
  private portalCooldownMs = 0;
  /** Live FX queue for the browser renderer */
  fx: FxEvent[] = [];
  kills = 0;

  constructor(
    world: World,
    actors: Record<string, ActorDef>,
    areas: Record<string, AreaMapDef>,
    progression: ProgressionDef,
    rng: () => number = Math.random,
  ) {
    this.world = world;
    this.actors = actors;
    this.areas = areas;
    this.progression = progression;
    this.gold = progression.startGold;
    this.rng = rng;
    this.enterArea("town");
  }

  getArea(): AreaId {
    return this.area;
  }

  isVictory(): boolean {
    return this.victory;
  }

  getSim(): TopdownSim | null {
    return this.sim;
  }

  private pushFx(ev: FxEvent): void {
    this.fx.push(ev);
    if (this.fx.length > 80) this.fx.splice(0, this.fx.length - 80);
  }

  private enterArea(id: AreaId, spawn?: { x: number; y: number }): void {
    const area = this.areas[id];
    if (!area) throw new Error(`Unknown area: ${id}`);
    this.area = id;
    this.killed.clear();
    this.portalCooldownMs = 600;

    for (const e of this.world.all()) this.world.destroy(e.id);

    const map: MapDef = {
      id: area.id,
      width: area.width,
      height: area.height,
      walls: area.walls,
      spawns: area.spawns,
      background: area.background,
    };
    this.sim = new TopdownSim(this.world, map, this.actors, this.rng);

    if (spawn) {
      const p = this.world.get("player");
      if (p?.transform) {
        p.transform.x = spawn.x;
        p.transform.y = spawn.y;
      }
    }
  }

  update(dt: number, input: InputMap): void {
    if (this.victory) return;
    if (!this.sim) return;

    const dtMs = dt * 1000;
    this.meleeCdMs = Math.max(0, this.meleeCdMs - dtMs);
    this.portalCooldownMs = Math.max(0, this.portalCooldownMs - dtMs);

    // Age FX
    for (const f of this.fx) f.t -= dt;
    this.fx = this.fx.filter((f) => f.t > 0);

    this.sim.update(dt, input);

    // Rite Slash — Space / click
    if (
      this.meleeCdMs <= 0 &&
      (input.isPressed("shoot") || input.isPressed("confirm"))
    ) {
      const pos = this.sim.getPlayerPos();
      const result = this.sim.playerMelee(
        this.progression.meleeRange,
        this.progression.meleeDamage,
      );
      this.meleeCdMs = 380;
      if (pos) {
        this.pushFx({ kind: "slash", x: pos.x, y: pos.y, t: 0.18 });
      }
      for (const t of result.targets) {
        this.pushFx({
          kind: "hit",
          x: t.x,
          y: t.y,
          dmg: t.dmg,
          t: 0.7,
        });
      }
      if (result.hits > 0) {
        this.pushFx({ kind: "shake", mag: 4 + result.hits * 2, t: 0.12 });
      }
    }

    if (input.isPressed("choice_1") || input.isPressed("play_card_1")) {
      this.usePotion();
    }

    this.grantXpForKills();
    if (this.portalCooldownMs <= 0) this.checkPortals();
    this.checkVictory();
  }

  private usePotion(): void {
    if (this.potions <= 0 || !this.sim) return;
    const p = this.world.get("player");
    if (!p?.health) return;
    if (p.health.hp >= p.health.max) return;
    p.health.hp = Math.min(
      p.health.max,
      p.health.hp + this.progression.potionHeal,
    );
    this.potions -= 1;
  }

  private grantXpForKills(): void {
    if (!this.sim) return;
    const blob = this.sim.observeBlob();
    const entities = blob.entities as Array<{
      id: string;
      actorId: string;
      team: string;
      dead: boolean;
      x: number;
      y: number;
    }>;
    for (const e of entities) {
      if (e.team !== "enemy" || !e.dead) continue;
      if (this.killed.has(e.id)) continue;
      this.killed.add(e.id);
      this.kills += 1;
      const xp = this.progression.xpPerKill[e.actorId] ?? 10;
      const goldGain = Math.max(3, Math.floor(xp / 2) + Math.floor(this.rng() * 6));
      this.xp += xp;
      this.gold += goldGain;
      this.pushFx({
        kind: "kill",
        x: e.x,
        y: e.y,
        gold: goldGain,
        t: 1.0,
      });
      this.pushFx({ kind: "shake", mag: 3, t: 0.1 });
      const before = this.level;
      this.levelUp();
      if (this.level > before) {
        this.pushFx({ kind: "levelup", t: 1.4 });
      }
    }
  }

  private levelUp(): void {
    while (
      this.level < this.progression.xpToLevel.length &&
      this.xp >= this.progression.xpToLevel[this.level]!
    ) {
      this.level += 1;
      const p = this.world.get("player");
      if (p?.health) {
        p.health.max += 10;
        p.health.hp = p.health.max;
      }
      // small damage bump via progression side effect
      this.progression = {
        ...this.progression,
        meleeDamage: this.progression.meleeDamage + 2,
      };
    }
  }

  private checkPortals(): void {
    const area = this.areas[this.area];
    if (!area?.portals?.length || !this.sim) return;
    const p = this.world.get("player");
    if (!p?.transform) return;
    const px = p.transform.x;
    const py = p.transform.y;

    for (const portal of area.portals) {
      const inBox =
        px >= portal.x &&
        px <= portal.x + portal.w &&
        py >= portal.y &&
        py <= portal.y + portal.h;
      if (!inBox) continue;
      if (portal.requireClear && this.sim.livingEnemyCount() > 0) continue;
      this.enterArea(portal.to, { x: portal.spawnX, y: portal.spawnY });
      return;
    }
  }

  private checkVictory(): void {
    if (this.area !== "crypt" || !this.sim) return;
    if (this.sim.livingEnemyCount() === 0 && this.killed.size > 0) {
      this.victory = true;
    }
  }

  observeBlob(): Record<string, unknown> {
    const simBlob = this.sim?.observeBlob() ?? {};
    return {
      title: "Gravewake",
      area: this.area,
      areaName:
        this.area === "town"
          ? "Ashen Lychgate"
          : this.area === "parish"
            ? "Cinder Parish"
            : "Bellcrypt",
      xp: this.xp,
      level: this.level,
      gold: this.gold,
      potions: this.potions,
      victory: this.victory,
      lost: this.sim?.isLost() ?? false,
      livingEnemies: this.sim?.livingEnemyCount() ?? 0,
      kills: this.kills,
      meleeCdMs: this.meleeCdMs,
      topdown: simBlob,
    };
  }
}
