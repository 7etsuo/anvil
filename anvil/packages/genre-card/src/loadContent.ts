import fs from "node:fs";
import path from "node:path";
import type { BattleDef, CardDef, EnemyDef } from "./types.js";

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

export function loadCardContent(gameRoot: string, contentRoot = "content"): {
  cards: Record<string, CardDef>;
  enemies: Record<string, EnemyDef>;
  battles: Record<string, BattleDef>;
} {
  const base = path.join(gameRoot, contentRoot);
  return {
    cards: readJsonDir<CardDef>(path.join(base, "cards")),
    enemies: readJsonDir<EnemyDef>(path.join(base, "enemies")),
    battles: readJsonDir<BattleDef>(path.join(base, "battles")),
  };
}
