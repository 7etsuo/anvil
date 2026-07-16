import { describe, expect, it } from "vitest";
import { World } from "../world/World.js";
import { CharacterSheet } from "./CharacterSheet.js";
import { Inventory } from "./Inventory.js";
import { applyArmor, computeFinalStats, emptyStats } from "./stats.js";
import {
  spawnGoldPile,
  spawnGroundLoot,
  tryPickupNearest,
} from "./Loot.js";
import { ZoneGraph } from "./ZoneGraph.js";
import { canEquipAtLevel, rollItemInstance } from "./itemization.js";
import type { ItemDef } from "./types.js";

const items: Record<string, ItemDef> = {
  gold: { id: "gold", name: "Gold", maxStack: 999999 },
  rusty_sword: {
    id: "rusty_sword",
    name: "Rusty Sword",
    slot: "weapon",
    stats: { damage: 5 },
  },
  iron_plate: {
    id: "iron_plate",
    name: "Iron Plate",
    slot: "chest",
    stats: { armor: 8, maxHp: 15 },
  },
  potion: {
    id: "potion",
    name: "Health Potion",
    maxStack: 20,
  },
};

describe("stats", () => {
  it("stacks gear mods", () => {
    const base = emptyStats({ maxHp: 100, damage: 10, armor: 0, speed: 100, critChance: 0, critMult: 1.5 });
    const fin = computeFinalStats(base, [{ damage: 5 }, { armor: 3, maxHp: 10 }]);
    expect(fin.damage).toBe(15);
    expect(fin.armor).toBe(3);
    expect(fin.maxHp).toBe(110);
  });

  it("armor mitigates", () => {
    expect(applyArmor(100, 100)).toBeLessThan(100);
    expect(applyArmor(10, 0)).toBe(10);
  });
});

