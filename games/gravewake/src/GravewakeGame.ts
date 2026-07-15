import type {
  AbilitySystem,
  CharacterSheet,
  EventBus,
  InputMap,
  ItemDef,
  ParticleSystem,
  QuestSystem,
  World,
} from "@anvil/core";
import {
  AbilitySystem as Abilities,
  CharacterSheet as Sheet,
  buildRunState,
  dropFromTable,
  emitHit,
  emitKill,
  generateDungeon,
  generateOverworld,
  loadRunFromLocalStorage,
  LOOT_GOLD_RADIUS,
  LOOT_ITEM_RADIUS,
  saveRunToLocalStorage,
  tryPickupNearest,
} from "@anvil/core";
import {
  PackSpawner,
  TopdownSim,
  type ActorDef,
  type MapDef,
} from "@anvil/genre-topdown2d";
import { areaToTileMap, wallsForSim } from "./tileAreas.js";
import type { TileMap } from "@anvil/core";
import type {
  AreaId,
  AreaMapDef,
  PortalDef,
  ProgressionDef,
  SkillId,
} from "./types.js";

export type FxEvent =
  | { kind: "slash"; x: number; y: number; t: number; skill: SkillId }
  | { kind: "hit"; x: number; y: number; dmg: number; t: number; crit?: boolean }
  | { kind: "kill"; x: number; y: number; gold: number; t: number }
  | { kind: "loot"; x: number; y: number; name: string; t: number }
  | { kind: "levelup"; t: number }
  | { kind: "shake"; mag: number; t: number }
  | { kind: "banner"; text: string; t: number }
  | { kind: "float"; x: number; y: number; text: string; color: string; t: number };

export interface GravewakeServices {
  particles?: ParticleSystem;
  quests?: QuestSystem;
  events?: EventBus;
  abilities?: AbilitySystem;
}

const BOSS_IDS = new Set([
  "bellwarden",
  "death_knight",
  "bone_tyrant",
]);

/**
 * Endless Diablo-like Gravewake: open wastes, dungeons, timed packs, scaling threat.
 */
export class GravewakeGame {
  private world: World;
  private actors: Record<string, ActorDef>;
  private areas: Record<string, AreaMapDef>;
  private progression: ProgressionDef;
  private items: Record<string, ItemDef>;
  private lootTables: Record<
    string,
    {
      id: string;
      entries: Array<{ item: string; weight: number; min?: number; max?: number }>;
    }
  >;
  private sim: TopdownSim | null = null;
  private area: AreaId = "town";
  private sheet: CharacterSheet;
  private killed = new Set<string>();
  private cd: Record<SkillId, number> = {
    slash: 0,
    whirl: 0,
    smite: 0,
    potion: 0,
  };
  private rng: () => number;
  private exitCooldownMs = 0;
  private blockedBannerCd = 0;
  private services: GravewakeServices;
  private abilities: AbilitySystem;
  private showInv = false;
  private showStats = false;
  private spawner: PackSpawner | null = null;
  private tileMap: TileMap | null = null;
  private procSeedBump = 0;
  private liveArea: AreaMapDef | null = null;
  private bossSlainOnce = false;
  private timeAlive = 0;
  private bossesKilled = 0;
  fx: FxEvent[] = [];
  kills = 0;
  exitHint = "";
  lastSkill: SkillId = "slash";
  /** Never freezes the game — true only as a one-shot milestone flag for UI. */
  milestoneBoss = false;

