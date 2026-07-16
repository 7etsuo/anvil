import assert from "node:assert/strict";
import fs from "node:fs";
import { CharacterSheet } from "@anvil/core";

const root = new URL("..", import.meta.url);
const progression = JSON.parse(
  fs.readFileSync(new URL("content/progression.json", root), "utf8"),
);
const curve = {
  thresholds: progression.xpToLevel,
  growth: progression.xpCurve.growth,
  maxLevel: progression.xpCurve.maxLevel,
};

// Regression: a bare 15-entry table used to silently cap Gravewake at 15.
const legacy = new CharacterSheet({ level: 1, xp: 0 });
legacy.addXp(1_000_000_000, progression.xpToLevel);
assert.equal(legacy.level, 15);

const sheet = new CharacterSheet({ level: 1, xp: 0 });
const first = sheet.addXpDetailed(7_100, curve);
assert.ok(first.afterLevel > 15, "configured curve must progress beyond level 15");
assert.equal(first.levelsGained, first.afterLevel - 1);
assert.equal(sheet.xpProgress(curve).atMaxLevel, false);

sheet.addXp(1_000_000_000, curve);
assert.equal(sheet.level, 100, "configured max level must be reachable");
assert.deepEqual(sheet.xpProgress(curve), {
  current: sheet.xpProgress(curve).current,
  next: null,
  earned: sheet.xp - sheet.xpProgress(curve).current,
  needed: 0,
  ratio: 1,
  atMaxLevel: true,
});

console.log("progression: level 15 regression fixed; configured level 100 cap reached");