describe("Inventory + Equipment + CharacterSheet", () => {
  it("pickup equip changes final damage", () => {
    const sheet = new CharacterSheet({
      itemDefs: items,
      baseStats: emptyStats({
        maxHp: 100,
        damage: 10,
        armor: 0,
        speed: 160,
        critChance: 0,
        critMult: 1.5,
      }),
    });
    expect(sheet.pickup("rusty_sword")).toBe(true);
    const sword = sheet.inventory.findByDef("rusty_sword")!;
    const r = sheet.equip(sword.uid);
    expect(r.ok).toBe(true);
    expect(sheet.finalStats().damage).toBe(15);
    sheet.unequip("weapon");
    expect(sheet.finalStats().damage).toBe(10);
  });

  it("equips the best wearable item for every slot and keeps stable ties", () => {
    const defs: Record<string, ItemDef> = {
      weak: {
        id: "weak",
        name: "Weak Sword",
        slot: "weapon",
        stats: { damage: 2 },
      },
      strong: {
        id: "strong",
        name: "Strong Sword",
        slot: "weapon",
        stats: { damage: 9 },
      },
      future: {
        id: "future",
        name: "Future Sword",
        slot: "weapon",
        stats: { damage: 99 },
      },
      mail: {
        id: "mail",
        name: "Mail",
        slot: "chest",
        stats: { armor: 8, maxHp: 12 },
      },
    };
    const sheet = new CharacterSheet({ level: 5, itemDefs: defs });
    expect(sheet.pickup("weak")).toBe(true);
    expect(sheet.pickup("strong")).toBe(true);
    expect(
      sheet.pickup("future", 1, { itemLevel: 10, reqLevel: 10 }),
    ).toBe(true);
    expect(sheet.pickup("mail")).toBe(true);
    expect(sheet.equip(sheet.inventory.findByDef("weak")!.uid).ok).toBe(true);

    const result = sheet.equipBest();
    expect(result.changes.map((change) => change.slot).sort()).toEqual([
      "chest",
      "weapon",
    ]);
    expect(sheet.inventory.get(sheet.equipment.get("weapon")!)?.defId).toBe(
      "strong",
    );
    expect(sheet.inventory.get(sheet.equipment.get("chest")!)?.defId).toBe(
      "mail",
    );
    expect(
      result.changes.some((change) => change.defId === "future"),
    ).toBe(false);
    expect(sheet.equipBest().changes).toEqual([]);
  });

  it("stacks potions", () => {
    const inv = new Inventory(10);
    inv.add("potion", 5, { maxStack: 20 });
    inv.add("potion", 3, { maxStack: 20 });
    expect(inv.count()).toBe(1);
    expect(inv.findByDef("potion")!.qty).toBe(8);
  });

  it("scales gear by item level and gates equip by reqLevel", () => {
    const def = {
      id: "mail",
      name: "Mail",
      slot: "chest" as const,
      rarity: "magic" as const,
      stats: { armor: 6, maxHp: 20 },
      itemLevel: 1,
    };
    // fixedQuality 1 = mid roll (no variance noise)
    const l1 = rollItemInstance(def, 1, { fixedQuality: 1 });
    const l10 = rollItemInstance(def, 10, { fixedQuality: 1 });
    expect(l1.reqLevel).toBe(1);
    expect(l10.reqLevel).toBe(10);
    // L10 armor ≈ 6 * (1 + 0.12*9) * slot * rarity > L1
    expect((l10.rolledStats.armor ?? 0) > (l1.rolledStats.armor ?? 0)).toBe(true);
    expect((l10.minStats.armor ?? 0) <= (l10.rolledStats.armor ?? 0)).toBe(true);
    expect((l10.maxStats.armor ?? 0) >= (l10.rolledStats.armor ?? 0)).toBe(true);
    expect(canEquipAtLevel(5, l10)).toBe(false);
    expect(canEquipAtLevel(10, l10)).toBe(true);
    expect(canEquipAtLevel(12, l10)).toBe(true);

    const sheet = new CharacterSheet({
      level: 5,
      baseStats: {
        maxHp: 100,
        damage: 10,
        armor: 0,
        speed: 160,
        critChance: 0.05,
        critMult: 1.5,
      },
      itemDefs: { mail: def },
    });
    sheet.inventory.add("mail", 1, {
      rolledStats: l10.rolledStats,
      itemLevel: 10,
      reqLevel: 10,
    });
    const uid = sheet.inventory.findByDef("mail")!.uid;
    const r = sheet.equip(uid);
    expect(r.ok).toBe(false);
    expect(r.error).toBe("level_req");
    sheet.level = 10;
    expect(sheet.equip(uid).ok).toBe(true);
    // level 11 still ok
    sheet.level = 11;
    expect(sheet.equip(uid).ok).toBe(true);
  });

  it("statBreakdown separates base and gear", () => {
    const sheet = new CharacterSheet({
      baseStats: {
        maxHp: 100,
        damage: 10,
        armor: 2,
        speed: 160,
        critChance: 0.05,
        critMult: 1.5,
      },
      itemDefs: {
        sword: {
          id: "sword",
          name: "Sword",
          slot: "weapon",
          stats: { damage: 5 },
        },
      },
    });
    sheet.pickup("sword");
    sheet.equip(sheet.inventory.findByDef("sword")!.uid);
    const b = sheet.statBreakdown();
    expect(b.base.damage).toBe(10);
    expect(b.gear.damage).toBe(5);
    expect(b.final.damage).toBe(15);
    expect(b.bySlot[0]?.defId).toBe("sword");
  });

  it("reports level-relative XP progress from cumulative thresholds", () => {
    const sheet = new CharacterSheet({ level: 1, xp: 0 });
    const table = [0, 40, 100, 180];

    expect(sheet.xpProgress(table)).toEqual({
      current: 0,
      next: 40,
      earned: 0,
      needed: 40,
      ratio: 0,
      atMaxLevel: false,
    });

    sheet.level = 2;
    sheet.xp = 70;
    expect(sheet.xpProgress(table)).toMatchObject({
      current: 40,
      next: 100,
      earned: 30,
      needed: 60,
      ratio: 0.5,
      atMaxLevel: false,
    });

    sheet.level = table.length;
    sheet.xp = 220;
    expect(sheet.xpProgress(table)).toMatchObject({
      current: 180,
      next: null,
      needed: 0,
      ratio: 1,
      atMaxLevel: true,
    });
  });

  it("extrapolates an explicit level curve beyond its authored table", () => {
    const sheet = new CharacterSheet({ level: 14, xp: 3600 });
    const curve = {
      thresholds: [
        0, 40, 100, 180, 280, 400, 550, 750, 1000, 1300, 1700, 2200,
        2800, 3600, 4500,
      ],
      growth: 1.12,
      maxLevel: 100,
    };

    const gain = sheet.addXpDetailed(3500, curve);
    expect(gain.beforeLevel).toBe(14);
    expect(gain.afterLevel).toBeGreaterThan(15);
    expect(gain.levelsGained).toBe(gain.afterLevel - 14);
    expect(sheet.xpProgress(curve)).toMatchObject({ atMaxLevel: false });
  });

  it("honors an explicit maximum level after extrapolation", () => {
    const sheet = new CharacterSheet({ level: 2, xp: 40 });
    const curve = { thresholds: [0, 40], growth: 1.1, maxLevel: 4 };
    sheet.addXp(10000, curve);
    expect(sheet.level).toBe(4);
    expect(sheet.xpProgress(curve)).toMatchObject({
      next: null,
      atMaxLevel: true,
    });
  });

  it("equippedVisuals returns paper-doll layers from gear", () => {
    const sheet = new CharacterSheet({
      itemDefs: {
        rusty_sword: {
          id: "rusty_sword",
          name: "Rusty Sword",
          slot: "weapon",
          stats: { damage: 5 },
          visual: { sprite: "gear/rusty_sword.png", z: 40 },
        },
        iron_helm: {
          id: "iron_helm",
          name: "Iron Helm",
          slot: "head",
          stats: { armor: 2 },
          visual: { sprite: "gear/iron_helm.png", oy: -0.3, z: 30 },
        },
      },
    });
    sheet.pickup("rusty_sword");
    sheet.pickup("iron_helm");
    sheet.equip(sheet.inventory.findByDef("rusty_sword")!.uid);
    sheet.equip(sheet.inventory.findByDef("iron_helm")!.uid);
    const layers = sheet.equippedVisuals();
    expect(layers.map((l) => l.defId)).toEqual(["iron_helm", "rusty_sword"]);
    expect(layers[0]!.sprite).toBe("gear/iron_helm.png");
    expect(layers[1]!.z).toBe(40);
  });

  it("full inventory rejects", () => {
    const inv = new Inventory(1);
    expect(inv.add("rusty_sword")).not.toBeNull();
    expect(inv.add("iron_plate")).toBeNull();
  });

  it("keeps equipped gear out of bag capacity and exposes a paper-doll view", () => {
    const sheet = new CharacterSheet({ itemDefs: items, inventoryCapacity: 1 });
    expect(sheet.pickup("rusty_sword")).toBe(true);
    const sword = sheet.inventory.findByDef("rusty_sword")!;
    expect(sheet.equip(sword.uid).ok).toBe(true);

    // The equipped weapon no longer occupies the single backpack cell.
    expect(sheet.inventory.usedSlots()).toBe(0);
    expect(sheet.pickup("iron_plate")).toBe(true);
    expect(sheet.pickup("potion")).toBe(false);

    const view = sheet.inventoryView();
    expect(view).toMatchObject({ capacity: 1, used: 1, free: 0 });
    expect(view.equipment.weapon?.defId).toBe("rusty_sword");
    expect(view.bag[0]?.defId).toBe("iron_plate");
    expect(view.equipment.head).toBeNull();

    // Unequip is blocked until the full bag has room.
    expect(sheet.unequip("weapon")).toBeNull();
    expect(sheet.equipment.get("weapon")).toBe(sword.uid);
    sheet.inventory.remove(view.bag[0]!.uid);
    expect(sheet.unequip("weapon")).toBe(sword.uid);
    expect(sheet.inventory.usedSlots()).toBe(1);
  });

  it("serialize round-trip", () => {
    const sheet = new CharacterSheet({ itemDefs: items });
    sheet.pickup("rusty_sword");
    sheet.equip(sheet.inventory.findByDef("rusty_sword")!.uid);
    sheet.addGold(50);
    const blob = sheet.toJSON();
    const sheet2 = new CharacterSheet({ itemDefs: items });
    sheet2.loadJSON(blob);
    expect(sheet2.gold).toBe(50);
    expect(sheet2.finalStats().damage).toBe(sheet.finalStats().damage);
    expect(sheet2.equipment.get("weapon")).toBeTruthy();
  });
});

