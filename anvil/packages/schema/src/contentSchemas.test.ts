import { describe, expect, it } from "vitest";
import {
  Fps2MapDefSchema,
  ItemDefSchema,
  LootTableSchema,
  QuestDefSchema,
  schemaForContentPath,
} from "./contentSchemas.js";

describe("content schemas", () => {
  it("accepts valid item", () => {
    const r = ItemDefSchema.safeParse({
      id: "rusty_sword",
      name: "Rusty Sword",
      slot: "weapon",
      stats: { damage: 5 },
    });
    expect(r.success).toBe(true);
  });

  it("rejects loot max < min", () => {
    const r = LootTableSchema.safeParse({
      id: "t1",
      entries: [{ item: "a", weight: 1, min: 5, max: 1 }],
    });
    expect(r.success).toBe(false);
  });

  it("accepts rectangular FPS2 grid maps and rejects ragged rows", () => {
    const map = {
      id: "corridor",
      cells: [
        [1, 1, 1],
        [1, 0, 1],
      ],
      playerStart: { x: 1.5, y: 1.5, angle: 0 },
      enemies: [{ id: "grunt", x: 2, y: 1, hp: 2 }],
    };
    expect(Fps2MapDefSchema.safeParse(map).success).toBe(true);
    expect(
      Fps2MapDefSchema.safeParse({ ...map, cells: [[1, 1], [1]] }).success,
    ).toBe(false);
  });

  it("routes paths to schemas", () => {
    expect(schemaForContentPath("items/foo.json")).toBe(ItemDefSchema);
    expect(schemaForContentPath("loot/bar.json")).toBe(LootTableSchema);
    expect(schemaForContentPath("quests/q.json")).toBe(QuestDefSchema);
    expect(schemaForContentPath("random/x.json")).toBeNull();
  });
});
