/**
 * Content pipeline validators for item defs, loot tables, quests.
 */

export interface ValidationIssue {
  path: string;
  message: string;
  level: "error" | "warn";
}

export interface ItemDefLike {
  id: string;
  name?: string;
  slot?: string;
  stats?: Record<string, number>;
  maxStack?: number;
}

export interface LootTableLike {
  id: string;
  entries: Array<{ item: string; weight: number; min?: number; max?: number }>;
}

export function validateItemDefs(
  items: ItemDefLike[],
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const ids = new Set<string>();
  for (const it of items) {
    if (!it.id) {
      issues.push({ path: "item", message: "missing id", level: "error" });
      continue;
    }
    if (ids.has(it.id)) {
      issues.push({
        path: `item:${it.id}`,
        message: "duplicate id",
        level: "error",
      });
    }
    ids.add(it.id);
    if (!it.name) {
      issues.push({
        path: `item:${it.id}`,
        message: "missing name",
        level: "warn",
      });
    }
    if (it.maxStack !== undefined && it.maxStack < 1) {
      issues.push({
        path: `item:${it.id}/maxStack`,
        message: "maxStack must be >= 1",
        level: "error",
      });
    }
  }
  return issues;
}

export function validateLootTables(
  tables: LootTableLike[],
  knownItemIds: Set<string>,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const t of tables) {
    if (!t.id) {
      issues.push({ path: "loot", message: "missing id", level: "error" });
      continue;
    }
    if (!t.entries?.length) {
      issues.push({
        path: `loot:${t.id}`,
        message: "empty entries",
        level: "warn",
      });
      continue;
    }
    let w = 0;
    for (let i = 0; i < t.entries.length; i++) {
      const e = t.entries[i]!;
      w += e.weight;
      if (e.weight <= 0) {
        issues.push({
          path: `loot:${t.id}/entries/${i}`,
          message: "weight must be > 0",
          level: "error",
        });
      }
      if (e.item !== "gold" && !knownItemIds.has(e.item)) {
        issues.push({
          path: `loot:${t.id}/entries/${i}/item`,
          message: `unknown item ${e.item}`,
          level: "error",
        });
      }
    }
    if (w <= 0) {
      issues.push({
        path: `loot:${t.id}`,
        message: "total weight must be > 0",
        level: "error",
      });
    }
  }
  return issues;
}

/** Weighted roll helper. */
export function rollLootTable(
  table: LootTableLike,
  rng: () => number = Math.random,
): { item: string; qty: number } | null {
  const total = table.entries.reduce((s, e) => s + e.weight, 0);
  if (total <= 0) return null;
  let r = rng() * total;
  for (const e of table.entries) {
    r -= e.weight;
    if (r <= 0) {
      const min = e.min ?? 1;
      const max = e.max ?? min;
      const qty = min + Math.floor(rng() * (max - min + 1));
      return { item: e.item, qty };
    }
  }
  const last = table.entries[table.entries.length - 1]!;
  return { item: last.item, qty: last.min ?? 1 };
}