  constructor(
    world: World,
    actors: Record<string, ActorDef>,
    areas: Record<string, AreaMapDef>,
    progression: ProgressionDef,
    items: Record<string, ItemDef> = {},
    lootTables: Record<
      string,
      {
        id: string;
        entries: Array<{ item: string; weight: number; min?: number; max?: number }>;
      }
    > = {},
    rng: () => number = Math.random,
    services: GravewakeServices = {},
  ) {
    this.world = world;
    this.actors = actors;
    this.areas = areas;
    this.progression = progression;
    this.items = items;
    this.lootTables = lootTables;
    this.rng = rng;
    this.services = services;
    this.abilities = services.abilities ?? new Abilities();
    this.abilities.registerAll([
      {
        id: "slash",
        name: "Slash",
        cooldownMs: 260,
        targeting: "aoe_around_self",
        range: progression.meleeRange,
        damageMul: 1,
        vfx: "slash",
      },
      {
        id: "whirl",
        name: "Whirl",
        cooldownMs: 800,
        targeting: "aoe_around_self",
        range: progression.meleeRange * 1.3,
        damageMul: progression.whirlDamageMul ?? 0.78,
        vfx: "whirl",
      },
      {
        id: "smite",
        name: "Smite",
        cooldownMs: 620,
        targeting: "nearest_enemy",
        range: progression.smiteRange ?? 170,
        damageMul: progression.smiteDamageMul ?? 1.4,
        vfx: "smite",
      },
      {
        id: "potion",
        name: "Potion",
        cooldownMs: 400,
        targeting: "self",
        cost: 1,
        costResource: "health_potion",
        vfx: "heal",
      },
    ]);

    this.sheet = new Sheet({
      itemDefs: items,
      gold: progression.startGold,
      inventoryCapacity: 32,
      baseStats: {
        maxHp: 130,
        damage: progression.meleeDamage,
        armor: 2,
        speed: 205,
        critChance: 0.08,
        critMult: 1.8,
      },
      level: 1,
      xp: 0,
    });
    this.sheet.pickup("rusty_sword");
    const sword = this.sheet.inventory.findByDef("rusty_sword");
    if (sword) this.sheet.equip(sword.uid);
    this.sheet.pickup("health_potion", 5);

    this.services.quests?.register({
      id: "wake_of_ashes",
      title: "Wake of Ashes",
      autoStart: true,
      steps: [
        {
          id: "leave",
          description: "Leave the Lychgate into the Wastes",
          completeFlag: "entered_wastes",
        },
        {
          id: "slay",
          description: "Slay the dead",
          countKey: "kill",
          countTarget: 15,
        },
        {
          id: "dungeon",
          description: "Enter any dungeon",
          completeFlag: "entered_dungeon",
        },
        {
          id: "boss",
          description: "Fell a dungeon lord",
          completeFlag: "boss_slain",
        },
      ],
    });

    // Try restore run (browser) — non-fatal if missing
    const restored = this.tryRestoreRun();
    if (!restored) this.enterArea("town");
  }

  getSheet(): CharacterSheet {
    return this.sheet;
  }

  /** Persist sheet + area + position for continue. */
  saveRun(seed = 1): void {
    const pos = this.sim?.getPlayerPos() ?? { x: 200, y: 320 };
    const state = buildRunState({
      gameId: "gravewake",
      areaId: this.area,
      playerX: pos.x,
      playerY: pos.y,
      seed,
      character: this.sheet.toJSON(),
      flags: {
        kills: this.kills,
        bossesKilled: this.bossesKilled,
        bossSlainOnce: this.bossSlainOnce,
        timeAlive: this.timeAlive,
      },
    });
    saveRunToLocalStorage(state, "run0");
  }

  private tryRestoreRun(): boolean {
    try {
      const st = loadRunFromLocalStorage("gravewake", "run0");
      if (!st || !this.areas[st.areaId]) return false;
      this.sheet.loadJSON(st.character);
      this.kills = Number(st.flags.kills ?? 0);
      this.bossesKilled = Number(st.flags.bossesKilled ?? 0);
      this.bossSlainOnce = Boolean(st.flags.bossSlainOnce);
      this.enterArea(st.areaId, { x: st.playerX, y: st.playerY });
      this.syncPlayerFromSheet();
      return true;
    } catch {
      return false;
    }
  }

  isInventoryOpen(): boolean {
    return this.showInv;
  }

  isStatsOpen(): boolean {
    return this.showStats;
  }

  getArea(): AreaId {
    return this.area;
  }

  /** Infinite game — never “won”. Kept for tests. */
  isVictory(): boolean {
    return false;
  }

  getSim(): TopdownSim | null {
    return this.sim;
  }

  getPortals(): PortalDef[] {
    return (this.liveArea ?? this.areas[this.area])?.portals ?? [];
  }

  /** Live geometry (procgen walls/size) for the current zone. */
  getLiveArea(): AreaMapDef | null {
    return this.liveArea ?? this.areas[this.area] ?? null;
  }

  /**
   * Diablo-style click in world space.
   * Enemy near click → path + auto engage; empty ground → move.
   */
  clickWorld(x: number, y: number): void {
    if (!this.sim || this.sim.isLost()) return;
    const enemy = this.sim.nearestEnemy(x, y, 56);
    if (enemy) {
      const e = this.world.get(enemy);
      if (e?.transform) {
        this.sim.setMoveTarget(e.transform.x, e.transform.y, {
          autoEngage: true,
        });
        return;
      }
    }
    this.sim.setMoveTarget(x, y, { autoEngage: false });
  }

  private pushFx(ev: FxEvent): void {
    this.fx.push(ev);
    if (this.fx.length > 140) this.fx.splice(0, this.fx.length - 140);
  }

  private threatTier(): number {
    const areaThreat = this.areas[this.area]?.threat ?? 0;
    const perLv = this.progression.threatPerLevel ?? 0.12;
    const perKill = this.progression.threatPerKills ?? 0.02;
    return (
      areaThreat +
      Math.max(0, this.sheet.level - 1) * perLv +
      this.kills * perKill +
      this.bossesKilled * 0.25
    );
  }

