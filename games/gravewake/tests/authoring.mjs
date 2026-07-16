import assert from "node:assert/strict";
import { QuestSystem, World, procgenRng } from "@anvil/core";
import { GravewakeGame } from "../dist/GravewakeGame.js";
import { loadGravewakeContent } from "../dist/loadContent.js";

const root = new URL("..", import.meta.url).pathname;
const content = loadGravewakeContent(root);
const actorIds = Object.keys(content.actors);

assert.equal(actorIds.length, 18, "all Gravewake actors compile from canonical IR");
assert.ok(actorIds.every((id) => content.authoring.actorPrefabs[id]), "every actor has prefab provenance");
assert.equal(content.actors.wretch.ai, "keep_distance_ranged", "ranged AI inherited from prefab traits");
assert.equal(content.actors.wretch.team, "enemy", "enemy team inherited from prefab traits");
assert.equal(content.actors.gravewarden.team, "player", "player team inherited from prefab traits");
assert.match(content.authoring.sourceHash, /^[0-9a-f]{64}$/);

const quests = new QuestSystem();
const game = new GravewakeGame(
  new World(),
  content.actors,
  content.areas,
  content.progression,
  content.items,
  content.lootTables,
  procgenRng(4),
  { quests },
  content.authoring,
);

let observation = game.observeBlob();
assert.equal(observation.authoring.sourceHash, content.authoring.sourceHash);
assert.equal(observation.declarative.machines.campaign, "lychgate");

game.enterAreaNow("wastes", { x: 280, y: 1200 });
observation = game.observeBlob();
assert.equal(observation.declarative.flags["campaign.entered_wastes"], true);
assert.equal(observation.declarative.machines.campaign, "wastes");
assert.equal(quests.getFlag("entered_wastes"), true, "authored event drives public QuestSystem");

game.enterAreaNow("crypt", { x: 120, y: 450 });
observation = game.observeBlob();
assert.equal(observation.declarative.flags["campaign.entered_dungeon"], true);
assert.equal(observation.declarative.machines.campaign, "dungeon");
assert.equal(quests.getFlag("entered_dungeon"), true);

console.log("authoring: compiled IR, prefab inheritance, triggers, machine, and observations passed");
