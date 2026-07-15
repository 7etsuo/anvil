import fs from "node:fs";
import path from "node:path";
import type { EnemyDef, StageDef, WaveDef } from "./types.js";

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

export function loadShmupContent(
  gameRoot: string,
  contentRoot = "content",
): {
  enemies: Record<string, EnemyDef>;
  waves: Record<string, WaveDef>;
  stages: Record<string, StageDef>;
} {
  const base = path.join(gameRoot, contentRoot);
  return {
    enemies: readJsonDir<EnemyDef>(path.join(base, "enemies")),
    waves: readJsonDir<WaveDef>(path.join(base, "waves")),
    stages: readJsonDir<StageDef>(path.join(base, "stages")),
  };
}
