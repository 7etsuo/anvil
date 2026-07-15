/**
 * Damage types + resistance mitigation.
 * Physical also uses classic armor formula; elemental uses resist only.
 */

import { applyArmor } from "../rpg/stats.js";
import type { Stats } from "../rpg/types.js";

export const DAMAGE_TYPES = [
  "physical",
  "fire",
  "cold",
  "lightning",
  "poison",
  "holy",
  "arcane",
] as const;

export type DamageType = (typeof DAMAGE_TYPES)[number];

/** Resist keys on Stats (fraction 0–1, clamped at apply time). */
export type ResistStatKey =
  | "resistPhysical"
  | "resistFire"
  | "resistCold"
  | "resistLightning"
  | "resistPoison"
  | "resistHoly"
  | "resistArcane";

export const DAMAGE_TYPE_RESIST: Record<DamageType, ResistStatKey> = {
  physical: "resistPhysical",
  fire: "resistFire",
  cold: "resistCold",
  lightning: "resistLightning",
  poison: "resistPoison",
  holy: "resistHoly",
  arcane: "resistArcane",
};

export type ResistMap = Partial<Record<DamageType, number>>;

export type DamagePacket = {
  raw: number;
  type?: DamageType;
  /** Crit already applied to raw by caller */
  crit?: boolean;
  abilityId?: string;
  sourceId?: string;
};

export type DamageResult = {
  raw: number;
  final: number;
  mitigated: number;
  type: DamageType;
  crit?: boolean;
};

/** Max resist fraction (hard cap so nothing is fully immune unless flagged). */
export const RESIST_CAP = 0.9;

export function isDamageType(v: string): v is DamageType {
  return (DAMAGE_TYPES as readonly string[]).includes(v);
}

export function resistStatKey(type: DamageType): ResistStatKey {
  return DAMAGE_TYPE_RESIST[type];
}

/** Read resist fraction from Stats bag or explicit map (0–1). */
export function getResist(
  source: Partial<Stats> | ResistMap | undefined,
  type: DamageType,
): number {
  if (!source) return 0;
  const asMap = source as ResistMap;
  if (typeof asMap[type] === "number") {
    return clamp01(asMap[type]!);
  }
  const key = resistStatKey(type);
  const v = (source as Partial<Stats>)[key];
  return typeof v === "number" ? clamp01(v) : 0;
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

/**
 * Apply armor (physical only) then type resist.
 * Armor uses diminishing `applyArmor`; resist is multiplicative remaining damage.
 */
export function mitigateDamage(opts: {
  raw: number;
  type?: DamageType;
  armor?: number;
  /** Defender stats or resist map */
  resists?: Partial<Stats> | ResistMap;
  /** Cap resist (default RESIST_CAP) */
  resistCap?: number;
}): DamageResult {
  const type: DamageType = opts.type ?? "physical";
  const raw = Math.max(0, opts.raw);
  if (raw <= 0) {
    return { raw: 0, final: 0, mitigated: 0, type };
  }

  let afterArmor = raw;
  if (type === "physical") {
    afterArmor = applyArmor(raw, opts.armor ?? 0);
  }

  const cap = opts.resistCap ?? RESIST_CAP;
  const r = Math.min(cap, getResist(opts.resists, type));
  const final = Math.max(1, Math.floor(afterArmor * (1 - r)));
  return {
    raw,
    final,
    mitigated: Math.max(0, raw - final),
    type,
  };
}

/** Convenience: full packet → result. */
export function resolveDamage(
  packet: DamagePacket,
  defender: { armor?: number; stats?: Partial<Stats> },
): DamageResult {
  const r = mitigateDamage({
    raw: packet.raw,
    type: packet.type,
    armor: defender.armor ?? defender.stats?.armor ?? 0,
    resists: defender.stats,
  });
  return { ...r, crit: packet.crit };
}
