import type {
  CharacterSheet,
  InputMap,
  ItemDef,
  ParticleSystem,
  QuestSystem,
  World,
} from "@anvil/core";
import {
  CharacterSheet as Sheet,
  rollLootTable,
  spawnGoldPile,
  spawnGroundLoot,
  tryPickupNearest,
} from "@anvil/core";
import { TopdownSim, type ActorDef, type MapDef } from "@anvil/genre-topdown2d";
import type { AreaId, AreaMapDef, ProgressionDef, SkillId } from "./types.js";

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
}

/**
 * Diablo-like Gravewake on Anvil: CharacterSheet, loot, equip, multi-skill combat,
 * random packs, quests, particles.
 */
export class GravewakeGame {
  private world: World;
  private actors: Record<string, ActorDef>;
  private areas: Record<string, AreaMapDef>;
  private progression: ProgressionDef;
  private items: Record<string, ItemDef>;
  private lootTables: Record<string, { id: string; entries: Array<{ item: string; weight: number; min?: number; max?: number }> }>;
  private sim: TopdownSim | null = null;
  private area: AreaId = "town";
  private sheet: CharacterSheet;
  private victory = false;
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
  private showInv = false;
  fx: FxEvent[] = [];
  kills = 0;
  exitHint = "";
  lastSkill: SkillId = "slash";

  constructor(
    world: World,
    actors: Record<string, ActorDef>,
    areas: Record<string, AreaMapDef>,
    progression: ProgressionDef,
    items: Record<string, ItemDef> = {},
    lootTables: Record<
      string,
      { id: string; entries: Array<{ item: string; weight: number; min?: number; max?: number }> }
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

    this.sheet = new Sheet({
      itemDefs: items,
      gold: progression.startGold,
      inventoryCapacity: 24,
      baseStats: {
        maxHp: 120,
        damage: progression.meleeDamage,
        armor: 2,
        speed: 200,
        critChance: 0.08,
        critMult: 1.75,
      },
      level: 1,
      xp: 0,
    });
    // starter gear
    this.sheet.pickup("rusty_sword");
    const sword = this.sheet.inventory.findByDef("rusty_sword");
    if (sword) this.sheet.equip(sword.uid);
    this.sheet.pickup("health_potion", 3);

    this.services.quests?.register({
      id: "parish_purge",
      title: "Purge the Parish",
      autoStart: true,
      steps: [
        { id: "enter", description: "Enter Cinder Parish", completeFlag: "entered_parish" },
        { id: "slay", description: "Slay the dead", countKey: "kill", countTarget: 8 },
        { id: "crypt", description: "Enter Bellcrypt", completeFlag: "entered_crypt" },
        { id: "boss", description: "Silence the Bellwarden", completeFlag: "bellwarden_dead" },
      ],
    });

    this.enterArea("town");
  }

  getSheet(): CharacterSheet {
    return this.sheet;
  }

  isInventoryOpen(): boolean {
    return this.showInv;
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
    if (this.fx.length > 120) this.fx.splice(0, this.fx.length - 120);
  }

  private syncPlayerFromSheet(): void {
    const p = this.world.get("player");
    if (!p?.health) return;
    const stats = this.sheet.finalStats();
    const ratio = p.health.hp / Math.max(1, p.health.max);
    p.health.max = Math.floor(stats.maxHp);
    p.health.hp = Math.max(1, Math.floor(p.health.max * ratio));
    // speed on actor runtime is private — damage used at skill time
  }

  private enterArea(id: AreaId, spawn?: { x: number; y: number }): void {
    const area = this.areas[id];
    if (!area) throw new Error(`Unknown area: ${id}`);
    this.area = id;
    this.killed.clear();
    this.exitCooldownMs = 700;
    this.exitHint = "";

    for (const e of this.world.all()) this.world.destroy(e.id);

    const spawns = this.buildSpawns(area);
    const map: MapDef = {
      id: area.id,
      width: area.width,
      height: area.height,
      walls: area.walls,
      spawns,
      background: area.background,
    };
    this.sim = new TopdownSim(this.world, map, this.actors, this.rng, {
      autoWinOnClear: false,
    });

    if (spawn) {
      const p = this.world.get("player");
      if (p?.transform) {
        p.transform.x = spawn.x;
        p.transform.y = spawn.y;
      }
    }
    this.syncPlayerFromSheet();

    const names: Record<AreaId, string> = {
      town: "Ashen Lychgate",
      parish: "Cinder Parish",
      crypt: "Bellcrypt",
    };
    this.pushFx({ kind: "banner", text: names[id], t: 2.0 });
    if (id === "parish") this.services.quests?.setFlag("entered_parish");
    if (id === "crypt") this.services.quests?.setFlag("entered_crypt");
  }

