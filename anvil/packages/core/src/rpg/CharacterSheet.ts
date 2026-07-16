import { Equipment, type ItemDefLookup } from "./Equipment.js";
import { Inventory } from "./Inventory.js";
import {
  canEquipAtLevel,
  itemPowerScore,
  rollItemInstance,
} from "./itemization.js";
import { addStats, computeFinalStats, emptyStats } from "./stats.js";
import { EQUIP_SLOTS } from "./types.js";
import type {
  CharacterInventoryView,
  CharacterItemView,
  CharacterSaveBlob,
  EquipSlot,
  EquippedVisualLayer,
  ItemDef,
  ItemStack,
  Stats,
} from "./types.js";

export interface EquipBestScoreInput {
  readonly stack: Readonly<ItemStack>;
  readonly def: Readonly<ItemDef>;
  readonly stats: Readonly<Partial<Stats>>;
}

export interface EquipBestOptions {
  /** Override the generic combat-power heuristic for title-specific builds. */
  score?: (input: EquipBestScoreInput) => number;
}

export interface EquipBestChange {
  slot: EquipSlot;
  uid: string;
  defId: string;
  previous: string | null;
  score: number;
}

export interface EquipBestResult {
  changes: EquipBestChange[];
  evaluated: number;
}

/** Base + gear breakdown for UI / tooltips. */
export type StatBreakdown = {
  base: Stats;
  gear: Stats;
  final: Stats;
  /** Per-slot gear contribution */
  bySlot: Array<{
    slot: EquipSlot;
    defId: string;
    name: string;
    stats: Partial<Stats>;
    itemLevel?: number;
    reqLevel?: number;
  }>;
};

/** Progress through the current level for XP bars and agent observations. */
export interface LevelProgress {
  /** Total XP at which the current level began. */
  current: number;
  /** Total XP required for the next level, or null at the table cap. */
  next: number | null;
  /** XP earned since the current level began. */
  earned: number;
  /** XP required within this level, or 0 at the table cap. */
  needed: number;
  /** Normalized progress in the inclusive range 0..1. */
  ratio: number;
  atMaxLevel: boolean;
}

/**
 * Cumulative XP thresholds with optional post-table growth. `thresholds[L]`
 * is the total XP required to advance from level L to L+1. Arrays retain the
 * legacy behavior and cap at their final entry.
 */
export interface LevelCurve {
  thresholds: readonly number[];
  /** Multiplier applied to the previous level's XP step after the table. */
  growth?: number;
  /** Highest reachable character level. Omit for unbounded extrapolation. */
  maxLevel?: number;
}

export type LevelCurveInput = readonly number[] | LevelCurve;

export interface LevelGainResult {
  beforeLevel: number;
  afterLevel: number;
  levelsGained: number;
  xp: number;
}

/** Resolve the cumulative next-level threshold, including safe extrapolation. */
export function levelThreshold(
  input: LevelCurveInput,
  level: number,
): number | null {
  const curve = normalizeLevelCurve(input);
  const targetLevel = Math.max(0, Math.floor(level));
  if (curve.maxLevel !== undefined && targetLevel >= curve.maxLevel) {
    return null;
  }
  if (targetLevel < curve.thresholds.length) {
    const threshold = curve.thresholds[targetLevel];
    return Number.isFinite(threshold) ? threshold! : null;
  }
  if (
    curve.growth === undefined ||
    !Number.isFinite(curve.growth) ||
    curve.growth < 1 ||
    curve.thresholds.length === 0
  ) {
    return null;
  }

  let threshold = curve.thresholds.at(-1)!;
  const previous = curve.thresholds.at(-2) ?? 0;
  let step = Math.max(1, threshold - previous);
  for (let index = curve.thresholds.length; index <= targetLevel; index += 1) {
    step = Math.max(1, Math.round(step * curve.growth));
    threshold += step;
  }
  return threshold;
}

function normalizeLevelCurve(input: LevelCurveInput): LevelCurve {
  return Array.isArray(input)
    ? { thresholds: input }
    : (input as LevelCurve);
}

/** Default draw order for paper-doll layers (body under gear under weapon). */
const SLOT_Z: Partial<Record<EquipSlot, number>> = {
  feet: 10,
  chest: 20,
  hands: 25,
  head: 30,
  offhand: 35,
  weapon: 40,
  ring: 5,
  amulet: 6,
  trinket: 7,
};

/** Default size vs body — full-body scale was making helms/weapons enormous. */
const SLOT_SCALE: Partial<Record<EquipSlot, number>> = {
  weapon: 0.4,
  offhand: 0.36,
  head: 0.3,
  chest: 0.48,
  hands: 0.22,
  feet: 0.22,
  ring: 0.14,
  amulet: 0.16,
  trinket: 0.18,
};

