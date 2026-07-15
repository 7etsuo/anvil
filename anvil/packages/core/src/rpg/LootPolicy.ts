/**
 * Shared loot drop policy: roll table → ground spawn + presentation hints.
 */

import type { World } from "../world/World.js";
import { rollLootTable } from "../content/validateContent.js";
import { spawnGoldPile, spawnGroundLoot } from "./Loot.js";
import type { ItemDef } from "./types.js";

export type LootTableLike = {
  id: string;
  entries: Array<{ item: string; weight: number; min?: number; max?: number }>;
};

export type DropResult = {
  kind: "gold" | "item" | "none";
  defId?: string;
  qty?: number;
  gold?: number;
  rarity?: string;
  name?: string;
  x: number;
  y: number;
  entityId?: string;
};

export type LootPolicyOpts = {
  /** Multiplier on gold amounts */
  goldMul?: number;
  /** Max random scatter from drop point */
  scatter?: number;
  rng?: () => number;
  itemDefs?: Record<string, ItemDef>;
};

export function dropFromTable(
  world: World,
  x: number,
  y: number,
  table: LootTableLike | undefined,
  opts: LootPolicyOpts = {},
): DropResult {
  const rng = opts.rng ?? Math.random;
  const scatter = opts.scatter ?? 16;
  const jx = x + (rng() - 0.5) * scatter;
  const jy = y + (rng() - 0.5) * scatter;
  if (!table) {
    const g = Math.floor((3 + rng() * 10) * (opts.goldMul ?? 1));
    const id = spawnGoldPile(world, jx, jy, g);
    return { kind: "gold", gold: g, x: jx, y: jy, entityId: id };
  }
  const roll = rollLootTable(table, rng);
  if (!roll) return { kind: "none", x: jx, y: jy };
  if (roll.item === "gold") {
    const g = Math.floor(
      roll.qty * (4 + rng() * 12) * (opts.goldMul ?? 1),
    );
    const id = spawnGoldPile(world, jx, jy, g);
    return { kind: "gold", gold: g, x: jx, y: jy, entityId: id };
  }
  const id = spawnGroundLoot(world, jx, jy, {
    defId: roll.item,
    qty: roll.qty,
  });
  const def = opts.itemDefs?.[roll.item];
  return {
    kind: "item",
    defId: roll.item,
    qty: roll.qty,
    rarity: def?.rarity ?? "common",
    name: def?.name ?? roll.item,
    x: jx,
    y: jy,
    entityId: id,
  };
}

/** Auto-pickup radius defaults for Diablo-like feel. */
export const LOOT_GOLD_RADIUS = 48;
export const LOOT_ITEM_RADIUS = 28;