  private buildSpawns(area: AreaMapDef): MapDef["spawns"] {
    const base = area.spawns.filter(
      (s) => s.team === "player" || s.actor === "gravewarden" || s.actor === "bellwarden",
    );
    const out = [...base];
    const table = area.packTable;
    const range = area.packCount;
    if (!table?.length || !range) return out;

    const [lo, hi] = range;
    const count = lo + Math.floor(this.rng() * (hi - lo + 1));
    let placed = 0;
    let guard = 0;
    while (placed < count && guard++ < count * 20) {
      const x = 60 + this.rng() * (area.width - 120);
      const y = 60 + this.rng() * (area.height - 120);
      if (this.hitsWall(area, x, y, 14)) continue;
      // keep away from player spawn
      const ps = base.find((s) => s.team === "player" || s.actor === "gravewarden");
      if (ps && Math.hypot(x - ps.x, y - ps.y) < 100) continue;
      const actor = table[Math.floor(this.rng() * table.length)]!;
      out.push({ actor, x, y, team: "enemy" });
      placed++;
    }
    return out;
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
    if (this.victory) return;
    if (!this.sim) return;

    const dtMs = dt * 1000;
    for (const k of Object.keys(this.cd) as SkillId[]) {
      this.cd[k] = Math.max(0, this.cd[k]! - dtMs);
    }
    this.exitCooldownMs = Math.max(0, this.exitCooldownMs - dtMs);
    this.blockedBannerCd = Math.max(0, this.blockedBannerCd - dtMs);
    for (const f of this.fx) f.t -= dt;
    this.fx = this.fx.filter((f) => f.t > 0);

    this.sim.update(dt, input);

    // Skills
    if (input.isPressed("shoot") || input.isPressed("confirm")) {
      this.cast("slash");
    }
    if (input.isPressed("play_card_2") || input.isPressed("choice_2")) {
      this.cast("whirl");
    }
    if (input.isPressed("play_card_3") || input.isPressed("choice_3")) {
      this.cast("smite");
    }
    if (input.isPressed("choice_1") || input.isPressed("play_card_1")) {
      this.cast("potion");
    }
    if (input.isPressed("inventory") || input.isPressed("map")) {
      // map key as alt — use inventory key
    }
    if (input.isPressed("inventory")) {
      this.showInv = !this.showInv;
    }
    // Digit 0..9 equip from inventory when inv open is handled by browser UI;
    // F / interact = loot
    if (input.isPressed("interact")) {
      this.tryLoot();
    }

    // auto-pickup gold in range
    this.autoPickupGold();

    this.grantXpForKills();
    if (this.exitCooldownMs <= 0) this.checkExits();
    this.checkVictory();
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
      range = this.progression.meleeRange * 1.25;
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
      skill === "slash" ? 280 : skill === "whirl" ? 850 : 650;

    this.pushFx({ kind: "slash", x: pos.x, y: pos.y, t: 0.28, skill });
    this.services.particles?.burst({
      x: pos.x,
      y: pos.y,
      count: skill === "whirl" ? 28 : skill === "smite" ? 16 : 12,
      speed: skill === "smite" ? 180 : skill === "whirl" ? 140 : 100,
      color:
        skill === "smite"
          ? "rgba(120,180,255,1)"
          : skill === "whirl"
            ? "rgba(255,160,60,1)"
            : "rgba(255,210,100,1)",
      life: 0.4,
      size: skill === "whirl" ? 3 : 2,
    });

    for (const t of result.targets) {
      this.pushFx({
        kind: "hit",
        x: t.x,
        y: t.y,
        dmg,
        t: isCrit ? 1.0 : 0.75,
        crit: isCrit,
      });
      this.services.particles?.burst({
        x: t.x,
        y: t.y,
        count: isCrit ? 14 : 8,
        speed: isCrit ? 140 : 90,
        color: isCrit ? "rgba(255,220,80,1)" : "rgba(220,40,40,1)",
        life: 0.35,
      });
      if (skill === "smite") {
        // bolt line from player to target
        this.pushFx({
          kind: "float",
          x: t.x,
          y: t.y - 20,
          text: isCrit ? "SMITE!" : "Smite",
          color: "#8cf",
          t: 0.7,
        });
      }
    }
    if (result.hits > 0) {
      this.pushFx({
        kind: "shake",
        mag: (isCrit ? 5 : 3) + result.hits * 2,
        t: 0.14,
      });
    } else if (skill === "slash" || skill === "whirl") {
      // still spent the swing
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
    if (!p?.health) return;
    if (p.health.hp >= p.health.max) return;
    this.sheet.inventory.remove(stack.uid, 1);
    p.health.hp = Math.min(
      p.health.max,
      p.health.hp + this.progression.potionHeal,
    );
    this.pushFx({
      kind: "float",
      x: p.transform?.x ?? 0,
      y: p.transform?.y ?? 0,
      text: `+${this.progression.potionHeal}`,
      color: "#6f6",
      t: 1,
    });
  }

  private tryLoot(): void {
    const pos = this.sim?.getPlayerPos();
    if (!pos) return;
    const id = tryPickupNearest(this.world, pos.x, pos.y, 48, this.sheet);
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
    for (const e of this.world.all()) {
      if (!e.tags.includes("loot") || !e.transform) continue;
      const loot = e.data.loot as { defId?: string; gold?: number } | undefined;
      if (!loot || loot.defId !== "gold") continue;
      if (Math.hypot(e.transform.x - pos.x, e.transform.y - pos.y) > 36)
        continue;
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
      const curDmg = curDef?.stats?.damage ?? 0;
      const newDmg = def.stats?.damage ?? 0;
      const curArm = curDef?.stats?.armor ?? 0;
      const newArm = def.stats?.armor ?? 0;
      if (newDmg > curDmg || newArm > curArm) {
        this.sheet.equip(stack.uid);
      }
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
      if (e.actorId === "bellwarden") {
        this.services.quests?.setFlag("bellwarden_dead");
      }

      const xp = this.progression.xpPerKill[e.actorId] ?? 10;
      const leveled = this.sheet.addXp(xp, this.progression.xpToLevel);
      this.dropLoot(e.x, e.y, e.actorId);
      this.pushFx({ kind: "kill", x: e.x, y: e.y, gold: 0, t: 0.5 });
      this.pushFx({ kind: "shake", mag: 3, t: 0.1 });
      if (leveled) {
        this.pushFx({ kind: "levelup", t: 1.5 });
        this.syncPlayerFromSheet();
        const p = this.world.get("player");
        if (p?.health) p.health.hp = p.health.max;
      }
    }
  }

  private dropLoot(x: number, y: number, actorId: string): void {
    const tableId =
      this.area === "crypt" || actorId === "bellwarden" || actorId === "crypt_guard"
        ? "crypt_pack"
        : "parish_pack";
    const table = this.lootTables[tableId];
    if (!table) {
      spawnGoldPile(this.world, x, y, 3 + Math.floor(this.rng() * 8));
      return;
    }
    const roll = rollLootTable(table, this.rng);
    if (!roll) return;
    const jx = x + (this.rng() - 0.5) * 20;
    const jy = y + (this.rng() - 0.5) * 20;
    if (roll.item === "gold") {
      const g = roll.qty * (5 + Math.floor(this.rng() * 10));
      spawnGoldPile(this.world, jx, jy, g);
      this.pushFx({
        kind: "loot",
        x: jx,
        y: jy,
        name: `${g} gold`,
        t: 1.2,
      });
      return;
    }
    spawnGroundLoot(this.world, jx, jy, {
      defId: roll.item,
      qty: roll.qty,
    });
    const name = this.items[roll.item]?.name ?? roll.item;
    this.pushFx({ kind: "loot", x: jx, y: jy, name, t: 1.4 });
  }

  private checkExits(): void {
    const area = this.areas[this.area];
    if (!this.sim || !area) return;
    const p = this.world.get("player");
    if (!p?.transform) return;
    const px = p.transform.x;
    const py = p.transform.y;
    const margin = 22;
    const living = this.sim.livingEnemyCount();

    for (const ex of area.exits ?? []) {
      let hit = false;
      if (ex.edge === "east" && px >= area.width - margin) hit = true;
      if (ex.edge === "west" && px <= margin) hit = true;
      if (ex.edge === "south" && py >= area.height - margin) hit = true;
      if (ex.edge === "north" && py <= margin) hit = true;
      if (!hit) continue;

      if (ex.requireClear && living > 0) {
        this.exitHint = `Slay ${living} remaining before you leave`;
        if (this.blockedBannerCd <= 0) {
          this.pushFx({ kind: "banner", text: this.exitHint, t: 1.4 });
          this.blockedBannerCd = 1800;
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

  private checkVictory(): void {
    if (this.area !== "crypt" || !this.sim) return;
    if (this.sim.livingEnemyCount() === 0 && this.killed.size > 0) {
      // require boss dead flag or all clear
      this.victory = true;
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
      this.services.quests?.currentObjective("parish_purge") ?? null;

    return {
      title: "Gravewake",
      area: this.area,
      areaName:
        this.area === "town"
          ? "Ashen Lychgate"
          : this.area === "parish"
            ? "Cinder Parish"
            : "Bellcrypt",
      xp: this.sheet.xp,
      level: this.sheet.level,
      gold: this.sheet.gold,
      potions,
      victory: this.victory,
      lost: this.sim?.isLost() ?? false,
      livingEnemies: this.sim?.livingEnemyCount() ?? 0,
      kills: this.kills,
      exitHint: this.exitHint,
      inventoryOpen: this.showInv,
      inventory: inv,
      equipped,
      stats,
      hp: p?.health?.hp ?? 0,
      maxHp: p?.health?.max ?? stats.maxHp,
      cds: { ...this.cd },
      lastSkill: this.lastSkill,
      quest: questObj,
      topdown: simBlob,
    };
  }
}