  private scaleForThreat(): { hpMul: number; dmgMul: number; speedMul: number } {
    const t = this.threatTier();
    return {
      hpMul: 1 + t * 0.35,
      dmgMul: 1 + t * 0.18,
      speedMul: 1 + Math.min(0.35, t * 0.04),
    };
  }

  private syncPlayerFromSheet(): void {
    const p = this.world.get("player");
    if (!p?.health) return;
    const stats = this.sheet.finalStats();
    const ratio = p.health.hp / Math.max(1, p.health.max);
    p.health.max = Math.floor(stats.maxHp);
    p.health.hp = Math.max(1, Math.floor(p.health.max * ratio));
  }

  /**
   * Materialize area: hub stays authored; overworld/dungeon use engine procgen
   * (walls + layout) while keeping portals/loot/respawn metadata.
   */
  private materializeArea(area: AreaMapDef): AreaMapDef {
    const enemyPool =
      area.respawn?.packTable ??
      area.packTable ??
      ["scuttler", "fallen", "thrall", "wretch"];
    if (area.kind === "overworld") {
      const gen = generateOverworld({
        id: area.id,
        width: area.width,
        height: area.height,
        playerActor: "gravewarden",
        enemyActors: enemyPool,
        enemyCount: [0, 0], // packs still via buildInitialSpawns / PackSpawner
        westExit: true,
        eastExit: false,
        rockCount: [28, 50],
        rng: this.rng,
      });
      const playerSpawn =
        gen.spawns.find((s) => s.team === "player" || s.actor === "gravewarden") ??
        gen.spawns[0];
      return {
        ...area,
        width: gen.width,
        height: gen.height,
        walls: gen.walls,
        spawns: playerSpawn
          ? [
              {
                actor: "gravewarden",
                x: playerSpawn.x,
                y: playerSpawn.y,
                team: "player",
              },
            ]
          : area.spawns,
      };
    }
    if (area.kind === "dungeon") {
      const bosses = area.spawns
        .filter((s) => s.team === "enemy" || s.actor !== "gravewarden")
        .map((s) => s.actor)
        .filter((a) => ["bellwarden", "death_knight", "bone_tyrant"].includes(a));
      const gen = generateDungeon({
        id: area.id,
        width: area.width,
        height: area.height,
        seed: (this.procSeedBump++ + area.id.length * 17) | 0,
        playerActor: "gravewarden",
        enemyActors: enemyPool,
        enemyCount: area.respawn?.initialPack ?? [6, 12],
        roomCount: [5, 10],
        rng: this.rng,
      });
      const spawns = gen.spawns.map((s) =>
        s.team === "player" || s.actor === "player" || s.actor === "gravewarden"
          ? {
              actor: "gravewarden" as const,
              x: s.x,
              y: s.y,
              team: "player" as const,
            }
          : {
              actor: s.actor,
              x: s.x,
              y: s.y,
              team: "enemy" as const,
            },
      );
      // place boss near last room center if defined
      if (bosses[0]) {
        const last = gen.spawns[gen.spawns.length - 1];
        spawns.push({
          actor: bosses[0],
          x: (last?.x ?? gen.width * 0.75) + 40,
          y: last?.y ?? gen.height / 2,
          team: "enemy",
        });
      }
      return {
        ...area,
        width: gen.width,
        height: gen.height,
        walls: gen.walls,
        spawns,
        // dungeons: packs come from gen spawns; light continuous respawn still ok
      };
    }
    return area;
  }

  private enterArea(id: AreaId, spawn?: { x: number; y: number }): void {
    const base = this.areas[id];
    if (!base) throw new Error(`Unknown area: ${id}`);
    const area = this.materializeArea(base);
    this.area = id;
    this.killed.clear();
    this.exitCooldownMs = 800;
    this.exitHint = "";
    this.milestoneBoss = false;
    this.spawner = null;

    for (const e of this.world.all()) this.world.destroy(e.id);

    const spawns = this.buildInitialSpawns(area);
    this.tileMap = areaToTileMap(area, 32);
    const map: MapDef = {
      id: area.id,
      width: area.width,
      height: area.height,
      walls: wallsForSim(area, 32),
      spawns,
      background: area.background,
    };
    // cache materialized geometry for observe/render (portals still from base)
    this.liveArea = area;
    this.sim = new TopdownSim(this.world, map, this.actors, this.rng, {
      autoWinOnClear: false,
      aiActiveRadius: 560,
    });

    // Scale initial non-player spawns
    const scale = this.scaleForThreat();
    for (const e of this.world.all()) {
      if (!e.tags.includes("enemy") || !e.health) continue;
      e.health.max = Math.max(1, Math.floor(e.health.max * scale.hpMul));
      e.health.hp = e.health.max;
    }

    if (spawn) {
      const p = this.world.get("player");
      if (p?.transform) {
        p.transform.x = spawn.x;
        p.transform.y = spawn.y;
      }
    }
    this.syncPlayerFromSheet();

    if (area.respawn) {
      const r = area.respawn;
      this.spawner = new PackSpawner({
        intervalMs: r.intervalMs,
        maxLiving: r.maxLiving,
        packSize: () =>
          r.packSize[0] +
          Math.floor(this.rng() * (r.packSize[1] - r.packSize[0] + 1)),
        livingCount: () => this.sim?.livingEnemyCount() ?? 0,
        spawnOne: () => this.spawnRandomEnemy(area),
        enabled: () => !this.showInv,
      });
    }

    this.pushFx({ kind: "banner", text: area.name, t: 2.0 });
    if (id === "wastes") this.services.quests?.setFlag("entered_wastes");
    if (area.kind === "dungeon") this.services.quests?.setFlag("entered_dungeon");
    // autosave on zone change
    try {
      this.saveRun();
    } catch {
      /* headless / no localStorage */
    }
  }

