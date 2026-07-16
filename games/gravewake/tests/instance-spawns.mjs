import assert from "node:assert/strict";
import { World, procgenRng } from "@anvil/core";
import { NavGrid } from "@anvil/genre-topdown2d";
import { GravewakeGame } from "../dist/GravewakeGame.js";
import { loadGravewakeContent } from "../dist/loadContent.js";

const content = loadGravewakeContent(new URL("..", import.meta.url).pathname);
const game = new GravewakeGame(
  new World(),
  content.actors,
  content.areas,
  content.progression,
  content.items,
  content.lootTables,
  procgenRng(1),
  {},
);

const instanceEntries = [
  ["wastes", 280, 1200],
  ["crypt", 120, 450],
  ["catacombs", 140, 500],
  ["bonekeep", 160, 500],
];

for (const [areaId, x, y] of instanceEntries) {
  for (let generation = 1; generation <= 25; generation++) {
    // Exercise the same authored destination consumed by portals. TypeScript
    // privacy is compile-time only; this black-box regression targets built JS.
    game.enterAreaNow(areaId, { x, y });
    const sim = game.getSim();
    const area = game.getLiveArea();
    const player = sim?.getPlayerPos();
    assert.ok(sim && area && player, `${areaId}: missing live sim/player`);
    const nav = new NavGrid(area.width, area.height, area.walls, 28, 14);

    assert.equal(
      nav.isWorldBlocked(player.x, player.y),
      false,
      `${areaId} generation ${generation}: player spawned inside collision`,
    );
    for (const portal of area.portals ?? []) {
      const px = portal.x + portal.w / 2;
      const py = portal.y + portal.h / 2;
      assert.equal(
        nav.isWorldBlocked(px, py),
        false,
        `${areaId} generation ${generation}: portal blocked`,
      );
      assert.ok(
        nav.findPath(player.x, player.y, px, py).length > 0,
        `${areaId} generation ${generation}: portal unreachable`,
      );
    }
    const entities = sim.observeBlob().entities;
    for (const enemy of entities.filter((entity) => entity.team === "enemy")) {
      assert.ok(
        nav.findPath(player.x, player.y, enemy.x, enemy.y).length > 0,
        `${areaId} generation ${generation}: enemy ${enemy.actorId} unreachable`,
      );
    }
  }
}

console.log("map connectivity: 25 generations × 4 Gravewake areas passed");
