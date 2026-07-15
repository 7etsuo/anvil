/**
 * Data-driven elite pack modifiers.
 */

import type { Stats } from "../rpg/types.js";
import type { DamageType } from "./Damage.js";

export type EliteAffixDef = {
  id: string;
  name: string;
  /** Multipliers / flat mods applied to actor stats */
  statMul?: Partial<Record<keyof Stats | string, number>>;
  statAdd?: Partial<Stats>;
  /** Extra status applied on contact hit */
  onHitStatus?: string;
  damageType?: DamageType;
  /** Tint / presentation key */
  tint?: string;
  weight?: number;
  tags?: string[];
};

export const BUILTIN_ELITE_AFFIXES: EliteAffixDef[] = [
  {
    id: "swift",
    name: "Swift",
    statMul: { speed: 1.35 },
    tint: "#80ff80",
    weight: 10,
    tags: ["movement"],
  },
  {
    id: "brutal",
    name: "Brutal",
    statMul: { damage: 1.4 },
    statAdd: { maxHp: 20 },
    tint: "#ff6060",
    weight: 10,
    tags: ["damage"],
  },
  {
    id: "stone",
    name: "Stonehide",
    statAdd: { armor: 12, maxHp: 40 },
    tint: "#a0a0a0",
    weight: 8,
    tags: ["tank"],
  },
  {
    id: "flame",
    name: "Flame-touched",
    damageType: "fire",
    onHitStatus: "burn",
    tint: "#ff8800",
    weight: 7,
    tags: ["elemental", "fire"],
  },
  {
    id: "frost",
    name: "Frostbound",
    damageType: "cold",
    onHitStatus: "chill",
    tint: "#88ccff",
    weight: 7,
    tags: ["elemental", "cold"],
  },
  {
    id: "venom",
    name: "Venomous",
    damageType: "poison",
    onHitStatus: "poison",
    tint: "#60c060",
    weight: 6,
    tags: ["elemental", "poison"],
  },
  {
    id: "champion",
    name: "Champion",
    statMul: { damage: 1.25, speed: 1.1 },
    statAdd: { maxHp: 60, armor: 6 },
    tint: "#ffcc00",
    weight: 3,
    tags: ["rare"],
  },
];

export type RolledElite = {
  affixes: EliteAffixDef[];
  /** Combined presentation */
  tint?: string;
  onHitStatuses: string[];
  damageType?: DamageType;
  /** Apply to base numeric fields */
  applyToStats(base: Partial<Stats>): Partial<Stats>;
};

export function rollEliteAffixes(
  count: number,
  rng: () => number,
  pool: EliteAffixDef[] = BUILTIN_ELITE_AFFIXES,
): RolledElite {
  const n = Math.max(0, Math.min(count, pool.length));
  const available = [...pool];
  const picked: EliteAffixDef[] = [];
  for (let i = 0; i < n && available.length; i++) {
    const total = available.reduce((s, a) => s + (a.weight ?? 1), 0);
    let r = rng() * total;
    let idx = 0;
    for (let j = 0; j < available.length; j++) {
      r -= available[j]!.weight ?? 1;
      if (r <= 0) {
        idx = j;
        break;
      }
    }
    picked.push(available[idx]!);
    available.splice(idx, 1);
  }
  return buildRolledElite(picked);
}

export function buildRolledElite(affixes: EliteAffixDef[]): RolledElite {
  const onHitStatuses = affixes
    .map((a) => a.onHitStatus)
    .filter((x): x is string => !!x);
  const damageType = [...affixes].reverse().find((a) => a.damageType)?.damageType;
  const tint = [...affixes].reverse().find((a) => a.tint)?.tint;

  return {
    affixes,
    tint,
    onHitStatuses,
    damageType,
    applyToStats(base) {
      const out: Record<string, number> = { ...base } as Record<string, number>;
      for (const a of affixes) {
        if (a.statAdd) {
          for (const [k, v] of Object.entries(a.statAdd)) {
            if (typeof v === "number") out[k] = (out[k] ?? 0) + v;
          }
        }
        if (a.statMul) {
          for (const [k, v] of Object.entries(a.statMul)) {
            if (typeof v === "number" && typeof out[k] === "number") {
              out[k] = out[k]! * v;
            }
          }
        }
      }
      return out as Partial<Stats>;
    },
  };
}