  private buildInitialSpawns(area: AreaMapDef): MapDef["spawns"] {
    const base = area.spawns.filter(
      (s) =>
        s.team === "player" ||
        s.actor === "gravewarden" ||
        BOSS_IDS.has(s.actor),
    );
    const out = [...base];

    const packTable = area.respawn?.packTable ?? area.packTable;
    const range = area.respawn?.initialPack ?? area.packCount;
    if (!packTable?.length || !range) return out;

    const [lo, hi] = range;
    const count = lo + Math.floor(this.rng() * (hi - lo + 1));
    // Spawn as small packs (Diablo camp feel), not uniform soup
    let placed = 0;
    let guard = 0;
    while (placed < count && guard++ < count * 40) {
      const camp = this.randomOpenPoint(area, 180);
      if (!camp) break;
      const packN = Math.min(3, count - placed);
      for (let i = 0; i < packN; i++) {
        const ang = this.rng() * Math.PI * 2;
        const rad = 12 + this.rng() * 40;
        const x = camp.x + Math.cos(ang) * rad;
        const y = camp.y + Math.sin(ang) * rad;
        if (this.hitsWall(area, x, y, 14)) continue;
        const actor = packTable[Math.floor(this.rng() * packTable.length)]!;
        out.push({ actor, x, y, team: "enemy" });
        placed++;
        if (placed >= count) break;
      }
    }
    return out;
  }

  private randomOpenPoint(
    area: AreaMapDef,
    minPlayerDist: number,
  ): { x: number; y: number } | null {
    const p = this.world.get("player")?.transform;
    for (let i = 0; i < 40; i++) {
      const x = 70 + this.rng() * (area.width - 140);
      const y = 70 + this.rng() * (area.height - 140);
      if (this.hitsWall(area, x, y, 16)) continue;
      if (p && Math.hypot(x - p.x, y - p.y) < minPlayerDist) continue;
      return { x, y };
    }
    return null;
  }

  private spawnRandomEnemy(area: AreaMapDef): boolean {
    if (!this.sim) return false;
    const table = area.respawn?.packTable ?? area.packTable;
    if (!table?.length) return false;
    // Reinforce off-screen — never drop on top of the player
    const p = this.sim.getPlayerPos();
    let pt: { x: number; y: number } | null = null;
    if (p) {
      for (let i = 0; i < 32; i++) {
        const ang = this.rng() * Math.PI * 2;
        // far ring: feels like roaming packs, not cheat spawns
        const dist = 420 + this.rng() * 520;
        const x = p.x + Math.cos(ang) * dist;
        const y = p.y + Math.sin(ang) * dist;
        if (x < 80 || y < 80 || x > area.width - 80 || y > area.height - 80)
          continue;
        if (this.hitsWall(area, x, y, 18)) continue;
        pt = { x, y };
        break;
      }
    }
    if (!pt) pt = this.randomOpenPoint(area, 360);
    if (!pt) return false;
    const actorId = table[Math.floor(this.rng() * table.length)]!;
    const def = this.actors[actorId];
    if (!def) return false;
    const scale = this.scaleForThreat();
    const elite = this.rng() < 0.05;
    this.sim.spawnActorPublic(def, pt.x, pt.y, "enemy", {
      hpMul: scale.hpMul * (elite ? 2.0 : 1),
      dmgMul: scale.dmgMul * (elite ? 1.4 : 1),
      speedMul: Math.min(1.15, scale.speedMul),
    });
    return true;
  }

