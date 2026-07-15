/**
 * Crafting recipes, socket fills, simple reforge (reroll rolled stats).
 */

import type { ItemStack, Stats } from "../rpg/types.js";
import type { Wallet } from "../rpg/Wallet.js";

export type CraftIngredient = {
  itemId: string;
  qty: number;
};

export type CraftRecipe = {
  id: string;
  name?: string;
  inputs: CraftIngredient[];
  /** Output item def id */
  outputId: string;
  outputQty?: number;
  /** Optional currency cost */
  cost?: Record<string, number>;
  station?: string;
  data?: Record<string, unknown>;
};

export type CraftResult =
  | { ok: true; outputId: string; qty: number }
  | { ok: false; reason: string };

export type SocketResult =
  | { ok: true; stack: ItemStack }
  | { ok: false; reason: string };

export type ReforgeResult =
  | { ok: true; stack: ItemStack; rolledStats: Partial<Stats> }
  | { ok: false; reason: string };

/**
 * Inventory access interface so crafting stays decoupled from Inventory class.
 */
export type CraftInventory = {
  countDef(defId: string): number;
  removeDef(defId: string, qty: number): boolean;
  addDef(defId: string, qty: number): boolean;
};

export class CraftingSystem {
  private recipes = new Map<string, CraftRecipe>();

  register(recipe: CraftRecipe): void {
    this.recipes.set(recipe.id, recipe);
  }

  registerAll(recipes: CraftRecipe[]): void {
    for (const r of recipes) this.register(r);
  }

  get(id: string): CraftRecipe | undefined {
    return this.recipes.get(id);
  }

  list(station?: string): CraftRecipe[] {
    const all = [...this.recipes.values()];
    if (!station) return all;
    return all.filter((r) => !r.station || r.station === station);
  }

  canCraft(
    recipeId: string,
    inv: CraftInventory,
    wallet?: Wallet,
  ): boolean {
    const r = this.recipes.get(recipeId);
    if (!r) return false;
    for (const ing of r.inputs) {
      if (inv.countDef(ing.itemId) < ing.qty) return false;
    }
    if (r.cost && wallet && !wallet.canAfford(r.cost)) return false;
    return true;
  }

  craft(
    recipeId: string,
    inv: CraftInventory,
    wallet?: Wallet,
  ): CraftResult {
    const r = this.recipes.get(recipeId);
    if (!r) return { ok: false, reason: "missing" };
    if (!this.canCraft(recipeId, inv, wallet)) {
      return { ok: false, reason: "ingredients" };
    }
    if (r.cost && wallet && !wallet.spendMany(r.cost)) {
      return { ok: false, reason: "funds" };
    }
    for (const ing of r.inputs) {
      if (!inv.removeDef(ing.itemId, ing.qty)) {
        return { ok: false, reason: "ingredients" };
      }
    }
    const qty = r.outputQty ?? 1;
    if (!inv.addDef(r.outputId, qty)) {
      return { ok: false, reason: "inv_full" };
    }
    return { ok: true, outputId: r.outputId, qty };
  }
}

/**
 * Socket a gem into an item stack.
 * Gems stored in stack.data.sockets: Array<{ gemId: string } | null>
 */
export function socketGem(
  stack: ItemStack,
  socketIndex: number,
  gemId: string,
  opts?: { maxSockets?: number },
): SocketResult {
  const max = opts?.maxSockets ?? 3;
  const data = { ...(stack.data ?? {}) };
  let sockets = (data.sockets as Array<string | null> | undefined) ?? [];
  while (sockets.length < max) sockets.push(null);
  if (socketIndex < 0 || socketIndex >= sockets.length) {
    return { ok: false, reason: "index" };
  }
  if (sockets[socketIndex]) return { ok: false, reason: "occupied" };
  sockets = [...sockets];
  sockets[socketIndex] = gemId;
  data.sockets = sockets;
  return { ok: true, stack: { ...stack, data } };
}

/**
 * Reforge: re-roll numeric rolledStats with variance around existing values.
 */
export function reforgeStats(
  stack: ItemStack,
  rng: () => number,
  opts?: { variance?: number; costOk?: boolean },
): ReforgeResult {
  if (opts?.costOk === false) return { ok: false, reason: "funds" };
  const base = stack.rolledStats ?? {};
  const keys = Object.keys(base);
  if (keys.length === 0) return { ok: false, reason: "no_stats" };
  const v = opts?.variance ?? 0.15;
  const rolled: Partial<Stats> = {};
  for (const k of keys) {
    const cur = base[k];
    if (typeof cur !== "number") continue;
    const mul = 1 + (rng() * 2 - 1) * v;
    rolled[k] = Math.max(0, Math.round(cur * mul * 10) / 10);
  }
  return {
    ok: true,
    stack: { ...stack, rolledStats: rolled },
    rolledStats: rolled,
  };
}
