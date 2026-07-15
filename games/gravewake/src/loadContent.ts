import fs from "node:fs";
import path from "node:path";
import type { ItemDef } from "@anvil/core";
import type { ActorDef } from "@anvil/genre-topdown2d";
import type { AreaMapDef, ProgressionDef } from "./types.js";

function readJsonDir<T extends { id: string }>(
  dir: string,
): Record<string, T> {
  const out: Record<string, T> = {};
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    if (!name.endsWith(".json")) continue;
    const raw = JSON.parse(
      fs.readFileSync(path.join(dir, name), "utf8"),
    ) as T;
    out[raw.id] = raw;
  }
  return out;
}

export function loadGravewakeContent(gameRoot: string): {
  actors: Record<string, ActorDef>;
  areas: Record<string, AreaMapDef>;
  progression: ProgressionDef;
  items: Record<string, ItemDef>;
  lootTables: Record<
    string,
    {
      id: string;
      entries: Array<{ item: string; weight: number; min?: number; max?: number }>;
    }
  >;
} {
  const base = path.join(gameRoot, "content");
  const progressionPath = path.join(base, "progression.json");
  const progression = fs.existsSync(progressionPath)
    ? (JSON.parse(fs.readFileSync(progressionPath, "utf8")) as ProgressionDef)
    : {
        xpPerKill: {},
        xpToLevel: [0, 50, 120, 220, 350],
        meleeDamage: 12,
        meleeRange: 72,
        startGold: 25,
        potionHeal: 40,
      };

  return {
    actors: readJsonDir<ActorDef>(path.join(base, "actors")),
    areas: readJsonDir<AreaMapDef>(path.join(base, "areas")),
    progression,
    items: readJsonDir<ItemDef>(path.join(base, "items")),
    lootTables: readJsonDir(path.join(base, "loot")),
  };
}
