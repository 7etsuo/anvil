import { Equipment, type ItemDefLookup } from "./Equipment.js";
import { Inventory } from "./Inventory.js";
import { rollItemInstance } from "./itemization.js";
import { addStats, computeFinalStats, emptyStats } from "./stats.js";
import type {
  CharacterSaveBlob,
  EquipSlot,
  EquippedVisualLayer,
  ItemDef,
  Stats,
} from "./types.js";

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

  addXp(amount: number, xpTable: number[]): boolean {
    this.xp += amount;
    let leveled = false;
    while (
      this.level < xpTable.length &&
      this.xp >= xpTable[this.level]!
    ) {
      this.level += 1;
      this.baseStats.maxHp += 8;
      this.baseStats.damage += 1;
      leveled = true;
    }
    return leveled;
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
    return this.equipment.unequip(slot);
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
    this.equipment.loadJSON(data.equipped ?? {});
  }
}
