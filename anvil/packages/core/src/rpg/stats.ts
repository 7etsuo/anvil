import { ZERO_STATS, type Stats } from "./types.js";

export function emptyStats(overrides: Partial<Stats> = {}): Stats {
  const base: Stats = { ...ZERO_STATS };
  for (const [k, v] of Object.entries(overrides)) {
    if (typeof v === "number") base[k] = v;
  }
  return base;
}

export function addStats(...parts: Array<Partial<Stats> | undefined>): Stats {
  const out = emptyStats();
  for (const p of parts) {
    if (!p) continue;
    for (const [k, v] of Object.entries(p)) {
      if (typeof v !== "number") continue;
      out[k] = (out[k] ?? 0) + v;
    }
  }
  return out;
}

/** Final stats = base + all gear mods (clamped where sensible). */
export function computeFinalStats(
  base: Stats,
  gearMods: Array<Partial<Stats> | undefined>,
): Stats {
  const s = addStats(base, ...gearMods);
  s.maxHp = Math.max(1, s.maxHp);
  s.damage = Math.max(0, s.damage);
  s.armor = Math.max(0, s.armor);
  s.speed = Math.max(0, s.speed);
  s.critChance = Math.min(1, Math.max(0, s.critChance));
  s.critMult = Math.max(1, s.critMult || 1);
  return s;
}

/** Mitigate raw damage by armor (diminishing). */
export function applyArmor(rawDamage: number, armor: number): number {
  if (rawDamage <= 0) return 0;
  const mitigated = rawDamage * (100 / (100 + Math.max(0, armor)));
  return Math.max(1, Math.floor(mitigated));
}
