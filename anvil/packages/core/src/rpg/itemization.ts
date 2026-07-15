/**
 * Generic item progression for equippable gear (any genre).
 *
 * Content authors write **base stats at a base level** (usually 1). At runtime,
 * instances get an **item level**, **required level**, and **rolled stats**.
 *
 * Default curve (fully overrideable via ItemizationConfig):
 *
 *   power(L) = 1 + growthPerLevel * (L - baseLevel)
 *   stat     = base * power * slotMul * rarityMul * quality
 *   quality  ∈ [1−variance, 1+variance]
 *   equip if characterLevel ≥ reqLevel  (higher characters may wear lower gear)
 *
 * Defaults are tuned like common ARPGs; pass `config` for linear-RPG, survival,
 * etc. See anvil/docs/ITEMIZATION.md.
 */

import type { EquipSlot, ItemDef, ItemRarity, Stats } from "./types.js";

export type ItemizationConfig = {
  /** Growth of flat combat stats per item level above base. Default 0.12. */
  growthPerLevel: number;
  /** Half-range quality roll after scale. Default 0.12 (±12%). */
  variance: number;
  /** Slot multiplies applied to relevant stats. */
  slotMul: Partial<Record<EquipSlot, number>>;
  /** Rarity multiplies total budget. */
  rarityMul: Record<ItemRarity, number>;
  /** Soft stats grow slower. */
  critChancePerLevel: number;
  critMultPerLevel: number;
};

export const DEFAULT_ITEMIZATION: ItemizationConfig = {
  growthPerLevel: 0.12,
  variance: 0.12,
  slotMul: {
    weapon: 1.15,
    offhand: 0.85,
    head: 0.75,
    chest: 1.1,
    hands: 0.7,
    feet: 0.7,
    ring: 0.55,
    amulet: 0.65,
    trinket: 0.6,
  },
  rarityMul: {
    common: 0.9,
    magic: 1.0,
    rare: 1.2,
    unique: 1.4,
    set: 1.3,
  },
  critChancePerLevel: 0.006,
  critMultPerLevel: 0.025,
};

/** Power factor for item level L relative to baseLevel. */
export function itemPowerFactor(
  itemLevel: number,
  baseLevel = 1,
  growthPerLevel = DEFAULT_ITEMIZATION.growthPerLevel,
): number {
  const L = Math.max(1, Math.floor(itemLevel));
  const B = Math.max(1, Math.floor(baseLevel));
  return 1 + growthPerLevel * Math.max(0, L - B);
}

/**
 * Quality roll in [1−v, 1+v]. Deterministic if rng fixed.
 * Independent per-stat for "range within level" feel.
 */
export function qualityRoll(
  variance = DEFAULT_ITEMIZATION.variance,
  rng: () => number = Math.random,
): number {
  const v = Math.max(0, Math.min(0.5, variance));
  return 1 + (rng() * 2 - 1) * v;
}

export type ScaleItemStatsOpts = {
  baseLevel?: number;
  config?: Partial<ItemizationConfig>;
  rng?: () => number;
  /** If set, skip random quality (use 1.0) — for tests / tooltips mid-range. */
  fixedQuality?: number;
};

/**
 * Scale template stats to an instance item level.
 * Applies: level power × slot × rarity × quality.
 */
/**
 * Scale template stats to an instance item level.
 * @param def optional slot/rarity/base level from the content def
 */
export function scaleStatsForItemLevel(
  base: Partial<Stats> | undefined,
  itemLevel: number,
  def?: Pick<ItemDef, "slot" | "rarity" | "itemLevel">,
  opts: ScaleItemStatsOpts = {},
): Partial<Stats> {
  if (!base) return {};
  const cfg: ItemizationConfig = {
    ...DEFAULT_ITEMIZATION,
    ...opts.config,
    slotMul: { ...DEFAULT_ITEMIZATION.slotMul, ...opts.config?.slotMul },
    rarityMul: { ...DEFAULT_ITEMIZATION.rarityMul, ...opts.config?.rarityMul },
  };
  const baseLevel = opts.baseLevel ?? def?.itemLevel ?? 1;
  const power = itemPowerFactor(itemLevel, baseLevel, cfg.growthPerLevel);
  const slot = def?.slot;
  const slotM = (slot ? cfg.slotMul[slot] : 1) ?? 1;
  const rarity = def?.rarity ?? "common";
  const rarM = cfg.rarityMul[rarity] ?? 1;
  const levelsAbove = Math.max(0, Math.floor(itemLevel) - Math.floor(baseLevel));
  const rng = opts.rng ?? Math.random;
  const out: Partial<Stats> = {};

  for (const [k, raw] of Object.entries(base)) {
    if (typeof raw !== "number") continue;
    let grown: number;
    if (k === "critChance") {
      grown = raw + levelsAbove * cfg.critChancePerLevel;
    } else if (k === "critMult") {
      grown = raw + levelsAbove * cfg.critMultPerLevel;
    } else if (
      k === "damage" ||
      k === "armor" ||
      k === "maxHp" ||
      k === "speed"
    ) {
      // Primary combat stats: full budget curve × slot × rarity
      grown = raw * power * slotM * rarM;
    } else {
      grown = raw * (1 + cfg.growthPerLevel * 0.5 * levelsAbove) * rarM;
    }
    const q =
      opts.fixedQuality != null
        ? opts.fixedQuality
        : qualityRoll(cfg.variance, rng);
    let v = grown * q;
    if (k === "critChance") v = Math.min(0.75, Math.max(0, v));
    else if (k === "critMult") v = Math.max(1, v);
    else if (k === "maxHp" || k === "damage" || k === "armor") {
      v = Math.max(0, Math.round(v));
    } else if (k === "speed") {
      v = Math.max(0, Math.round(v));
    } else {
      v = Math.round(v * 100) / 100;
    }
    out[k] = v;
  }
  return out;
}

