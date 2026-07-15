import type {
  AbilitySystem,
  AudioSystem,
  CharacterSheet,
  DamageType,
  DeathSystem,
  EventBus,
  FloatTextSystem,
  InputMap,
  InteractableSystem,
  ItemDef,
  MinimapFog,
  ParticleSystem,
  ProjectileSystem,
  QuestSystem,
  ResourcePool,
  ScreenTransition,
  StatusSystem,
  ThreatTable,
  TriggerSystem,
  World,
} from "@anvil/core";
import {
  AbilitySystem as Abilities,
  CharacterSheet as Sheet,
  CraftingSystem,
  MinimapFog as FogGrid,
  SAMPLE_COMBAT_TREE,
  SkillTree,
  Vendor,
  Wallet,
  buildRunState,
  dropFromTable,
  emitHeal,
  emitHit,
  emitKill,
  generateDungeon,
  generateOverworld,
  loadRunFromLocalStorage,
  LOOT_GOLD_RADIUS,
  LOOT_ITEM_RADIUS,
  itemPowerScore,
  mitigateDamage,
  playSpatial,
  rollEliteAffixes,
  saveRunToLocalStorage,
  socketGem,
  tryPickupNearest,
} from "@anvil/core";
import type { CraftInventory, ItemStack } from "@anvil/core";
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
  audio?: AudioSystem;
  statuses?: StatusSystem;
  projectiles?: ProjectileSystem;
  resources?: ResourcePool;
  interactables?: InteractableSystem;
  triggers?: TriggerSystem;
  floatText?: FloatTextSystem;
  transitions?: ScreenTransition;
  threat?: ThreatTable;
  death?: DeathSystem;
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
  private wallet: Wallet;
  private skillTree: SkillTree;
  private vendor: Vendor;
  private fog: MinimapFog | null = null;
  private showInv = false;
  private showStats = false;
  /** Diablo-style skill tree panel (T / level-up). */
  private showSkills = false;
  /** Craft / socket panel (K). */
  private showCraft = false;
  /** Vendor sell panel when at shrine (X). */
  private showVendor = false;
  /** Last loot compare lines for HUD toast */
  private lootCompareToast: { text: string; color: string; t: number } | null =
    null;
  /** Open skill panel after level-up until player spends or closes. */
  private pendingSkillChoice = false;
  private crafting = new CraftingSystem();
  private spawner: PackSpawner | null = null;
  /** Last boss banner id for dungeon entry fanfare */
  private lastBossAnnounce = "";
  private tileMap: TileMap | null = null;
  private procSeedBump = 0;
  private liveArea: AreaMapDef | null = null;
  private bossSlainOnce = false;
  private timeAlive = 0;
  private bossesKilled = 0;
  private areaTransitioning = false;
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
        cost: 18,
        costResource: "stamina",
        vfx: "whirl",
      },
      {
        id: "smite",
        name: "Smite",
        cooldownMs: 620,
        targeting: "nearest_enemy",
        range: progression.smiteRange ?? 170,
        damageMul: progression.smiteDamageMul ?? 1.4,
        cost: 12,
        costResource: "mana",
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
    this.wallet = new Wallet({
      gold: progression.startGold,
      shards: 0,
    });
    this.skillTree = new SkillTree(SAMPLE_COMBAT_TREE);
    this.vendor = new Vendor({
      id: "ash_shrine",
      name: "Ash Shrine",
      sellRatio: 0.4,
      offers: [
        {
          id: "buy_potion",
          itemId: "health_potion",
          qty: 1,
          price: { gold: 25 },
          stock: 99,
        },
        {
          id: "buy_ruby",
          itemId: "ruby_gem",
          qty: 1,
          price: { gold: 40 },
          stock: 20,
        },
        {
          id: "buy_sapphire",
          itemId: "sapphire_gem",
          qty: 1,
          price: { gold: 40 },
          stock: 20,
        },
      ],
    });
    this.crafting.registerAll([
      {
        id: "hone_blade",
        name: "Hone Blade",
        inputs: [
          { itemId: "rusty_sword", qty: 1 },
          { itemId: "ruby_gem", qty: 1 },
        ],
        outputId: "bone_cleaver",
        cost: { gold: 15 },
        station: "forge",
      },
      {
        id: "temper_mail",
        name: "Temper Mail",
        inputs: [
          { itemId: "ash_mail", qty: 1 },
          { itemId: "sapphire_gem", qty: 1 },
        ],
        outputId: "warden_cloak",
        cost: { gold: 20 },
        station: "forge",
      },
      {
        id: "brew_vial",
        name: "Brew Vial",
        inputs: [{ itemId: "emerald_gem", qty: 1 }],
        outputId: "health_potion",
        outputQty: 2,
        cost: { gold: 5 },
        station: "alchemy",
      },
    ]);
    this.services.resources?.attach("player");
    this.wireProjectiles();

    // Starter weapon: level 1 roll (base stats ± variance)
    this.sheet.pickupLeveled("rusty_sword", 1, { rng: this.rng });
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
    if (!restored) this.enterArea("town", undefined, { fade: false });
  }

  /** Projectile hit query + damage application (holy smite bolts, etc.). */
  private wireProjectiles(): void {
    const proj = this.services.projectiles;
    if (!proj) return;
    proj.setHitQuery(() => {
      const out: Array<{ id: string; x: number; y: number; team?: string }> =
        [];
      for (const e of this.world.all()) {
        if (!e.tags.includes("enemy") || !e.health || e.health.hp <= 0) continue;
        if (!e.transform) continue;
        out.push({
          id: e.id,
          x: e.transform.x,
          y: e.transform.y,
          team: "enemy",
        });
      }
      return out;
    });
    proj.setHitHandler((h) => {
      const e = this.world.get(h.targetId);
      if (!e?.health || !e.transform) return;
      // Holy/elemental: resists only (no physical armor)
      const dtype = (h.projectile.damageType ?? "holy") as DamageType;
      e.data.incomingDamageType = dtype;
      const resists = (e.data.resists as Record<string, number>) ?? {};
      const mit = mitigateDamage({
        raw: h.damage,
        type: dtype,
        armor: 0,
        resists: {
          resistHoly: resists.holy ?? resists.resistHoly ?? 0,
          resistFire: resists.fire ?? resists.resistFire ?? 0,
          resistCold: resists.cold ?? resists.resistCold ?? 0,
          resistPhysical: resists.physical ?? resists.resistPhysical ?? 0,
        },
      });
      const dealt = mit.final;
      e.health.hp = Math.max(0, e.health.hp - dealt);
      this.services.floatText?.damage(h.x, h.y, dealt, false);
      this.services.threat?.add(
        h.targetId,
        h.projectile.ownerId ?? "player",
        dealt,
      );
      this.services.statuses?.apply(h.targetId, "chill", {
        sourceId: "player",
      });
      this.pushFx({
        kind: "hit",
        x: h.x,
        y: h.y,
        dmg: dealt,
        t: 0.7,
      });
      const pos = this.sim?.getPlayerPos();
      if (pos && this.services.audio) {
        playSpatial(this.services.audio, "spell", pos, { x: h.x, y: h.y });
      }
      this.services.events &&
        emitHit(this.services.events, {
          attackerId: h.projectile.ownerId ?? "player",
          targetId: h.targetId,
          damage: dealt,
          rawDamage: h.damage,
          x: h.x,
          y: h.y,
          abilityId: "smite",
          damageType: dtype,
          statuses: ["chill"],
        });
    });
  }

  /**
   * Push status mods into sim: chill → speedMul, pending elite statuses, player buffs.
   */
  private syncStatusCombatEffects(): void {
    if (!this.sim) return;
    const statuses = this.services.statuses;
    for (const e of this.world.all()) {
      if (!e.tags.includes("actor")) continue;
      // Elite contact on-hit (queued by TopdownSim)
      const pending = e.data.pendingStatus;
      if (typeof pending === "string" && statuses) {
        statuses.apply(e.id, pending, {
          sourceId: String(e.data.pendingStatusSource ?? "enemy"),
        });
        delete e.data.pendingStatus;
        delete e.data.pendingStatusSource;
      }
      if (!statuses) continue;
      const mods = statuses.aggregateMods(e.id);
      // speed statMods are flat (chill = -40); convert to mul vs ~120 baseline
      if (typeof mods.speed === "number") {
        const mul = Math.max(0.25, 1 + mods.speed / 120);
        e.data.speedMul = mul;
        if (e.tags.includes("enemy") || e.id === "player") {
          this.sim.syncActorStats(e.id, { speedMul: mul });
        }
      } else if (e.data.speedMul != null && e.data.speedMul !== 1) {
        e.data.speedMul = 1;
        this.sim.syncActorStats(e.id, { speedMul: 1 });
      }
    }
    // Keep player gear/status armor live every tick (cheap)
    this.syncPlayerFromSheet();
  }

  private syncWalletFromSheet(): void {
    this.wallet.set("gold", this.sheet.gold);
  }

  private syncSheetFromWallet(): void {
    this.sheet.gold = this.wallet.get("gold");
  }

  private entityNear(x: number, y: number, r: number): string | null {
    let best: string | null = null;
    let bestD = r;
    for (const e of this.world.all()) {
      if (!e.tags.includes("enemy") || !e.transform || !e.health) continue;
      if (e.health.hp <= 0) continue;
      const d = Math.hypot(e.transform.x - x, e.transform.y - y);
      if (d < bestD) {
        bestD = d;
        best = e.id;
      }
    }
    return best;
  }

  getSheet(): CharacterSheet {
    return this.sheet;
  }

  getSkillTree(): SkillTree {
    return this.skillTree;
  }

  getWallet(): Wallet {
    return this.wallet;
  }

  getFog(): MinimapFog | null {
    return this.fog;
  }

  /** Persist sheet + area + position for continue. */
  saveRun(seed = 1): void {
    const pos = this.sim?.getPlayerPos() ?? { x: 200, y: 320 };
    this.syncWalletFromSheet();
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
        skillTree: this.skillTree.serialize(),
        wallet: this.wallet.snapshot(),
        pendingSkillChoice: this.pendingSkillChoice,
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
      this.timeAlive = Number(st.flags.timeAlive ?? 0);
      const tree = st.flags.skillTree as
        | { treeId: string; points: number; ranks: Record<string, number> }
        | undefined;
      if (tree?.ranks) {
        this.skillTree = SkillTree.deserialize(SAMPLE_COMBAT_TREE, {
          treeId: tree.treeId ?? "combat",
          points: tree.points ?? 0,
          ranks: tree.ranks,
        });
      }
      const wallet = st.flags.wallet as Record<string, number> | undefined;
      if (wallet) {
        this.wallet = new Wallet(wallet);
        this.syncSheetFromWallet();
      } else {
        this.syncWalletFromSheet();
      }
      this.pendingSkillChoice = Boolean(st.flags.pendingSkillChoice);
      if (this.pendingSkillChoice || this.skillTree.getState().points > 0) {
        this.showSkills = true;
      }
      this.enterArea(st.areaId, { x: st.playerX, y: st.playerY }, { fade: false });
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

  isSkillsOpen(): boolean {
    return this.showSkills;
  }

  isCraftOpen(): boolean {
    return this.showCraft;
  }

  isVendorOpen(): boolean {
    return this.showVendor;
  }

  private craftInv(): CraftInventory {
    return {
      countDef: (id) => {
        let n = 0;
        for (const s of this.sheet.inventory.all()) {
          if (s.defId === id) n += s.qty;
        }
        return n;
      },
      removeDef: (id, qty) => {
        let left = qty;
        for (const s of [...this.sheet.inventory.all()]) {
          if (s.defId !== id || left <= 0) continue;
          // Don't consume equipped gear unless unique instance
          const equipped = Object.values(this.sheet.equipment.all()).includes(
            s.uid,
          );
          if (equipped) continue;
          const take = Math.min(left, s.qty);
          this.sheet.inventory.remove(s.uid, take);
          left -= take;
        }
        return left <= 0;
      },
      addDef: (id, qty) => {
        this.sheet.pickup(id, qty);
        return true;
      },
    };
  }

  /** Gold value of an item for vendor sell. */
  itemSellValue(stack: ItemStack): number {
    const def = this.items[stack.defId];
    if (!def || def.id === "health_potion") return 2;
    if (!def.slot) {
      // gems
      if (def.id.includes("gem")) return 18;
      return 3;
    }
    const power = itemPowerScore(
      stack.rolledStats ?? def.stats,
      stack.itemLevel ?? 1,
    );
    const rar =
      def.rarity === "unique"
        ? 3
        : def.rarity === "rare"
          ? 2.2
          : def.rarity === "magic"
            ? 1.5
            : 1;
    return Math.max(5, Math.floor(power * 2.2 * rar));
  }

  /** Sell one inventory stack (must not be equipped). */
  sellItem(uid: string): boolean {
    const stack = this.sheet.inventory.get(uid);
    if (!stack) return false;
    if (Object.values(this.sheet.equipment.all()).includes(uid)) {
      this.services.events?.emit("ui:error", {});
      return false;
    }
    const unit = this.itemSellValue({ ...stack, qty: 1 });
    const gold = unit * Math.max(1, stack.qty);
    this.sheet.inventory.remove(uid, stack.qty);
    this.sheet.addGold(gold);
    this.syncWalletFromSheet();
    this.pushFx({
      kind: "float",
      x: this.sim?.getPlayerPos()?.x ?? 0,
      y: this.sim?.getPlayerPos()?.y ?? 0,
      text: `+${gold}g`,
      color: "#fd4",
      t: 1,
    });
    this.services.audio?.play("pickup", "sfx");
    this.services.events?.emit("ui:confirm", {});
    return true;
  }

  /** Sell all unequipped common gear + excess potions (Diablo "sell junk"). */
  sellJunk(): number {
    let n = 0;
    for (const s of [...this.sheet.inventory.all()]) {
      if (Object.values(this.sheet.equipment.all()).includes(s.uid)) continue;
      const def = this.items[s.defId];
      if (!def) continue;
      if (def.rarity === "common" || def.id === "health_potion") {
        // keep 5 potions
        if (def.id === "health_potion" && s.qty <= 5) continue;
        if (def.id === "health_potion") {
          const sellQty = s.qty - 5;
          for (let i = 0; i < sellQty; i++) {
            if (this.sellItem(s.uid)) n++;
            else break;
          }
          continue;
        }
        if (this.sellItem(s.uid)) n++;
      }
    }
    if (n > 0) {
      this.pushFx({
        kind: "banner",
        text: `Sold junk (${n})`,
        t: 1.4,
      });
    }
    return n;
  }

  craftRecipe(recipeId: string): boolean {
    this.syncWalletFromSheet();
    const r = this.crafting.craft(recipeId, this.craftInv(), this.wallet);
    this.syncSheetFromWallet();
    if (!r.ok) {
      this.services.events?.emit("ui:error", {});
      this.pushFx({
        kind: "float",
        x: this.sim?.getPlayerPos()?.x ?? 0,
        y: this.sim?.getPlayerPos()?.y ?? 0,
        text: r.reason,
        color: "#e88",
        t: 1,
      });
      return false;
    }
    this.services.audio?.play("equip_metal", "sfx");
    this.pushFx({
      kind: "banner",
      text: `Crafted ${this.items[r.outputId]?.name ?? r.outputId}`,
      t: 1.6,
    });
    this.autoEquipBest();
    this.syncPlayerFromSheet();
    return true;
  }

  /**
   * Socket first free gem into first equippable gear with free socket slot.
   * Keys: Y socket ruby into weapon, etc. — generic: socket next gem into worn weapon/chest.
   */
  socketNextGem(preferSlot?: "weapon" | "chest" | "head"): boolean {
    const gemIds = ["ruby_gem", "sapphire_gem", "emerald_gem", "topaz_gem"];
    const gemStack = this.sheet.inventory
      .all()
      .find((s) => gemIds.includes(s.defId));
    if (!gemStack) {
      this.services.events?.emit("ui:error", {});
      return false;
    }
    const slots = preferSlot
      ? [preferSlot]
      : (["weapon", "chest", "head"] as const);
    for (const slot of slots) {
      const uid = this.sheet.equipment.get(slot as "weapon");
      if (!uid) continue;
      const gear = this.sheet.inventory.get(uid);
      if (!gear) continue;
      const res = socketGem(gear, 0, gemStack.defId, { maxSockets: 2 });
      if (!res.ok) {
        // try second socket
        const res2 = socketGem(gear, 1, gemStack.defId, { maxSockets: 2 });
        if (!res2.ok) continue;
        this.sheet.inventory.remove(gemStack.uid, 1);
        // update stack data — inventory holds reference; replace via remove/add is hard
        // mutate in place if stack is same object
        Object.assign(gear, res2.stack);
        this.syncPlayerFromSheet();
        this.pushFx({
          kind: "banner",
          text: `Socketed ${this.items[gemStack.defId]?.name}`,
          t: 1.4,
        });
        this.services.audio?.play("equip_metal", "sfx");
        return true;
      }
      this.sheet.inventory.remove(gemStack.uid, 1);
      Object.assign(gear, res.stack);
      this.syncPlayerFromSheet();
      this.pushFx({
        kind: "banner",
        text: `Socketed ${this.items[gemStack.defId]?.name}`,
        t: 1.4,
      });
      this.services.audio?.play("equip_metal", "sfx");
      return true;
    }
    this.pushFx({
      kind: "float",
      x: this.sim?.getPlayerPos()?.x ?? 0,
      y: this.sim?.getPlayerPos()?.y ?? 0,
      text: "No socket",
      color: "#e88",
      t: 1,
    });
    return false;
  }

  /** Compare ground/new item to equipped same slot. */
  private lootCompareMessage(stack: {
    defId: string;
    rolledStats?: Partial<Record<string, number>>;
    itemLevel?: number;
  }): { text: string; color: string; better: boolean } | null {
    const def = this.items[stack.defId];
    if (!def?.slot) return null;
    const newScore = itemPowerScore(
      stack.rolledStats ?? def.stats,
      stack.itemLevel ?? 1,
    );
    const curUid = this.sheet.equipment.get(def.slot);
    if (!curUid) {
      return { text: "NEW slot ↑", color: "#6f6", better: true };
    }
    const cur = this.sheet.inventory.get(curUid);
    if (!cur) return null;
    const curDef = this.items[cur.defId];
    const oldScore = itemPowerScore(
      cur.rolledStats ?? curDef?.stats,
      cur.itemLevel ?? 1,
    );
    const delta = newScore - oldScore;
    if (delta > 0.5) {
      return {
        text: `↑ better +${delta.toFixed(0)} vs ${curDef?.name ?? "gear"}`,
        color: "#6f6",
        better: true,
      };
    }
    if (delta < -0.5) {
      return {
        text: `↓ worse ${delta.toFixed(0)} vs equipped`,
        color: "#e88",
        better: false,
      };
    }
    return {
      text: `≈ similar to ${curDef?.name ?? "gear"}`,
      color: "#aa8",
      better: false,
    };
  }

  /** Spend a skill point on a node (player choice). */
  chooseSkill(nodeId: string): boolean {
    const ok = this.skillTree.unlock(nodeId, this.sheet.level);
    if (!ok) {
      this.services.events?.emit("ui:error", {});
      return false;
    }
    const node = this.skillTree.getDef().nodes.find((n) => n.id === nodeId);
    this.pushFx({
      kind: "banner",
      text: `Skill learned: ${node?.name ?? nodeId}`,
      t: 1.8,
    });
    this.services.events?.emit("ui:confirm", {});
    this.services.audio?.play("ui_confirm", "ui");
    if (this.skillTree.getState().points <= 0) {
      this.pendingSkillChoice = false;
    }
    this.syncPlayerFromSheet(); // armor/damage from tree apply immediately
    try {
      this.saveRun();
    } catch {
      /* */
    }
    return true;
  }

  /** Nodes available for the skill UI. */
  skillPanelState(): {
    points: number;
    pending: boolean;
    nodes: Array<{
      id: string;
      name: string;
      rank: number;
      maxRank: number;
      canUnlock: boolean;
      requires: string[];
      reqLevel: number;
      description: string;
    }>;
  } {
    const st = this.skillTree.getState();
    return {
      points: st.points,
      pending: this.pendingSkillChoice,
      nodes: this.skillTree.getDef().nodes.map((n) => ({
        id: n.id,
        name: n.name,
        rank: this.skillTree.rank(n.id),
        maxRank: n.maxRank ?? 1,
        canUnlock: this.skillTree.canUnlock(n.id, this.sheet.level),
        requires: n.requires ?? [],
        reqLevel: n.reqLevel ?? 1,
        description: n.description ?? describeSkillNode(n.id),
      })),
    };
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

  /**
   * Sheet gear + skill-tree bonuses — what combat actually uses.
   */
  private effectivePlayerStats(): {
    maxHp: number;
    damage: number;
    armor: number;
    speed: number;
    critChance: number;
    critMult: number;
    resistPhysical: number;
    resistFire: number;
    resistCold: number;
    resistLightning: number;
    resistPoison: number;
    resistHoly: number;
    resistArcane: number;
    [k: string]: number;
  } {
    const s = this.sheet.finalStats();
    const tree = this.skillTree.aggregateData() as {
      damageBonus?: number;
      armorBonus?: number;
    };
    // Status buffs on player (e.g. blessed)
    const statusMods = this.services.statuses?.aggregateMods("player") ?? {};
    return {
      maxHp: s.maxHp + (statusMods.maxHp ?? 0),
      damage: s.damage + (tree.damageBonus ?? 0) + (statusMods.damage ?? 0),
      armor: Math.max(0, s.armor + (tree.armorBonus ?? 0) + (statusMods.armor ?? 0)),
      speed: Math.max(40, s.speed + (statusMods.speed ?? 0)),
      critChance: Math.min(1, s.critChance + (statusMods.critChance ?? 0)),
      critMult: Math.max(1, s.critMult + (statusMods.critMult ?? 0)),
      resistPhysical: Number(s.resistPhysical ?? 0) + Number(statusMods.resistPhysical ?? 0),
      resistFire: Number(s.resistFire ?? 0),
      resistCold: Number(s.resistCold ?? 0),
      resistLightning: Number(s.resistLightning ?? 0),
      resistPoison: Number(s.resistPoison ?? 0),
      resistHoly: Number(s.resistHoly ?? 0),
      resistArcane: Number(s.resistArcane ?? 0),
    };
  }

  private syncPlayerFromSheet(): void {
    const p = this.world.get("player");
    if (!p?.health) return;
    const stats = this.effectivePlayerStats();
    const ratio = p.health.hp / Math.max(1, p.health.max);
    p.health.max = Math.floor(stats.maxHp);
    p.health.hp = Math.max(1, Math.floor(p.health.max * ratio));
    p.data.armor = stats.armor;
    p.data.resists = {
      physical: stats.resistPhysical,
      fire: stats.resistFire,
      cold: stats.resistCold,
      lightning: stats.resistLightning,
      poison: stats.resistPoison,
      holy: stats.resistHoly,
      arcane: stats.resistArcane,
    };
    // Push speed/armor into TopdownSim runtime (gear actually moves/blocks)
    const pid = this.sim?.getPlayerId() ?? "player";
    this.sim?.syncActorStats(pid, {
      speed: stats.speed,
      armor: stats.armor,
      maxHp: stats.maxHp,
      resists: {
        resistPhysical: stats.resistPhysical,
        resistFire: stats.resistFire,
        resistCold: stats.resistCold,
        resistLightning: stats.resistLightning,
        resistPoison: stats.resistPoison,
        resistHoly: stats.resistHoly,
        resistArcane: stats.resistArcane,
      },
    });
  }

  /** Wire armor/resists into the sim so gear is not cosmetic. */
  private wireCombatStats(sim: TopdownSim): void {
    sim.setDamageMitigator((targetId, raw, ctx) => {
      const isPlayer =
        targetId === "player" || targetId === sim.getPlayerId();
      if (isPlayer) {
        const stats = this.effectivePlayerStats();
        // Contact/melee = physical; elite on-hit may be elemental later
        const r = mitigateDamage({
          raw,
          type: "physical",
          armor: stats.armor,
          resists: stats,
        });
        const pos = sim.getPlayerPos();
        if (pos && r.final > 0) {
          this.services.floatText?.spawn({
            x: pos.x,
            y: pos.y - 18,
            text: `-${r.final}`,
            style: "damage",
            color: "#f66",
          });
          if (r.mitigated > 0 && this.rng() < 0.35) {
            this.services.floatText?.spawn({
              x: pos.x + 12,
              y: pos.y - 28,
              text: `block ${r.mitigated}`,
              style: "info",
              color: "#8af",
            });
          }
        }
        return r.final;
      }

      // Enemies: base armor from threat + entity data; armor_break status shreds it
      const e = this.world.get(targetId);
      const threatArmor = 3 + Math.floor(this.threatTier() * 2);
      let armor = Number(e?.data.armor ?? threatArmor);
      const br = this.services.statuses
        ?.getActive(targetId)
        .find((s) => s.defId === "armor_break");
      if (br) armor = Math.max(0, armor - br.stacks * 4);
      const resists =
        (e?.data.resists as Record<string, number> | undefined) ?? {};
      // Melee player hits are physical; projectiles set type via separate path
      const dmgType =
        (e?.data.incomingDamageType as DamageType | undefined) ?? "physical";
      const r = mitigateDamage({
        raw,
        type: dmgType,
        armor: dmgType === "physical" ? armor : 0,
        resists: {
          resistPhysical: resists.physical ?? resists.resistPhysical ?? 0,
          resistFire: resists.fire ?? resists.resistFire ?? 0,
          resistCold: resists.cold ?? resists.resistCold ?? 0,
          resistHoly: resists.holy ?? resists.resistHoly ?? 0,
          resistPoison: resists.poison ?? resists.resistPoison ?? 0,
        },
      });
      return r.final;
    });
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

  private enterArea(
    id: AreaId,
    spawn?: { x: number; y: number },
    opts?: { fade?: boolean },
  ): void {
    const run = () => this.enterAreaNow(id, spawn);
    const wantFade = opts?.fade !== false && !!this.services.transitions && !!this.sim;
    if (wantFade && !this.areaTransitioning) {
      this.areaTransitioning = true;
      this.services.transitions!.start({
        label: this.areas[id]?.name ?? id,
        outMs: 220,
        holdMs: 80,
        inMs: 280,
        onMid: () => {
          run();
          this.areaTransitioning = false;
        },
        onDone: () => {
          this.areaTransitioning = false;
        },
      });
      return;
    }
    run();
  }

  private enterAreaNow(id: AreaId, spawn?: { x: number; y: number }): void {
    const base = this.areas[id];
    if (!base) throw new Error(`Unknown area: ${id}`);
    const area = this.materializeArea(base);
    this.area = id;
    this.killed.clear();
    this.exitCooldownMs = 800;
    this.exitHint = "";
    this.milestoneBoss = false;
    this.spawner = null;
    this.services.projectiles?.clear();
    this.services.interactables?.clear();
    this.services.triggers?.clear();
    this.services.floatText?.clear();

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
    this.liveArea = area;
    this.sim = new TopdownSim(this.world, map, this.actors, this.rng, {
      autoWinOnClear: false,
      aiActiveRadius: 560,
    });
    this.wireCombatStats(this.sim);
    this.sim.setAggroTargetResolver((enemyId) => {
      // Highest threat on this mob (usually the player)
      const top = this.services.threat?.topId(enemyId);
      if (top && this.world.get(top)?.health && (this.world.get(top)!.health!.hp > 0)) {
        return top;
      }
      return this.sim?.getPlayerId() ?? "player";
    });

    this.fog = new FogGrid({
      width: Math.max(1, Math.ceil(area.width / 32)),
      height: Math.max(1, Math.ceil(area.height / 32)),
      cellSize: 32,
    });

    // Scale initial non-player spawns + chance of elite flags + armor
    const scale = this.scaleForThreat();
    for (const e of this.world.all()) {
      if (!e.tags.includes("enemy") || !e.health) continue;
      e.health.max = Math.max(1, Math.floor(e.health.max * scale.hpMul));
      e.health.hp = e.health.max;
      e.data.armor = Math.floor(4 + this.threatTier() * 2.5);
      if (this.rng() < 0.06) {
        const rolled = rollEliteAffixes(1, this.rng);
        e.data.elite = true;
        e.data.eliteAffixes = rolled.affixes.map((a) => a.id);
        e.data.eliteTint = rolled.tint;
        e.data.armor = Math.floor(Number(e.data.armor) + 6);
        e.health.max = Math.floor(e.health.max * 1.7);
        e.health.hp = e.health.max;
        if (rolled.onHitStatuses[0]) e.data.onHitStatus = rolled.onHitStatuses[0];
      }
    }

    if (spawn) {
      const p = this.world.get("player");
      if (p?.transform) {
        p.transform.x = spawn.x;
        p.transform.y = spawn.y;
      }
    }
    this.syncPlayerFromSheet();
    this.services.resources?.attach("player");
    this.services.resources?.fill("player");

    // Interactables + zone triggers
    this.setupAreaInteractables(area, id);
    this.services.triggers?.register({
      id: `zone_${id}`,
      x: 0,
      y: 0,
      w: area.width,
      h: area.height,
      tags: ["zone", area.kind ?? "area"],
      data: { areaId: id },
    });

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
        enabled: () => !this.showInv && !this.areaTransitioning,
      });
    }

    this.pushFx({ kind: "banner", text: area.name, t: 2.0 });
    if (id === "wastes") this.services.quests?.setFlag("entered_wastes");
    if (area.kind === "dungeon") this.services.quests?.setFlag("entered_dungeon");
    this.services.events?.emit("audio:zone_music", {
      zone: area.kind === "dungeon" ? "dungeon" : id === "town" ? "town" : "battle",
    });
    this.services.events?.emit("world:door", {});
    try {
      this.saveRun();
    } catch {
      /* headless / no localStorage */
    }
  }

  private setupAreaInteractables(area: AreaMapDef, id: AreaId): void {
    const sys = this.services.interactables;
    if (!sys) return;
    if (id === "town") {
      sys.register({
        id: "ash_shrine",
        kind: "shrine",
        x: 220,
        y: 160,
        radius: 70,
        label: "Ash Shrine (potions)",
        cooldownMs: 400,
        data: { shop: true },
      });
      sys.register({
        id: "heal_font",
        kind: "shrine",
        x: 320,
        y: 200,
        radius: 48,
        label: "Font of Ash (heal)",
        cooldownMs: 12000,
        data: { heal: true },
      });
      sys.register({
        id: "mana_font",
        kind: "shrine",
        x: 160,
        y: 260,
        radius: 48,
        label: "Well of Embers (mana)",
        cooldownMs: 10000,
        data: { mana: true },
      });
      sys.register({
        id: "town_chest",
        kind: "chest",
        x: 480,
        y: 300,
        radius: 36,
        label: "Supply Cache",
        once: true,
        data: { loot: "town" },
      });
      sys.register({
        id: "lychgate",
        kind: "door",
        x: area.width - 80,
        y: area.height / 2,
        radius: 48,
        label: "Lychgate → Wastes",
      });
    } else if (area.kind === "dungeon") {
      // dungeon: chests + blood shrine + boss fanfare
      for (let i = 0; i < 3; i++) {
        const pt = this.randomOpenPoint(area, 80);
        if (!pt) continue;
        sys.register({
          id: `chest_${id}_${i}`,
          kind: "chest",
          x: pt.x,
          y: pt.y,
          radius: 32,
          once: true,
          label: i === 0 ? "Bone Chest" : "Ashen Reliquary",
          data: { loot: "dungeon" },
        });
      }
      const shrinePt = this.randomOpenPoint(area, 120);
      if (shrinePt) {
        sys.register({
          id: `blood_shrine_${id}`,
          kind: "shrine",
          x: shrinePt.x,
          y: shrinePt.y,
          radius: 40,
          label: "Blood Shrine (+dmg, −hp)",
          cooldownMs: 30000,
          data: { blood: true },
        });
      }
      // Announce dungeon lord
      const bossSpawn = area.spawns.find((s) => BOSS_IDS.has(s.actor));
      if (bossSpawn && bossSpawn.actor !== this.lastBossAnnounce) {
        this.lastBossAnnounce = bossSpawn.actor;
        const nm = this.actors[bossSpawn.actor]?.name ?? bossSpawn.actor;
        this.pushFx({
          kind: "banner",
          text: `Dungeon Lord: ${nm}`,
          t: 3.5,
        });
        this.services.events?.emit("audio:zone_music", { zone: "battle" });
        this.services.audio?.play("unsheathe", "sfx");
      }
    } else {
      // wastes: chests + waypoint shrine
      for (let i = 0; i < 2; i++) {
        const pt = this.randomOpenPoint(area, 100);
        if (!pt) continue;
        sys.register({
          id: `chest_${id}_${i}`,
          kind: "chest",
          x: pt.x,
          y: pt.y,
          radius: 32,
          once: true,
          label: "Scavenger Cache",
          data: { loot: "wastes" },
        });
      }
      const wp = this.randomOpenPoint(area, 200);
      if (wp) {
        sys.register({
          id: `waypoint_${id}`,
          kind: "shrine",
          x: wp.x,
          y: wp.y,
          radius: 44,
          label: "Ash Waypoint (heal)",
          cooldownMs: 20000,
          data: { heal: true },
        });
      }
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
    const elite = this.rng() < 0.08;
    let hpMul = scale.hpMul;
    let dmgMul = scale.dmgMul;
    let speedMul = Math.min(1.15, scale.speedMul);
    let affixIds: string[] = [];
    let tint: string | undefined;
    let onHitStatus: string | undefined;
    if (elite) {
      const rolled = rollEliteAffixes(1 + (this.rng() < 0.25 ? 1 : 0), this.rng);
      affixIds = rolled.affixes.map((a) => a.id);
      tint = rolled.tint;
      onHitStatus = rolled.onHitStatuses[0];
      const st = rolled.applyToStats({
        maxHp: 100,
        damage: 10,
        speed: 100,
        armor: 0,
        critChance: 0,
        critMult: 1,
      });
      hpMul *= (st.maxHp ?? 100) / 100;
      dmgMul *= (st.damage ?? 10) / 10;
      speedMul = Math.min(1.4, speedMul * ((st.speed ?? 100) / 100));
    }
    const eid = this.sim.spawnActorPublic(def, pt.x, pt.y, "enemy", {
      hpMul,
      dmgMul,
      speedMul,
    });
    const ent = this.world.get(eid);
    if (ent) {
      // Baseline enemy armor scales with threat (gear matters more later)
      ent.data.armor = Math.floor(
        4 + this.threatTier() * 2.5 + (elite ? 6 : 0),
      );
      if (elite) {
        ent.data.elite = true;
        ent.data.eliteAffixes = affixIds;
        ent.data.eliteTint = tint;
        if (onHitStatus) ent.data.onHitStatus = onHitStatus;
      }
    }
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

    // skills (blocked while skill/craft/vendor panels open)
    if (!this.showSkills && !this.showCraft && !this.showVendor) {
      if (input.isPressed("shoot") || input.isPressed("confirm"))
        this.cast("slash");
      if (input.isPressed("play_card_2") || input.isPressed("choice_2"))
        this.cast("whirl");
      if (input.isPressed("play_card_3") || input.isPressed("choice_3"))
        this.cast("smite");
      if (input.isPressed("choice_1") || input.isPressed("play_card_1"))
        this.cast("potion");
    }
    if (input.isPressed("inventory")) {
      this.showInv = !this.showInv;
      this.services.events?.emit(this.showInv ? "ui:open" : "ui:close", {});
      this.services.events?.emit("ui:click", {});
      if (this.showInv) {
        this.showStats = false;
        this.showSkills = false;
      }
    }
    // C = character stats (base + gear) — bind once
    input.defineAction("character");
    input.bindKey("character", "KeyC");
    input.defineAction("skills");
    input.bindKey("skills", "KeyT");
    if (input.isPressed("character")) {
      this.showStats = !this.showStats;
      this.services.events?.emit("ui:click", {});
      if (this.showStats) {
        this.showInv = false;
        this.showSkills = false;
      }
    }
    if (input.isPressed("skills")) {
      this.showSkills = !this.showSkills;
      this.services.events?.emit(
        this.showSkills ? "ui:open" : "ui:close",
        {},
      );
      this.services.events?.emit("ui:click", {});
      if (this.showSkills) {
        this.showInv = false;
        this.showStats = false;
        this.showCraft = false;
        this.showVendor = false;
      }
    }
    // K = craft / sockets
    input.defineAction("craft");
    input.bindKey("craft", "KeyK");
    if (input.isPressed("craft")) {
      this.showCraft = !this.showCraft;
      this.services.events?.emit("ui:click", {});
      if (this.showCraft) {
        this.showInv = false;
        this.showStats = false;
        this.showSkills = false;
        this.showVendor = false;
      }
    }
    // X = vendor panel (sell) when in town / at shrine
    input.defineAction("vendor");
    input.bindKey("vendor", "KeyX");
    if (input.isPressed("vendor")) {
      this.showVendor = !this.showVendor;
      this.services.events?.emit("ui:click", {});
      if (this.showVendor) {
        this.showInv = false;
        this.showStats = false;
        this.showSkills = false;
        this.showCraft = false;
      }
    }
    // Y = socket gem into gear
    input.defineAction("socket");
    input.bindKey("socket", "KeyY");
    if (input.isPressed("socket")) {
      this.socketNextGem();
    }
    // Number keys 1–4 spend skill points while skill panel open
    if (this.showSkills) {
      const nodes = this.skillTree.getDef().nodes;
      for (let i = 0; i < Math.min(4, nodes.length); i++) {
        const action = `play_card_${i + 1}`;
        if (input.isPressed(action) || input.isPressed(`choice_${i + 1}`)) {
          const n = nodes[i];
          if (n) this.chooseSkill(n.id);
        }
      }
    }
    // Craft panel: 1–3 craft recipes
    if (this.showCraft) {
      const recipes = this.crafting.list();
      for (let i = 0; i < Math.min(3, recipes.length); i++) {
        if (
          input.isPressed(`play_card_${i + 1}`) ||
          input.isPressed(`choice_${i + 1}`)
        ) {
          this.craftRecipe(recipes[i]!.id);
        }
      }
      if (input.isPressed("play_card_4") || input.isPressed("choice_4")) {
        this.socketNextGem();
      }
    }
    // Vendor: 1–9 sell bag items, 0 sell junk
    if (this.showVendor) {
      if (input.isPressed("choice_1") || input.isPressed("play_card_1")) {
        // first sellable
        const sellable = this.sheet.inventory
          .all()
          .filter(
            (s) => !Object.values(this.sheet.equipment.all()).includes(s.uid),
          );
        if (sellable[0]) this.sellItem(sellable[0].uid);
      }
      // Space-adjacent: use confirm as sell junk when vendor open
      if (input.isPressed("confirm") || input.isPressed("shoot")) {
        this.sellJunk();
      }
      for (let i = 2; i <= 4; i++) {
        if (
          input.isPressed(`play_card_${i}`) ||
          input.isPressed(`choice_${i}`)
        ) {
          const offer = this.vendor.listOffers()[i - 2];
          if (offer) {
            this.syncWalletFromSheet();
            const br = this.vendor.buy(offer.id, this.wallet, {
              level: this.sheet.level,
              grant: (id, q) => {
                this.sheet.pickup(id, q);
                return true;
              },
            });
            this.syncSheetFromWallet();
            if (br.ok) {
              this.services.audio?.play("ui_confirm", "ui");
              this.pushFx({
                kind: "banner",
                text: `Bought ${this.items[br.itemId]?.name ?? br.itemId}`,
                t: 1.2,
              });
            } else this.services.events?.emit("ui:error", {});
          }
        }
      }
    }
    if (input.isPressed("interact")) {
      this.tryInteract();
    }
    if (this.lootCompareToast) {
      this.lootCompareToast.t -= dt;
      if (this.lootCompareToast.t <= 0) this.lootCompareToast = null;
    }

    // Engine fog of war around player
    const fogPos = this.sim.getPlayerPos();
    if (fogPos && this.fog) {
      this.fog.reveal(fogPos.x, fogPos.y, 200);
    }
    if (fogPos && this.services.triggers) {
      this.services.triggers.update({ player: fogPos });
    }

    // Apply status → combat (chill slows, armor_break shreds, elite on-hit)
    this.syncStatusCombatEffects();

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

    if (this.exitCooldownMs <= 0 && !this.areaTransitioning) {
      this.checkPortals();
      this.checkExits();
    }
  }

  private cast(skill: SkillId): void {
    if (!this.sim || this.cd[skill] > 0 || this.areaTransitioning) return;
    if (skill === "potion") {
      this.usePotion();
      this.cd.potion = 400;
      return;
    }

    // Resource costs (engine ResourcePool)
    const res = this.services.resources;
    if (skill === "whirl" && res && !res.spend("player", "stamina", 18)) {
      this.pushFx({
        kind: "float",
        x: this.sim.getPlayerPos()?.x ?? 0,
        y: this.sim.getPlayerPos()?.y ?? 0,
        text: "No stamina",
        color: "#e88",
        t: 0.8,
      });
      this.services.events?.emit("ui:error", {});
      return;
    }
    if (skill === "smite" && res && !res.spend("player", "mana", 12)) {
      this.pushFx({
        kind: "float",
        x: this.sim.getPlayerPos()?.x ?? 0,
        y: this.sim.getPlayerPos()?.y ?? 0,
        text: "No mana",
        color: "#88e",
        t: 0.8,
      });
      this.services.events?.emit("ui:error", {});
      return;
    }

    // Gear + skill tree (effectivePlayerStats) — not base sheet alone
    const stats = this.effectivePlayerStats();
    const isCrit = this.rng() < stats.critChance;
    const base = stats.damage;
    let raw: number;
    let range: number;
    let damageType: DamageType = "physical";
    if (skill === "slash") {
      raw = Math.floor(base * (isCrit ? stats.critMult : 1));
      range = this.progression.meleeRange;
      damageType = "physical";
    } else if (skill === "whirl") {
      const mul = this.progression.whirlDamageMul ?? 0.75;
      raw = Math.floor(base * mul * (isCrit ? stats.critMult : 1));
      range = this.progression.meleeRange * 1.3;
      damageType = "physical";
    } else {
      const mul = this.progression.smiteDamageMul ?? 1.35;
      raw = Math.floor(base * mul * (isCrit ? stats.critMult : 1));
      range = this.progression.smiteRange ?? 160;
      damageType = "holy";
    }

    const pos = this.sim.getPlayerPos();
    if (!pos) return;

    this.services.events?.emit("combat:swing", { skill });

    // Raw outgoing; enemy armor/resists applied inside TopdownSim mitigator
    const dmg = raw;

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

    this.abilities.tryCast("player", skill, {
      x: pos.x,
      y: pos.y,
      baseDamage: base,
    });

    // Smite: holy projectile toward nearest enemy (engine ProjectileSystem)
    if (skill === "smite" && this.services.projectiles) {
      const nearest = this.sim.nearestEnemy(pos.x, pos.y, range);
      if (nearest) {
        const te = this.world.get(nearest);
        if (te?.transform) {
          // Holy ignores physical armor in mitigator path (projectile handler)
          te.data.incomingDamageType = "holy";
          this.services.projectiles.spawnToward(
            pos.x,
            pos.y,
            te.transform.x,
            te.transform.y,
            {
              damage: dmg,
              damageType: "holy",
              ownerId: "player",
              team: "player",
              speed: 420,
              radius: 10,
              lifeMs: 900,
              pierce: 0,
            },
          );
        }
      }
      return;
    }

    // Tag targets for physical mitigation
    for (const e of this.world.all()) {
      if (e.tags.includes("enemy")) e.data.incomingDamageType = "physical";
    }

    const result =
      skill === "whirl"
        ? this.sim.playerMelee(range, dmg)
        : this.sim.playerMelee(range, dmg);

    const statuses: string[] = [];
    for (const t of result.targets) {
      const dealt = t.dmg; // post-armor from sim mitigator
      if (skill === "whirl" && this.services.statuses) {
        for (const e of this.world.all()) {
          if (!e.tags.includes("enemy") || !e.health || e.health.hp <= 0)
            continue;
          const dx = (e.transform?.x ?? 0) - t.x;
          const dy = (e.transform?.y ?? 0) - t.y;
          if (dx * dx + dy * dy < 28 * 28) {
            this.services.statuses.apply(e.id, "armor_break", {
              sourceId: "player",
            });
            statuses.push("armor_break");
          }
        }
      }

      this.services.floatText?.damage(t.x, t.y, dealt, isCrit);
      // Real entity id for threat table (AI focus)
      const targetId = this.entityNear(t.x, t.y, 24);
      if (targetId) {
        this.services.threat?.add(targetId, "player", dealt);
      }
      if (this.services.audio) {
        playSpatial(this.services.audio, isCrit ? "swing" : "hit", pos, {
          x: t.x,
          y: t.y,
        });
      }

      this.pushFx({
        kind: "hit",
        x: t.x,
        y: t.y,
        dmg: dealt,
        t: isCrit ? 1 : 0.7,
        crit: isCrit,
      });
      if (this.services.events) {
        emitHit(this.services.events, {
          attackerId: "player",
          targetId: "enemy",
          damage: dealt,
          rawDamage: raw,
          x: t.x,
          y: t.y,
          crit: isCrit,
          abilityId: skill,
          damageType,
          statuses: statuses.length ? [...new Set(statuses)] : undefined,
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
      this.services.events?.emit("ui:error", {});
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
    if (this.services.events) {
      emitHeal(this.services.events, {
        targetId: "player",
        amount: heal,
        x: p.transform?.x ?? 0,
        y: p.transform?.y ?? 0,
      });
    }
    this.services.floatText?.heal(
      p.transform?.x ?? 0,
      p.transform?.y ?? 0,
      heal,
    );
  }

  /** Interact: vendor shrine, chests, then loot. */
  private tryInteract(): void {
    const pos = this.sim?.getPlayerPos();
    if (!pos) return;
    const sys = this.services.interactables;
    if (sys) {
      const near = sys.nearest(pos.x, pos.y, 80);
      if (near) {
        const r = sys.interact(near.def.id, {
          hasItem: (itemId) => !!this.sheet.inventory.findByDef(itemId),
        });
        if (r.ok) {
          this.services.events?.emit("ui:confirm", {});
          this.services.audio?.play("ui_confirm", "ui");
          const data = near.def.data ?? {};
          if (data.shop || near.def.id === "ash_shrine") {
            this.buyFromVendor(pos.x, pos.y);
            return;
          }
          if (data.heal) {
            const p = this.world.get("player");
            if (p?.health) {
              const before = p.health.hp;
              p.health.hp = p.health.max;
              const healed = p.health.hp - before;
              this.services.floatText?.heal(pos.x, pos.y, healed || p.health.max);
              this.pushFx({
                kind: "banner",
                text: "Life restored",
                t: 1.4,
              });
              this.services.audio?.play("ui_confirm", "ui");
              if (this.services.events) {
                emitHeal(this.services.events, {
                  targetId: "player",
                  amount: healed || p.health.max,
                  x: pos.x,
                  y: pos.y,
                });
              }
            }
            return;
          }
          if (data.mana) {
            this.services.resources?.fill("player", "mana");
            this.services.floatText?.spawn({
              x: pos.x,
              y: pos.y,
              text: "Mana full",
              style: "mana",
              color: "#68f",
            });
            this.pushFx({ kind: "banner", text: "Mana restored", t: 1.2 });
            this.services.audio?.play("magic", "sfx");
            return;
          }
          if (data.blood) {
            const p = this.world.get("player");
            if (p?.health) {
              p.health.hp = Math.max(1, Math.floor(p.health.hp * 0.7));
              this.sheet.baseStats.damage += 2;
              this.syncPlayerFromSheet();
              this.pushFx({
                kind: "banner",
                text: "Blood rite: +2 damage",
                t: 2,
              });
              this.services.floatText?.spawn({
                x: pos.x,
                y: pos.y,
                text: "BLOOD",
                style: "crit",
                color: "#e44",
              });
              this.services.audio?.play("explosion", "sfx");
            }
            return;
          }
          if (near.def.kind === "chest") {
            this.dropLoot(near.def.x, near.def.y, "scuttler");
            if (data.loot === "dungeon") {
              this.dropLoot(
                near.def.x + 10,
                near.def.y,
                "crypt_guard",
              );
            }
            this.wallet.add("shards", 1 + (data.loot === "dungeon" ? 1 : 0));
            this.pushFx({
              kind: "banner",
              text: near.def.label ?? "Chest opened",
              t: 1.2,
            });
            this.services.floatText?.spawn({
              x: near.def.x,
              y: near.def.y,
              text: "+shard",
              style: "gold",
              color: "#aaf",
            });
            this.services.audio?.play("pickup", "sfx");
            this.services.events?.emit("loot:pickup", {});
            return;
          }
          if (near.def.kind === "door") {
            this.services.events?.emit("world:door", {});
            this.services.audio?.play("door_open", "sfx");
            this.pushFx({
              kind: "float",
              x: pos.x,
              y: pos.y,
              text: near.def.label ?? "Door",
              color: "#ccc",
              t: 0.8,
            });
            return;
          }
        } else if (r.reason === "used" || r.reason === "cooldown") {
          this.services.events?.emit("ui:error", {});
          this.services.audio?.play("ui_error", "ui");
        }
      }
    }
    // fallback shrine vendor without interactable
    if (this.tryVendor()) return;
    this.tryLoot();
  }

  private buyFromVendor(x: number, y: number): void {
    this.syncWalletFromSheet();
    const result = this.vendor.buy("buy_potion", this.wallet, {
      level: this.sheet.level,
      grant: (itemId, qty) => {
        this.sheet.pickup(itemId, qty);
        return true;
      },
    });
    this.syncSheetFromWallet();
    if (!result.ok) {
      this.pushFx({
        kind: "float",
        x,
        y,
        text: result.reason === "funds" ? "Need 25g" : "Cannot buy",
        color: "#e88",
        t: 1,
      });
      this.services.events?.emit("ui:error", {});
      return;
    }
    this.pushFx({
      kind: "float",
      x,
      y,
      text: "Potion −25g",
      color: "#6f6",
      t: 1.1,
    });
    this.pushFx({
      kind: "banner",
      text: "Ash shrine grants a draught",
      t: 1.4,
    });
  }

  /** Town vendor: buy potions for gold when near the shrine. */
  private tryVendor(): boolean {
    if (this.area !== "town") return false;
    const pos = this.sim?.getPlayerPos();
    if (!pos) return false;
    if (Math.hypot(pos.x - 220, pos.y - 160) > 70) return false;
    this.buyFromVendor(pos.x, pos.y);
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
      this.services.floatText?.spawn({
        x: pos.x,
        y: pos.y,
        text: "Looted",
        style: "gold",
      });
      this.services.events?.emit("loot:pickup", { id });
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
      const loot = e.data.loot as {
        defId?: string;
        gold?: number;
        qty?: number;
        rolledStats?: Record<string, number>;
        itemLevel?: number;
        reqLevel?: number;
      } | undefined;
      if (!loot) continue;
      const d = Math.hypot(e.transform.x - pos.x, e.transform.y - pos.y);
      if (loot.defId === "gold") {
        if (d > LOOT_GOLD_RADIUS) continue;
        this.sheet.addGold(loot.gold ?? 0);
        this.syncWalletFromSheet();
        this.world.destroy(e.id);
        this.pushFx({
          kind: "float",
          x: e.transform.x,
          y: e.transform.y,
          text: `+${loot.gold}g`,
          color: "#fd4",
          t: 0.8,
        });
        this.services.floatText?.spawn({
          x: e.transform.x,
          y: e.transform.y,
          text: `+${loot.gold}g`,
          style: "gold",
          color: "#fd4",
        });
        this.services.events?.emit("loot:pickup", { id: e.id });
        continue;
      }
      // magnetic gear pickup when standing on it
      if (d > LOOT_ITEM_RADIUS) continue;
      const ok = this.sheet.pickup(loot.defId!, loot.qty ?? 1, {
        rolledStats: loot.rolledStats,
        itemLevel: loot.itemLevel,
        reqLevel: loot.reqLevel,
      });
      if (!ok) continue;
      this.world.destroy(e.id);
      const cmp = this.lootCompareMessage({
        defId: loot.defId!,
        rolledStats: loot.rolledStats,
        itemLevel: loot.itemLevel,
      });
      this.autoEquipBest();
      this.syncPlayerFromSheet();
      const nm = this.items[loot.defId!]?.name ?? "Loot";
      const lv = loot.itemLevel != null ? ` L${loot.itemLevel}` : "";
      this.pushFx({
        kind: "float",
        x: e.transform.x,
        y: e.transform.y,
        text: `${nm}${lv}`,
        color: cmp?.better ? "#6f6" : "#acf",
        t: 1,
      });
      if (cmp) {
        this.lootCompareToast = { text: cmp.text, color: cmp.color, t: 2.2 };
        this.services.floatText?.spawn({
          x: e.transform.x,
          y: e.transform.y - 16,
          text: cmp.text,
          style: "info",
          color: cmp.color,
        });
      }
    }
  }

  private autoEquipBest(): void {
    const scoreStack = (stack: {
      rolledStats?: Partial<Record<string, number>>;
      defId: string;
      itemLevel?: number;
    }) => {
      const def = this.items[stack.defId];
      const stats = stack.rolledStats ?? def?.stats;
      return itemPowerScore(stats, stack.itemLevel ?? 1);
    };
    for (const stack of this.sheet.inventory.all()) {
      const def = this.items[stack.defId];
      if (!def?.slot) continue;
      const req = stack.reqLevel ?? stack.itemLevel ?? 1;
      if (this.sheet.level < req) continue; // engine equip gate too
      const curUid = this.sheet.equipment.get(def.slot);
      if (!curUid) {
        this.sheet.equip(stack.uid);
        continue;
      }
      const cur = this.sheet.inventory.get(curUid);
      if (!cur) continue;
      if (scoreStack(stack) > scoreStack(cur)) {
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

      const isBoss = BOSS_IDS.has(e.actorId);
      this.services.death?.markDead(e.id, {
        x: e.x,
        y: e.y,
        killerId: "player",
        corpseMs: isBoss ? 12000 : 5000,
        canRevive: false,
        data: { actorId: e.actorId },
      });
      this.wallet.add("shards", isBoss ? 5 : this.rng() < 0.2 ? 1 : 0);
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
        this.pushFx({
          kind: "banner",
          text: `Level ${this.sheet.level} — choose a skill (T)`,
          t: 2.8,
        });
        this.syncPlayerFromSheet();
        const p = this.world.get("player");
        if (p?.health) p.health.hp = p.health.max;
        this.sheet.pickup("health_potion", 1);
        // Skill point — player chooses (T panel), no silent auto-unlock
        this.skillTree.addPoints(1);
        this.pendingSkillChoice = true;
        this.showSkills = true;
        this.showInv = false;
        this.showStats = false;
        this.services.resources?.fill("player");
        this.services.floatText?.spawn({
          x: e.x,
          y: e.y,
          text: "LEVEL UP",
          style: "status",
          color: "#ff0",
        });
        this.services.events?.emit("ui:confirm", {});
        this.services.audio?.play("ui_confirm", "ui");
        // short stinger (non-looping jingle-like cue) then resume zone music
        this.services.audio?.play("ui_open", "ui");
        this.services.events?.emit("audio:zone_music", {
          zone:
            this.areas[this.area]?.kind === "dungeon"
              ? "battle"
              : this.area === "town"
                ? "town"
                : "battle",
        });
        try {
          this.saveRun();
        } catch {
          /* */
        }
      }

      // Kill SFX
      if (isBoss) {
        this.services.audio?.play("explosion", "sfx");
        this.services.events?.emit("audio:zone_music", { zone: "battle" });
      } else {
        this.services.audio?.play(
          ent?.data.elite ? "swing" : "hit_alt",
          "sfx",
        );
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
    const zoneLevel = Math.max(
      1,
      Math.round(this.threatTier() + 1),
    );
    const drop = dropFromTable(this.world, x, y, table, {
      rng: this.rng,
      goldMul: 1 + Math.floor(this.threatTier()) * 0.25,
      scatter: 24,
      itemDefs: this.items,
      characterLevel: this.sheet.level,
      zoneLevel,
    });
    if (drop.kind === "gold" && drop.gold) {
      this.pushFx({
        kind: "loot",
        x: drop.x,
        y: drop.y,
        name: `${drop.gold} gold`,
        t: 1.1,
      });
      this.services.audio?.play("pickup", "sfx");
    } else if (drop.kind === "item" && drop.name) {
      const rarity =
        (drop as { rarity?: string }).rarity ??
        this.items[String((drop as { defId?: string }).defId ?? "")]?.rarity ??
        "common";
      this.pushFx({
        kind: "loot",
        x: drop.x,
        y: drop.y,
        name: drop.name,
        t: 1.3,
      });
      this.services.floatText?.spawn({
        x: drop.x,
        y: drop.y,
        text: drop.name,
        style: "gold",
        color:
          rarity === "unique"
            ? "#bf7f3f"
            : rarity === "rare"
              ? "#ffcc00"
              : rarity === "magic"
                ? "#6868ff"
                : "#d0d0d0",
      });
      this.services.audio?.play("equip_metal", "sfx");
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
    const sheetStats = this.sheet.finalStats();
    const stats = this.effectivePlayerStats();
    const p = this.world.get("player");
    const potions =
      this.sheet.inventory.findByDef("health_potion")?.qty ?? 0;
    const inv = this.sheet.inventory.all().map((s) => {
      const def = this.items[s.defId];
      const req = s.reqLevel ?? s.itemLevel ?? 1;
      return {
        uid: s.uid,
        defId: s.defId,
        name: def?.name ?? s.defId,
        qty: s.qty,
        slot: def?.slot,
        rarity: def?.rarity ?? "common",
        itemLevel: s.itemLevel,
        reqLevel: s.reqLevel ?? s.itemLevel,
        canEquip: this.sheet.level >= req,
        rolledStats: s.rolledStats,
      };
    });
    const equipped: Record<string, string | null> = {};
    for (const [slot, uid] of Object.entries(this.sheet.equipment.all())) {
      if (!uid) {
        equipped[slot] = null;
        continue;
      }
      const st = this.sheet.inventory.get(uid);
      if (!st) {
        equipped[slot] = null;
        continue;
      }
      const nm = this.items[st.defId]?.name ?? st.defId;
      const lv = st.itemLevel != null ? ` L${st.itemLevel}` : "";
      equipped[slot] = `${nm}${lv}`;
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
      wallet: this.wallet.snapshot(),
      mana: this.services.resources?.get("player", "mana")?.current ?? 0,
      manaMax: this.services.resources?.get("player", "mana")?.max ?? 50,
      stamina: this.services.resources?.get("player", "stamina")?.current ?? 0,
      staminaMax: this.services.resources?.get("player", "stamina")?.max ?? 100,
      skillTree: this.skillTree.getState(),
      skillUnlocked: this.skillTree.unlocked().map((u) => ({
        id: u.node.id,
        name: u.node.name,
        rank: u.rank,
      })),
      fog: this.fog?.sample(24) ?? null,
      projectiles: this.services.projectiles?.all().length ?? 0,
      floatTexts: this.services.floatText?.all().length ?? 0,
      transition: this.services.transitions?.state ?? null,
      interactables: this.services.interactables?.all().map((s) => ({
        id: s.def.id,
        kind: s.def.kind,
        used: s.used,
        x: s.def.x,
        y: s.def.y,
      })),
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
      skillsOpen: this.showSkills,
      craftOpen: this.showCraft,
      vendorOpen: this.showVendor,
      pendingSkillChoice: this.pendingSkillChoice,
      skillPanel: this.skillPanelState(),
      craftPanel: {
        recipes: this.crafting.list().map((r) => ({
          id: r.id,
          name: r.name ?? r.id,
          can: this.crafting.canCraft(r.id, this.craftInv(), this.wallet),
          inputs: r.inputs,
          outputId: r.outputId,
          cost: r.cost,
        })),
      },
      vendorPanel: {
        offers: this.vendor.listOffers().map((o) => ({
          id: o.id,
          itemId: o.itemId,
          name: this.items[o.itemId]?.name ?? o.itemId,
          price: o.price,
          stock: o.stock,
        })),
        sellable: this.sheet.inventory
          .all()
          .filter(
            (s) => !Object.values(this.sheet.equipment.all()).includes(s.uid),
          )
          .slice(0, 12)
          .map((s) => ({
            uid: s.uid,
            defId: s.defId,
            name: this.items[s.defId]?.name ?? s.defId,
            qty: s.qty,
            value: this.itemSellValue(s),
            rarity: this.items[s.defId]?.rarity ?? "common",
          })),
      },
      lootCompare: this.lootCompareToast,
      shards: this.wallet.get("shards"),
      inventory: inv,
      equipped,
      stats,
      /** Sheet final without skill tree (C panel base) */
      sheetStats,
      /** Combat-effective (gear + tree + status) */
      combatStats: stats,
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

function describeSkillNode(id: string): string {
  switch (id) {
    case "power":
      return "+2 damage per rank";
    case "iron_skin":
      return "+2 armor per rank";
    case "whirlwind":
      return "Empowers Whirl";
    case "smite":
      return "Empowers Smite";
    default:
      return "Combat talent";
  }
}
