import { Equipment, type ItemDefLookup } from "./Equipment.js";
import { Inventory } from "./Inventory.js";
import { computeFinalStats, emptyStats } from "./stats.js";
import type {
  CharacterSaveBlob,
  ItemDef,
  Stats,
} from "./types.js";

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
      data?: Record<string, unknown>;
    },
  ): boolean {
    const def = this.defs[defId];
    const stack = this.inventory.add(defId, qty, {
      maxStack: def?.maxStack ?? 1,
      rolledStats: opts?.rolledStats,
      data: opts?.data,
    });
    return stack !== null;
  }

  equip(uid: string) {
    return this.equipment.equipAuto(uid, this.inventory, this.lookup);
  }

  unequip(slot: import("./types.js").EquipSlot) {
    return this.equipment.unequip(slot);
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