  private hitsWall(
    area: AreaMapDef,
    x: number,
    y: number,
    r: number,
  ): boolean {
    for (const w of area.walls) {
      const nx = Math.max(w.x, Math.min(x, w.x + w.w));
      const ny = Math.max(w.y, Math.min(y, w.y + w.h));
      if (Math.hypot(x - nx, y - ny) < r) return true;
    }
    return false;
  }

  update(dt: number, input: InputMap): void {
    if (!this.sim) return;
    this.timeAlive += dt;

    const dtMs = dt * 1000;
    for (const k of Object.keys(this.cd) as SkillId[]) {
      this.cd[k] = Math.max(0, this.cd[k]! - dtMs);
    }
    this.abilities.update(dtMs);
    this.exitCooldownMs = Math.max(0, this.exitCooldownMs - dtMs);
    this.blockedBannerCd = Math.max(0, this.blockedBannerCd - dtMs);
    for (const f of this.fx) f.t -= dt;
    this.fx = this.fx.filter((f) => f.t > 0);

    this.sim.update(dt, input);

    // Auto-attack while click-chasing an enemy
    const ppos = this.sim.getPlayerPos();
    if (ppos && this.sim.isAutoEngage() && this.cd.slash <= 0) {
      const near = this.sim.nearestEnemy(
        ppos.x,
        ppos.y,
        this.progression.meleeRange * 0.95,
      );
      if (near) this.cast("slash");
    }

    // skills
    if (input.isPressed("shoot") || input.isPressed("confirm")) this.cast("slash");
    if (input.isPressed("play_card_2") || input.isPressed("choice_2"))
      this.cast("whirl");
    if (input.isPressed("play_card_3") || input.isPressed("choice_3"))
      this.cast("smite");
    if (input.isPressed("choice_1") || input.isPressed("play_card_1"))
      this.cast("potion");
    if (input.isPressed("inventory")) {
      this.showInv = !this.showInv;
      if (this.showInv) this.showStats = false;
    }
    // C = character stats (base + gear) — bind once
    input.defineAction("character");
    input.bindKey("character", "KeyC");
    if (input.isPressed("character")) {
      this.showStats = !this.showStats;
      if (this.showStats) this.showInv = false;
    }
    if (input.isPressed("interact")) {
      if (!this.tryVendor()) this.tryLoot();
    }

    this.autoPickupGold();
    this.grantXpForKills();

    // slow reinforcements only (not endless wave spam)
    if (this.spawner) {
      this.spawner.update(dtMs);
    }
    // corpse cleanup every few seconds worth of frames
    if (this.killed.size > 40) {
      this.sim.purgeDeadEnemies();
    }

    if (this.exitCooldownMs <= 0) {
      this.checkPortals();
      this.checkExits();
    }
  }

  private cast(skill: SkillId): void {
    if (!this.sim || this.cd[skill] > 0) return;
    if (skill === "potion") {
      this.usePotion();
      this.cd.potion = 400;
      return;
    }
    const stats = this.sheet.finalStats();
    const isCrit = this.rng() < stats.critChance;
    const base = stats.damage;
    let dmg: number;
    let range: number;
    if (skill === "slash") {
      dmg = Math.floor(base * (isCrit ? stats.critMult : 1));
      range = this.progression.meleeRange;
    } else if (skill === "whirl") {
      const mul = this.progression.whirlDamageMul ?? 0.75;
      dmg = Math.floor(base * mul * (isCrit ? stats.critMult : 1));
      range = this.progression.meleeRange * 1.3;
    } else {
      const mul = this.progression.smiteDamageMul ?? 1.35;
      dmg = Math.floor(base * mul * (isCrit ? stats.critMult : 1));
      range = this.progression.smiteRange ?? 160;
    }

    const pos = this.sim.getPlayerPos();
    if (!pos) return;

    const result =
      skill === "smite"
        ? this.sim.playerMeleeNearest(range, dmg)
        : this.sim.playerMelee(range, dmg);

    this.lastSkill = skill;
    this.cd[skill] =
      skill === "slash" ? 260 : skill === "whirl" ? 800 : 620;

    this.pushFx({ kind: "slash", x: pos.x, y: pos.y, t: 0.28, skill });
    this.services.particles?.burst({
      x: pos.x,
      y: pos.y,
      count: skill === "whirl" ? 30 : 14,
      speed: skill === "smite" ? 180 : 110,
      color:
        skill === "smite"
          ? "rgba(120,180,255,1)"
          : skill === "whirl"
            ? "rgba(255,160,60,1)"
            : "rgba(255,210,100,1)",
      life: 0.4,
    });

    // Keep AbilitySystem cooldowns in sync for observe / multiplayer later
    this.abilities.tryCast("player", skill, {
      x: pos.x,
      y: pos.y,
      baseDamage: base,
    });

    for (const t of result.targets) {
      this.pushFx({
        kind: "hit",
        x: t.x,
        y: t.y,
        dmg,
        t: isCrit ? 1 : 0.7,
        crit: isCrit,
      });
      if (this.services.events) {
        emitHit(this.services.events, {
          attackerId: "player",
          targetId: "enemy",
          damage: dmg,
          x: t.x,
          y: t.y,
          crit: isCrit,
          abilityId: skill,
        });
      }
      this.services.particles?.burst({
        x: t.x,
        y: t.y,
        count: isCrit ? 14 : 7,
        speed: 100,
        color: isCrit ? "rgba(255,220,80,1)" : "rgba(220,40,40,1)",
        life: 0.3,
      });
    }
    if (result.hits > 0) {
      this.pushFx({
        kind: "shake",
        mag: (isCrit ? 5 : 3) + result.hits,
        t: 0.12,
      });
    }
  }

