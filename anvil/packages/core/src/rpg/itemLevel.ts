/**
 * Item level scaling: base (level-1) stats → rolled stats at itemLevel,
 * with random variance. Equip is gated by reqLevel ≤ character level.
 */

import type { ItemDef, Stats } from "./types.js";

export type ItemLevelOpts = {
  /** Level at which def.stats are defined (default 1). */
  baseLevel?: number;
  /**
   * Linear growth per level above base for flat combat stats
   * (damage, armor, maxHp, speed). Default 0.12 = +12%/level.
   */
  growthPerLevel?: number;
  /** ± fraction after level scale (default 0.15 = ±15%). */
  variance?: number;
  rng?: () => number;
};

const FLAT_GROWTH_KEYS = new Set([
  "damage",
  "armor",
  "maxHp",
  "speed",
]);

/**
 * Scale a partial stats block from baseLevel to itemLevel, then apply variance.
 */
export function scaleStatsForItemLevel(
  base: Partial<Stats> | undefined,
  itemLevel: number,
  opts: ItemLevelOpts = {},
): Partial<Stats> {
  if (!base) return {};
  const baseLevel = Math.max(1, opts.baseLevel ?? 1);
  const ilvl = Math.max(1, Math.floor(itemLevel));
  const growth = opts.growthPerLevel ?? 0.12;
  const variance = opts.variance ?? 0.15;
  const rng = opts.rng ?? Math.random;
  const levelsAbove = Math.max(0, ilvl - baseLevel);
  const out: Partial<Stats> = {};

  for (const [k, raw] of Object.entries(base)) {
    if (typeof raw !== "number") continue;
    let grown = raw;
    if (FLAT_GROWTH_KEYS.has(k)) {
      grown = raw * (1 + growth * levelsAbove);
    } else if (k === "critChance") {
      // softer: +0.8% absolute per level above base (of the base value scale)
      grown = raw + levelsAbove * 0.008;
    } else if (k === "critMult") {
      grown = raw + levelsAbove * 0.03;
    } else {
      grown = raw * (1 + growth * 0.5 * levelsAbove);
    }
    const roll = 1 + (rng() * 2 - 1) * variance;
    let v = grown * roll;
    if (k === "critChance") v = Math.min(0.75, Math.max(0, v));
    else if (k === "critMult") v = Math.max(1, v);
    else if (k === "maxHp" || k === "damage" || k === "armor" || k === "speed") {
      v = Math.max(0, Math.round(v));
    } else {
      v = Math.round(v * 100) / 100;
    }
    out[k] = v;
  }
  return out;
}

/** Default item level for a drop: around player/zone level, slightly random. */
export function rollDropItemLevel(
  characterLevel: number,
  zoneLevel = 1,
  rng: () => number = Math.random,
): number {
  const center = Math.max(1, Math.round((characterLevel + zoneLevel) / 2));
  // ±2 levels, never below 1
  const delta = Math.floor(rng() * 5) - 2;
  return Math.max(1, center + delta);
}

export type RolledItemInstance = {
  itemLevel: number;
  reqLevel: number;
  rolledStats: Partial<Stats>;
};

/**
 * Create a leveled instance of a content def.
 * reqLevel === itemLevel so ilvl 10 needs char level ≥ 10; level 11+ still ok.
 */
export function rollItemInstance(
  def: ItemDef,
  itemLevel: number,
  opts: ItemLevelOpts = {},
): RolledItemInstance {
  const ilvl = Math.max(1, Math.floor(itemLevel));
  const baseLevel = def.itemLevel ?? opts.baseLevel ?? 1;
  const rolledStats = scaleStatsForItemLevel(def.stats, ilvl, {
    ...opts,
    baseLevel,
  });
  return {
    itemLevel: ilvl,
    reqLevel: ilvl,
    rolledStats,
  };
}

/** Effective required level for a stack (defaults to 1). */
export function stackReqLevel(
  stack: { reqLevel?: number; itemLevel?: number; defId?: string },
  def?: ItemDef,
): number {
  return (
    stack.reqLevel ??
    stack.itemLevel ??
    def?.itemLevel ??
    1
  );
}

export function canEquipAtLevel(
  characterLevel: number,
  stack: { reqLevel?: number; itemLevel?: number; defId?: string },
  def?: ItemDef,
): boolean {
  return characterLevel >= stackReqLevel(stack, def);
}