const SLOT_OX: Partial<Record<EquipSlot, number>> = {
  weapon: 0.34,
  offhand: -0.3,
  head: 0,
  chest: 0,
  hands: 0.28,
  feet: 0,
};

const SLOT_OY: Partial<Record<EquipSlot, number>> = {
  weapon: 0.02,
  offhand: 0.05,
  head: -0.36,
  chest: 0.04,
  hands: 0.12,
  feet: 0.32,
};

export interface CharacterSheetOpts {
  baseStats?: Stats;
  level?: number;
  xp?: number;
  gold?: number;
  inventoryCapacity?: number;
  itemDefs?: Record<string, ItemDef>;
}

/**
 * Full character: level/xp/gold + inventory + equipment + final stats.
 */
export class CharacterSheet {
  level: number;
  xp: number;
  gold: number;
  baseStats: Stats;
  inventory: Inventory;
  equipment: Equipment;
  private defs: Record<string, ItemDef>;

  constructor(opts: CharacterSheetOpts = {}) {
    this.level = opts.level ?? 1;
    this.xp = opts.xp ?? 0;
    this.gold = opts.gold ?? 0;
    this.baseStats = emptyStats(
      opts.baseStats ?? {
        maxHp: 100,
        damage: 10,
        armor: 0,
        speed: 160,
        critChance: 0.05,
        critMult: 1.5,
      },
    );
    this.inventory = new Inventory(opts.inventoryCapacity ?? 40);
    this.equipment = new Equipment();
    this.defs = { ...(opts.itemDefs ?? {}) };
  }

  setItemDefs(defs: Record<string, ItemDef>): void {
    this.defs = { ...defs };
  }

  lookup: ItemDefLookup = (id) => this.defs[id];

  finalStats(): Stats {
    const gear = this.equipment.gearMods(this.inventory, this.lookup);
    return computeFinalStats(this.baseStats, gear);
  }

  /** Base stats (naked) vs gear vs final — for Diablo-style character sheet UI. */
  statBreakdown(): StatBreakdown {
    const bySlot: StatBreakdown["bySlot"] = [];
    const gearParts: Array<Partial<Stats>> = [];
    for (const [slot, uid] of Object.entries(this.equipment.all()) as Array<
      [EquipSlot, string | null]
    >) {
      if (!uid) continue;
      const stack = this.inventory.get(uid);
      if (!stack) continue;
      const def = this.defs[stack.defId];
      const mods =
        stack.rolledStats && Object.keys(stack.rolledStats).length
          ? { ...stack.rolledStats }
          : { ...(def?.stats ?? {}) };
      bySlot.push({
        slot,
        defId: stack.defId,
        name: def?.name ?? stack.defId,
        stats: mods,
        itemLevel: stack.itemLevel,
        reqLevel: stack.reqLevel,
      });
      gearParts.push(mods);
    }
    const gear = addStats(...gearParts);
    return {
      base: { ...this.baseStats },
      gear,
      final: computeFinalStats(this.baseStats, gearParts),
      bySlot,
    };
  }

  addXp(amount: number, curve: LevelCurveInput): boolean {
    return this.addXpDetailed(amount, curve).levelsGained > 0;
  }

  /** Add XP and report every level crossed, including large single rewards. */
  addXpDetailed(amount: number, curve: LevelCurveInput): LevelGainResult {
    const beforeLevel = this.level;
    this.xp += amount;
    let next = levelThreshold(curve, this.level);
    while (next !== null && this.xp >= next) {
      this.level += 1;
      this.baseStats.maxHp += 8;
      this.baseStats.damage += 1;
      next = levelThreshold(curve, this.level);
    }
    return {
      beforeLevel,
      afterLevel: this.level,
      levelsGained: this.level - beforeLevel,
      xp: this.xp,
    };
  }

  /**
   * Resolve level-relative XP from the same cumulative threshold table used by
   * addXp. Keeping this here prevents game UIs from duplicating balance data or
   * applying a different level-to-threshold index.
   */
  xpProgress(curve: LevelCurveInput): LevelProgress {
    const current =
      this.level <= 1 ? 0 : (levelThreshold(curve, this.level - 1) ?? 0);
    const next = levelThreshold(curve, this.level);
    if (next === null || next <= current) {
      return {
        current,
        next,
        earned: Math.max(0, this.xp - current),
        needed: 0,
        ratio: 1,
        atMaxLevel: true,
      };
    }

    const needed = next - current;
    const earned = Math.max(0, Math.min(needed, this.xp - current));
    return {
      current,
      next,
      earned,
      needed,
      ratio: earned / needed,
      atMaxLevel: false,
    };
  }