describe("ground loot", () => {
  it("spawns and picks up", () => {
    const world = new World();
    const sheet = new CharacterSheet({ itemDefs: items });
    spawnGroundLoot(world, 10, 10, { defId: "rusty_sword", qty: 1 });
    spawnGoldPile(world, 11, 10, 25);
    const id1 = tryPickupNearest(world, 10, 10, 5, sheet);
    expect(id1).toBeTruthy();
    expect(sheet.inventory.findByDef("rusty_sword")).toBeTruthy();
    const id2 = tryPickupNearest(world, 11, 10, 5, sheet);
    expect(id2).toBeTruthy();
    expect(sheet.gold).toBe(25);
  });
});

describe("ZoneGraph", () => {
  const graph = () =>
    new ZoneGraph({
      start: "town",
      nodes: [
        {
          id: "town",
          mapId: "town_map",
          exits: { east: "dungeon" },
        },
        {
          id: "dungeon",
          mapId: "d1",
          exits: { west: "town", east: "boss" },
          requireClear: ["east"],
        },
        {
          id: "boss",
          mapId: "boss_map",
          exits: { west: "dungeon" },
        },
      ],
    });

  it("travels and blocks requireClear", () => {
    const z = graph();
    expect(z.travel("east").ok).toBe(true);
    expect(z.state.current).toBe("dungeon");
    expect(z.travel("east").ok).toBe(false);
    expect(z.travel("east").error).toBe("require_clear");
    z.markCleared();
    expect(z.travel("east").ok).toBe(true);
    expect(z.state.current).toBe("boss");
  });

  it("round-trips state", () => {
    const z = graph();
    z.travel("east");
    z.markCleared("dungeon");
    const blob = z.toJSON();
    const z2 = graph();
    z2.loadJSON(blob);
    expect(z2.state.current).toBe("dungeon");
    expect(z2.isCleared("dungeon")).toBe(true);
  });
});
