import type { World } from "../world/World.js";
import type { Stats } from "./types.js";

export interface GroundLootData {
  defId: string;
  qty: number;
  rolledStats?: Partial<Stats>;
  gold?: number;
  data?: Record<string, unknown>;
}

/**
 * Spawn a ground loot pile entity (tags: loot, pickup).
 * Games read `data.loot` and call CharacterSheet.pickup on interact.
 */
export function spawnGroundLoot(
  world: World,
  x: number,
  y: number,
  loot: GroundLootData,
  opts?: { id?: string; lifetimeMs?: number },
): string {
  return world.spawn({
    id: opts?.id,
    tags: ["loot", "pickup"],
    transform: { x, y },
    lifetime: opts?.lifetimeMs
      ? { remainingMs: opts.lifetimeMs }
      : undefined,
    data: {
      loot: {
        defId: loot.defId,
        qty: loot.qty,
        rolledStats: loot.rolledStats,
        gold: loot.gold ?? 0,
        data: loot.data,
      } satisfies GroundLootData & { gold: number },
    },
  });
}

export function spawnGoldPile(
  world: World,
  x: number,
  y: number,
  gold: number,
): string {
  return spawnGroundLoot(world, x, y, {
    defId: "gold",
    qty: 1,
    gold,
  });
}

/** All loot entities within radius of (x,y). */
export function lootNear(
  world: World,
  x: number,
  y: number,
  radius: number,
): Array<{ id: string; loot: GroundLootData & { gold?: number } }> {
  const out: Array<{ id: string; loot: GroundLootData & { gold?: number } }> =
    [];
  for (const e of world.all()) {
    if (!e.tags.includes("loot") || !e.transform) continue;
    const d = Math.hypot(e.transform.x - x, e.transform.y - y);
    if (d > radius) continue;
    const loot = e.data.loot as GroundLootData | undefined;
    if (!loot) continue;
    out.push({ id: e.id, loot });
  }
  return out;
}

/**
 * Try pick up one nearest loot into sheet.
 * Returns picked entity id or null.
 */
export function tryPickupNearest(
  world: World,
  x: number,
  y: number,
  radius: number,
  sheet: {
    pickup: (
      defId: string,
      qty?: number,
      opts?: { rolledStats?: Partial<Stats>; data?: Record<string, unknown> },
    ) => boolean;
    addGold: (n: number) => void;
  },
): string | null {
  const piles = lootNear(world, x, y, radius).sort((a, b) => {
    const ea = world.get(a.id)!;
    const eb = world.get(b.id)!;
    const da = Math.hypot(ea.transform!.x - x, ea.transform!.y - y);
    const db = Math.hypot(eb.transform!.x - x, eb.transform!.y - y);
    return da - db;
  });
  for (const p of piles) {
    if (p.loot.gold && p.loot.gold > 0 && p.loot.defId === "gold") {
      sheet.addGold(p.loot.gold);
      world.destroy(p.id);
      return p.id;
    }
    const ok = sheet.pickup(p.loot.defId, p.loot.qty ?? 1, {
      rolledStats: p.loot.rolledStats,
      data: p.loot.data,
    });
    if (ok) {
      if (p.loot.gold) sheet.addGold(p.loot.gold);
      world.destroy(p.id);
      return p.id;
    }
  }
  return null;
}