  addGold(n: number): void {
    this.gold = Math.max(0, this.gold + n);
  }

  /** Pickup into inventory; returns false if full. */
  pickup(
    defId: string,
    qty = 1,
    opts?: {
      rolledStats?: Partial<Stats>;
      itemLevel?: number;
      reqLevel?: number;
      data?: Record<string, unknown>;
    },
  ): boolean {
    const def = this.defs[defId];
    const stack = this.inventory.add(defId, qty, {
      maxStack: def?.maxStack ?? 1,
      rolledStats: opts?.rolledStats,
      itemLevel: opts?.itemLevel,
      reqLevel: opts?.reqLevel,
      data: opts?.data,
    });
    return stack !== null;
  }

  equip(uid: string) {
    return this.equipment.equipAuto(
      uid,
      this.inventory,
      this.lookup,
      this.level,
    );
  }

  /**
   * Equip the highest-scoring wearable item in every slot. Equipped and bag
   * items compete together; ties keep the current loadout to avoid churn.
   */
  equipBest(options: EquipBestOptions = {}): EquipBestResult {
    const changes: EquipBestChange[] = [];
    let evaluated = 0;
    const score =
      options.score ??
      ((input: EquipBestScoreInput) =>
        itemPowerScore(
          input.stats,
          input.stack.itemLevel ?? input.def.itemLevel ?? 1,
        ));

    const resolvedStats = (stack: ItemStack, def: ItemDef): Partial<Stats> => {
      const parts: Array<Partial<Stats>> = [
        stack.rolledStats && Object.keys(stack.rolledStats).length
          ? stack.rolledStats
          : (def.stats ?? {}),
      ];
      const sockets = stack.data?.sockets as Array<string | null> | undefined;
      for (const gemId of sockets ?? []) {
        if (!gemId) continue;
        const gem = this.defs[gemId];
        if (gem?.stats) parts.push(gem.stats);
      }
      return addStats(...parts);
    };

    for (const slot of EQUIP_SLOTS) {
      const currentUid = this.equipment.get(slot);
      let bestUid = currentUid;
      let bestScore = Number.NEGATIVE_INFINITY;
      if (currentUid) {
        const current = this.inventory.get(currentUid);
        const currentDef = current ? this.defs[current.defId] : undefined;
        if (current && currentDef) {
          bestScore = score({
            stack: current,
            def: currentDef,
            stats: resolvedStats(current, currentDef),
          });
        }
      }

      for (const stack of this.inventory.all()) {
        const def = this.defs[stack.defId];
        if (
          def?.slot !== slot ||
          !canEquipAtLevel(this.level, stack, def)
        ) {
          continue;
        }
        evaluated += 1;
        const candidateScore = score({
          stack,
          def,
          stats: resolvedStats(stack, def),
        });
        if (
          !Number.isFinite(candidateScore) ||
          candidateScore <= bestScore
        ) {
          continue;
        }
        bestUid = stack.uid;
        bestScore = candidateScore;
      }

      if (!bestUid || bestUid === currentUid) continue;
      const stack = this.inventory.get(bestUid);
      if (!stack) continue;
      const equipped = this.equipment.equip(
        slot,
        bestUid,
        this.inventory,
        this.lookup,
        this.level,
      );
      if (!equipped.ok) continue;
      changes.push({
        slot,
        uid: bestUid,
        defId: stack.defId,
        previous: equipped.previous,
        score: bestScore,
      });
    }
    return { changes, evaluated };
  }

  /** Pickup a leveled gear instance (itemLevel + rolled stats). */
  pickupLeveled(
    defId: string,
    itemLevel: number,
    opts?: { qty?: number; rng?: () => number },
  ): boolean {
    const def = this.defs[defId];
    if (!def) return this.pickup(defId, opts?.qty ?? 1);
    // consumables / gold-like: no level scale
    if (!def.slot || (def.maxStack ?? 1) > 1) {
      return this.pickup(defId, opts?.qty ?? 1);
    }
    const inst = rollItemInstance(def, itemLevel, { rng: opts?.rng });
    const stack = this.inventory.add(defId, opts?.qty ?? 1, {
      maxStack: 1,
      rolledStats: inst.rolledStats,
      itemLevel: inst.itemLevel,
      reqLevel: inst.reqLevel,
    });
    return stack !== null;
  }