  private usePotion(): void {
    const stack = this.sheet.inventory.findByDef("health_potion");
    if (!stack || stack.qty <= 0) {
      this.pushFx({
        kind: "float",
        x: this.sim?.getPlayerPos()?.x ?? 0,
        y: this.sim?.getPlayerPos()?.y ?? 0,
        text: "No potions",
        color: "#e88",
        t: 1,
      });
      return;
    }
    const p = this.world.get("player");
    if (!p?.health || p.health.hp >= p.health.max) return;
    this.sheet.inventory.remove(stack.uid, 1);
    const heal = this.progression.potionHeal;
    p.health.hp = Math.min(p.health.max, p.health.hp + heal);
    this.pushFx({
      kind: "float",
      x: p.transform?.x ?? 0,
      y: p.transform?.y ?? 0,
      text: `+${heal}`,
      color: "#6f6",
      t: 1,
    });
  }

  /** Town vendor: buy potions for gold when near the shrine. */
  private tryVendor(): boolean {
    if (this.area !== "town") return false;
    const pos = this.sim?.getPlayerPos();
    if (!pos) return false;
    // shrine near NW ruins
    if (Math.hypot(pos.x - 220, pos.y - 160) > 70) return false;
    const cost = 25;
    if (this.sheet.gold < cost) {
      this.pushFx({
        kind: "float",
        x: pos.x,
        y: pos.y,
        text: "Need 25g",
        color: "#e88",
        t: 1,
      });
      return true;
    }
    this.sheet.addGold(-cost);
    this.sheet.pickup("health_potion", 1);
    this.pushFx({
      kind: "float",
      x: pos.x,
      y: pos.y,
      text: "Potion −25g",
      color: "#6f6",
      t: 1.1,
    });
    this.pushFx({
      kind: "banner",
      text: "Ash shrine grants a draught",
      t: 1.4,
    });
    return true;
  }

  private tryLoot(): void {
    const pos = this.sim?.getPlayerPos();
    if (!pos) return;
    const id = tryPickupNearest(this.world, pos.x, pos.y, 52, this.sheet);
    if (id) {
      this.pushFx({
        kind: "float",
        x: pos.x,
        y: pos.y,
        text: "Looted",
        color: "#fc6",
        t: 0.9,
      });
      this.autoEquipBest();
      this.syncPlayerFromSheet();
    }
  }

  private autoPickupGold(): void {
    const pos = this.sim?.getPlayerPos();
    if (!pos) return;
    // Diablo-style: gold + small radius auto-grab; gear needs F or very close
    for (const e of [...this.world.all()]) {
      if (!e.tags.includes("loot") || !e.transform) continue;
      const loot = e.data.loot as { defId?: string; gold?: number; qty?: number } | undefined;
      if (!loot) continue;
      const d = Math.hypot(e.transform.x - pos.x, e.transform.y - pos.y);
      if (loot.defId === "gold") {
        if (d > LOOT_GOLD_RADIUS) continue;
        this.sheet.addGold(loot.gold ?? 0);
        this.world.destroy(e.id);
        this.pushFx({
          kind: "float",
          x: e.transform.x,
          y: e.transform.y,
          text: `+${loot.gold}g`,
          color: "#fd4",
          t: 0.8,
        });
        continue;
      }
      // magnetic gear pickup when standing on it
      if (d > LOOT_ITEM_RADIUS) continue;
      const ok = this.sheet.pickup(loot.defId!, loot.qty ?? 1);
      if (!ok) continue;
      this.world.destroy(e.id);
      this.autoEquipBest();
      this.syncPlayerFromSheet();
      this.pushFx({
        kind: "float",
        x: e.transform.x,
        y: e.transform.y,
        text: this.items[loot.defId!]?.name ?? "Loot",
        color: "#acf",
        t: 1,
      });
    }
  }