/**
 * Suggest drop item level from character + zone power.
 * Default: max(cLvl, zoneLevel) + uniform{-2..+2}, min 1.
 * Games can ignore this and pass an explicit itemLevel instead.
 */
export function rollDropItemLevel(
  characterLevel: number,
  zoneLevel = 1,
  rng: () => number = Math.random,
  jitter = 2,
): number {
  const center = Math.max(1, Math.max(characterLevel, zoneLevel));
  const j = Math.max(0, Math.floor(jitter));
  const delta = j === 0 ? 0 : Math.floor(rng() * (2 * j + 1)) - j;
  return Math.max(1, center + delta);
}

/**
 * Required character level to equip an instance.
 * Default strict: reqLevel = itemLevel.
 * Soft: reqLevel = floor(itemLevel * softFactor) (e.g. 0.85).
 */
export function computeReqLevel(
  itemLevel: number,
  opts?: { soft?: boolean; softFactor?: number },
): number {
  const L = Math.max(1, Math.floor(itemLevel));
  if (opts?.soft) {
    const f = opts.softFactor ?? 0.85;
    return Math.max(1, Math.floor(L * f));
  }
  return L;
}

export type RolledItemInstance = {
  itemLevel: number;
  reqLevel: number;
  rolledStats: Partial<Stats>;
  /** Mid-roll stats at same level (for "show range" UIs). */
  minStats: Partial<Stats>;
  maxStats: Partial<Stats>;
};

/**
 * Full instance roll for any equippable ItemDef (weapon, armor, jewelry…).
 */
export function rollItemInstance(
  def: ItemDef,
  itemLevel: number,
  opts: ScaleItemStatsOpts & { softReq?: boolean } = {},
): RolledItemInstance {
  const ilvl = Math.max(1, Math.floor(itemLevel));
  const baseLevel = def.itemLevel ?? opts.baseLevel ?? 1;
  const cfg = { ...DEFAULT_ITEMIZATION, ...opts.config };
  const rolledStats = scaleStatsForItemLevel(def.stats, ilvl, def, {
    ...opts,
    baseLevel,
  });
  const minStats = scaleStatsForItemLevel(def.stats, ilvl, def, {
    ...opts,
    baseLevel,
    fixedQuality: 1 - cfg.variance,
  });
  const maxStats = scaleStatsForItemLevel(def.stats, ilvl, def, {
    ...opts,
    baseLevel,
    fixedQuality: 1 + cfg.variance,
  });
  return {
    itemLevel: ilvl,
    reqLevel: computeReqLevel(ilvl, { soft: opts.softReq }),
    rolledStats,
    minStats,
    maxStats,
  };
}

export function stackReqLevel(
  stack: { reqLevel?: number; itemLevel?: number; defId?: string },
  def?: ItemDef,
): number {
  return stack.reqLevel ?? stack.itemLevel ?? def?.itemLevel ?? 1;
}

/** True if characterLevel ≥ required (higher levels can always wear lower gear). */
export function canEquipAtLevel(
  characterLevel: number,
  stack: { reqLevel?: number; itemLevel?: number; defId?: string },
  def?: ItemDef,
): boolean {
  return characterLevel >= stackReqLevel(stack, def);
}

/**
 * Approximate item budget score for comparing two pieces (auto-equip).
 * Higher is better. Uses rolled stats when present.
 */
export function itemPowerScore(
  stats: Partial<Stats> | undefined,
  itemLevel = 1,
): number {
  if (!stats) return itemLevel;
  return (
    (stats.damage ?? 0) * 3 +
    (stats.armor ?? 0) * 2 +
    (stats.maxHp ?? 0) * 0.5 +
    (stats.critChance ?? 0) * 40 +
    (stats.critMult ?? 0) * 5 +
    itemLevel
  );
}
