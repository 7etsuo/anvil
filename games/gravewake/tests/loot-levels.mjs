import assert from "node:assert/strict";
import { World, procgenRng } from "@anvil/core";
import { GravewakeGame } from "../dist/GravewakeGame.js";
import { loadGravewakeContent } from "../dist/loadContent.js";

const content = loadGravewakeContent(new URL("..", import.meta.url).pathname);
const world = new World();
const game = new GravewakeGame(
  world,
  content.actors,
  content.areas,
  content.progression,
  content.items,
  content.lootTables,
  procgenRng(17),
  {},
  content.authoring,
);

// Reproduce the old worst case: a level-1 hero receiving boss-table drops in
// the highest-threat authored zone. Threat must not become an equip-level gate.
game.enterAreaNow("bonekeep", { x: 160, y: 500 });
for (let i = 0; i < 120; i++) game.dropLoot(300, 300, "bone_tyrant");

const gear = world
  .all()
  .filter((entity) => entity.tags.includes("loot"))
  .map((entity) => entity.data.loot)
  .filter((loot) => {
    if (!loot || typeof loot !== "object") return false;
    const defId = loot.defId;
    return typeof defId === "string" && Boolean(content.items[defId]?.slot);
  });

assert.ok(gear.length > 20, "deterministic boss sample produced enough gear");
for (const loot of gear) {
  assert.ok(Number(loot.reqLevel) <= 1, `${loot.defId} req ${loot.reqLevel} exceeds hero level 1`);
  assert.ok(Number(loot.itemLevel) <= 2, `${loot.defId} item level ${loot.itemLevel} exceeds +1 power lead`);
}

console.log(`loot: ${gear.length} high-threat gear drops were immediately wearable`);