  private autoEquipBest(): void {
    for (const stack of this.sheet.inventory.all()) {
      const def = this.items[stack.defId];
      if (!def?.slot) continue;
      const curUid = this.sheet.equipment.get(def.slot);
      if (!curUid) {
        this.sheet.equip(stack.uid);
        continue;
      }
      const cur = this.sheet.inventory.get(curUid);
      const curDef = cur ? this.items[cur.defId] : undefined;
      const score = (d?: ItemDef) =>
        (d?.stats?.damage ?? 0) * 3 +
        (d?.stats?.armor ?? 0) * 2 +
        (d?.stats?.maxHp ?? 0) * 0.5 +
        (d?.stats?.critChance ?? 0) * 40;
      if (score(def) > score(curDef)) this.sheet.equip(stack.uid);
    }
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
      this.services.quests?.addCount("kill", 1);

      const isBoss = BOSS_IDS.has(e.actorId);
      if (isBoss) {
        this.bossesKilled += 1;
        this.services.quests?.setFlag("boss_slain");
        this.services.quests?.setFlag("bellwarden_dead");
        this.milestoneBoss = true;
        this.bossSlainOnce = true;
        this.pushFx({
          kind: "banner",
          text: `${this.actors[e.actorId]?.name ?? "Lord"} slain — the hunt continues`,
          t: 3.2,
        });
        // boss loot burst
        for (let i = 0; i < 4; i++) {
          this.dropLoot(
            e.x + (this.rng() - 0.5) * 40,
            e.y + (this.rng() - 0.5) * 40,
            e.actorId,
          );
        }
        this.sheet.addGold(80 + Math.floor(this.rng() * 120));
      }

      let xp = this.progression.xpPerKill[e.actorId] ?? 10;
      const ent = this.world.get(e.id);
      if (ent?.data.elite) xp = Math.floor(xp * 2.5);
      const leveled = this.sheet.addXp(xp, this.progression.xpToLevel);
      if (!isBoss) this.dropLoot(e.x, e.y, e.actorId);
      this.pushFx({ kind: "kill", x: e.x, y: e.y, gold: 0, t: 0.45 });
      if (this.services.events) {
        emitKill(this.services.events, {
          killerId: "player",
          targetId: e.id,
          actorId: e.actorId,
          x: e.x,
          y: e.y,
        });
      }
      if (leveled) {
        this.pushFx({ kind: "levelup", t: 1.5 });
        this.syncPlayerFromSheet();
        const p = this.world.get("player");
        if (p?.health) p.health.hp = p.health.max;
        // small potion gift on level
        this.sheet.pickup("health_potion", 1);
      }
    }
  }

  private dropLoot(x: number, y: number, actorId: string): void {
    const area = this.areas[this.area];
    const tableId =
      BOSS_IDS.has(actorId) || (area?.threat ?? 0) >= 3
        ? area?.lootTable === "boss_pack"
          ? "boss_pack"
          : (area?.lootTable ?? "crypt_pack")
        : (area?.lootTable ?? "wastes_pack");
    const useId = BOSS_IDS.has(actorId)
      ? this.lootTables.boss_pack
        ? "boss_pack"
        : tableId
      : tableId;
    const table = this.lootTables[useId] ?? this.lootTables.wastes_pack;
    const drop = dropFromTable(this.world, x, y, table, {
      rng: this.rng,
      goldMul: 1 + Math.floor(this.threatTier()) * 0.25,
      scatter: 24,
      itemDefs: this.items,
    });
    if (drop.kind === "gold" && drop.gold) {
      this.pushFx({
        kind: "loot",
        x: drop.x,
        y: drop.y,
        name: `${drop.gold} gold`,
        t: 1.1,
      });
    } else if (drop.kind === "item" && drop.name) {
      this.pushFx({
        kind: "loot",
        x: drop.x,
        y: drop.y,
        name: drop.name,
        t: 1.3,
      });
    }
  }

  private pointInPortal(px: number, py: number, portal: PortalDef): boolean {
    return (
      px >= portal.x &&
      px <= portal.x + portal.w &&
      py >= portal.y &&
      py <= portal.y + portal.h
    );
  }

  private checkPortals(): void {
    // Portals stay from static content (metadata); geometry may be procgen
    const area = this.areas[this.area];
    if (!this.sim || !area?.portals?.length) return;
    const p = this.world.get("player");
    if (!p?.transform) return;
    const living = this.sim.livingEnemyCount();
    for (const portal of area.portals) {
      if (!this.pointInPortal(p.transform.x, p.transform.y, portal)) continue;
      if (portal.requireClear && living > 0) {
        this.exitHint = `Clear ${living} foes first`;
        continue;
      }
      this.exitHint = "";
      this.enterArea(portal.to, { x: portal.spawnX, y: portal.spawnY });
      return;
    }
  }

  private checkExits(): void {
    const area = this.liveArea ?? this.areas[this.area];
    if (!this.sim || !area) return;
    const p = this.world.get("player");
    if (!p?.transform) return;
    const px = p.transform.x;
    const py = p.transform.y;
    const margin = 28;
    const living = this.sim.livingEnemyCount();

    // near portal: show hint without edge exit
    for (const portal of area.portals ?? []) {
      const cx = portal.x + portal.w / 2;
      const cy = portal.y + portal.h / 2;
      if (Math.hypot(px - cx, py - cy) < 90) {
        this.exitHint = portal.label
          ? `Enter ${portal.label}`
          : "Enter portal";
      }
    }

    for (const ex of area.exits ?? []) {
      let hit = false;
      if (ex.edge === "east" && px >= area.width - margin) hit = true;
      if (ex.edge === "west" && px <= margin) hit = true;
      if (ex.edge === "south" && py >= area.height - margin) hit = true;
      if (ex.edge === "north" && py <= margin) hit = true;
      if (!hit) continue;

      if (ex.requireClear && living > 0) {
        this.exitHint = `Slay ${living} remaining`;
        if (this.blockedBannerCd <= 0) {
          this.pushFx({ kind: "banner", text: this.exitHint, t: 1.2 });
          this.blockedBannerCd = 1600;
        }
        if (ex.edge === "east") p.transform.x = area.width - margin - 4;
        if (ex.edge === "west") p.transform.x = margin + 4;
        continue;
      }
      this.exitHint = "";
      this.enterArea(ex.to, { x: ex.spawnX, y: ex.spawnY });
      return;
    }
  }

  observeBlob(): Record<string, unknown> {
    const simBlob = this.sim?.observeBlob() ?? {};
    const stats = this.sheet.finalStats();
    const p = this.world.get("player");
    const potions =
      this.sheet.inventory.findByDef("health_potion")?.qty ?? 0;
    const inv = this.sheet.inventory.all().map((s) => ({
      uid: s.uid,
      defId: s.defId,
      name: this.items[s.defId]?.name ?? s.defId,
      qty: s.qty,
      slot: this.items[s.defId]?.slot,
      rarity: this.items[s.defId]?.rarity ?? "common",
    }));
    const equipped: Record<string, string | null> = {};
    for (const [slot, uid] of Object.entries(this.sheet.equipment.all())) {
      if (!uid) {
        equipped[slot] = null;
        continue;
      }
      const st = this.sheet.inventory.get(uid);
      equipped[slot] = st
        ? (this.items[st.defId]?.name ?? st.defId)
        : null;
    }
    const questObj =
      this.services.quests?.currentObjective("wake_of_ashes") ?? null;
    const meta = this.areas[this.area];
    const area = this.liveArea ?? meta;

    return {
      title: "Gravewake",
      area: this.area,
      areaName: meta?.name ?? this.area,
      areaKind: meta?.kind ?? "hub",
      procgen: meta?.kind !== "hub",
      threat: Math.round(this.threatTier() * 10) / 10,
      xp: this.sheet.xp,
      level: this.sheet.level,
      gold: this.sheet.gold,
      potions,
      victory: false,
      milestoneBoss: this.milestoneBoss,
      bossSlainOnce: this.bossSlainOnce,
      bossesKilled: this.bossesKilled,
      lost: this.sim?.isLost() ?? false,
      livingEnemies: this.sim?.livingEnemyCount() ?? 0,
      kills: this.kills,
      timeAlive: Math.floor(this.timeAlive),
      exitHint: this.exitHint,
      inventoryOpen: this.showInv,
      statsOpen: this.showStats,
      inventory: inv,
      equipped,
      stats,
      /** Base vs gear vs final for character sheet UI */
      statBreakdown: this.sheet.statBreakdown(),
      hp: p?.health?.hp ?? 0,
      maxHp: p?.health?.max ?? stats.maxHp,
      cds: { ...this.cd },
      lastSkill: this.lastSkill,
      quest: questObj,
      /** Paper-doll layers from CharacterSheet (engine) */
      visualLayers: this.sheet.equippedVisuals(),
      bodyVariant: this.sheet.bodyVariant(),
      portals: (meta?.portals ?? []).map((pr) => ({
        x: pr.x,
        y: pr.y,
        w: pr.w,
        h: pr.h,
        label: pr.label,
        kind: pr.kind,
        to: pr.to,
      })),
      mapW: area?.width ?? 0,
      mapH: area?.height ?? 0,
      /** Live walls for renderer (procgen geometry). */
      walls: area?.walls ?? [],
      tileMap: this.tileMap
        ? {
            id: this.tileMap.id,
            tw: this.tileMap.width,
            th: this.tileMap.height,
            tileSize: this.tileMap.tileSize,
          }
        : null,
      topdown: simBlob,
    };
  }
}
