import fs from "node:fs";
import path from "node:path";
import type { ActorDef, MapDef } from "./types.js";

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

export function loadTopdownContent(
  gameRoot: string,
  contentRoot = "content",
): {
  actors: Record<string, ActorDef>;
  maps: Record<string, MapDef>;
} {
  const base = path.join(gameRoot, contentRoot);
  return {
    actors: readJsonDir<ActorDef>(path.join(base, "actors")),
    maps: readJsonDir<MapDef>(path.join(base, "maps")),
  };
}
