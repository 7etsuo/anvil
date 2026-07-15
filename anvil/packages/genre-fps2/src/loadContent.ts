import fs from "node:fs";
import path from "node:path";
import type { Fps2LevelDef, Fps2MapDef } from "./types.js";

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

export function loadFps2Content(
  gameRoot: string,
  contentRoot = "content",
): {
  maps: Record<string, Fps2MapDef>;
  levels: Record<string, Fps2LevelDef>;
} {
  const base = path.join(gameRoot, contentRoot);
  return {
    maps: readJsonDir<Fps2MapDef>(path.join(base, "maps")),
    levels: readJsonDir<Fps2LevelDef>(path.join(base, "levels")),
  };
}