  unequip(slot: import("./types.js").EquipSlot) {
    return this.equipment.unequip(slot, this.inventory);
  }

  /**
   * Stable paper-doll and backpack contract for renderers and AI agents.
   * Equipped gear is owned by the character but does not consume bag cells.
   */
  inventoryView(): CharacterInventoryView {
    const equippedByUid = new Map<string, EquipSlot>();
    for (const [slot, uid] of Object.entries(this.equipment.all()) as Array<
      [EquipSlot, string | null]
    >) {
      if (uid) equippedByUid.set(uid, slot);
    }

    const resolve = (stack: import("./types.js").ItemStack): CharacterItemView => {
      const def = this.defs[stack.defId];
      const reqLevel = stack.reqLevel ?? stack.itemLevel ?? def?.itemLevel ?? 1;
      const equippedSlot = equippedByUid.get(stack.uid);
      // Prefer explicit icon; fall back to visual sprite or icons/<defId>.png
      const icon =
        def?.icon ??
        def?.visual?.sprite ??
        (def ? `icons/${def.id}.png` : undefined) ??
        `icons/${stack.defId}.png`;
      return {
        ...stack,
        name: def?.name ?? stack.defId,
        rarity: def?.rarity ?? "common",
        slot: def?.slot,
        icon,
        flavor: def?.flavor,
        maxStack: def?.maxStack ?? 1,
        stats: { ...(stack.rolledStats ?? def?.stats ?? {}) },
        canEquip: !def?.slot || this.level >= reqLevel,
        equippedSlot,
      };
    };

    const bagItems = this.inventory.bag().map(resolve);
    const bag: CharacterInventoryView["bag"] = Array.from(
      { length: Math.max(this.inventory.capacity, bagItems.length) },
      (_, index) => bagItems[index] ?? null,
    );
    const equipment = Object.fromEntries(
      EQUIP_SLOTS.map((slot) => {
        const uid = this.equipment.get(slot);
        const stack = uid ? this.inventory.get(uid) : undefined;
        return [slot, stack ? resolve(stack) : null];
      }),
    ) as Record<EquipSlot, CharacterItemView | null>;

    return {
      capacity: this.inventory.capacity,
      used: this.inventory.usedSlots(),
      free: this.inventory.freeSlots(),
      bag,
      equipment,
    };
  }

  /**
   * Diablo paper-doll: resolved visual layers for currently equipped gear.
   * Renderers draw body base first, then these sorted by z.
   */
  equippedVisuals(): EquippedVisualLayer[] {
    const out: EquippedVisualLayer[] = [];
    for (const [slot, uid] of Object.entries(this.equipment.all()) as Array<
      [EquipSlot, string | null]
    >) {
      if (!uid) continue;
      const stack = this.inventory.get(uid);
      if (!stack) continue;
      const def = this.defs[stack.defId];
      const sprite = def?.visual?.sprite ?? def?.icon;
      if (!sprite) continue;
      out.push({
        slot,
        defId: stack.defId,
        sprite,
        ox: def?.visual?.ox ?? SLOT_OX[slot] ?? 0,
        oy: def?.visual?.oy ?? SLOT_OY[slot] ?? 0,
        scale: def?.visual?.scale ?? SLOT_SCALE[slot] ?? 0.35,
        z: def?.visual?.z ?? SLOT_Z[slot] ?? 20,
      });
    }
    out.sort((a, b) => a.z - b.z);
    return out;
  }

  /**
   * Optional body base override from equipped items (usually chest armor).
   * First non-empty bodyVariant wins (highest z chest preferred).
   */
  bodyVariant(): string | null {
    const layers = this.equippedVisuals();
    for (let i = layers.length - 1; i >= 0; i--) {
      const def = this.defs[layers[i]!.defId];
      if (def?.visual?.bodyVariant) return def.visual.bodyVariant;
    }
    return null;
  }

  toJSON(): CharacterSaveBlob {
    return {
      level: this.level,
      xp: this.xp,
      gold: this.gold,
      baseStats: { ...this.baseStats },
      inventory: this.inventory.toJSON(),
      equipped: this.equipment.toJSON(),
      inventoryCapacity: this.inventory.capacity,
    };
  }

  loadJSON(data: CharacterSaveBlob): void {
    this.level = data.level;
    this.xp = data.xp;
    this.gold = data.gold;
    this.baseStats = emptyStats(data.baseStats);
    this.inventory.capacity = data.inventoryCapacity ?? 40;
    this.inventory.loadJSON(data.inventory ?? []);
    this.equipment.loadJSON(data.equipped ?? {}, this.inventory);
  }
}
