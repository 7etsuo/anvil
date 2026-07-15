import type { InputMap, World } from "@anvil/core";
import { TopdownSim, type ActorDef, type MapDef } from "@anvil/genre-topdown2d";
import type { AreaId, AreaMapDef, ProgressionDef } from "./types.js";

/**
 * Gravewake vertical-slice controller on Anvil topdown sim.
 * Areas: Ashen Lychgate (town) → Cinder Parish → Bellcrypt.
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

  private enterArea(id: AreaId, spawn?: { x: number; y: number }): void {
    const area = this.areas[id];
    if (!area) throw new Error(`Unknown area: ${id}`);
    this.area = id;
    this.killed.clear();

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

    this.meleeCdMs = Math.max(0, this.meleeCdMs - dt * 1000);
    this.sim.update(dt, input);

    // Rite Slash (shoot / confirm)
    if (
      this.meleeCdMs <= 0 &&
      (input.isPressed("shoot") || input.isPressed("confirm"))
    ) {
      const hit = this.sim.playerMelee(
        this.progression.meleeRange,
        this.progression.meleeDamage,
      );
      if (hit) this.meleeCdMs = 450;
    }

    // Potion (choice_1 as stand-in for digit 1 — also Digit1 may map play_card)
    if (input.isPressed("choice_1") || input.isPressed("play_card_1")) {
      this.usePotion();
    }

    this.grantXpForKills();
    this.checkPortals();
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
    }>;
    for (const e of entities) {
      if (e.team !== "enemy" || !e.dead) continue;
      if (this.killed.has(e.id)) continue;
      this.killed.add(e.id);
      const xp = this.progression.xpPerKill[e.actorId] ?? 10;
      this.xp += xp;
      this.gold += Math.floor(xp / 2);
      this.levelUp();
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
        p.health.max += 8;
        p.health.hp = p.health.max;
      }
    }
  }

  private checkPortals(input: InputMap): void {
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
      // Auto-transition when standing in portal volume
      this.enterArea(portal.to, { x: portal.spawnX, y: portal.spawnY });
      return;
    }
  }

  private checkVictory(): void {
    if (this.area !== "crypt" || !this.sim) return;
    if (this.sim.livingEnemyCount() === 0) {
      // only if crypt had enemies
      const had = this.areas.crypt?.spawns.some((s) => s.team === "enemy" || s.actor !== "gravewarden");
      if (had && this.killed.size > 0) this.victory = true;
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
      topdown: simBlob,
    };
  }
}
