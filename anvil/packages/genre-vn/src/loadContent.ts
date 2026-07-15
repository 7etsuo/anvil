import fs from "node:fs";
import path from "node:path";
import type { VnScript } from "./types.js";

export function loadVnContent(
  gameRoot: string,
  contentRoot = "content",
): Record<string, VnScript> {
  const dir = path.join(gameRoot, contentRoot, "scripts");
  const out: Record<string, VnScript> = {};
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    if (!name.endsWith(".json")) continue;
    const raw = JSON.parse(
      fs.readFileSync(path.join(dir, name), "utf8"),
    ) as VnScript;
    const id = raw.id ?? name.replace(/\.json$/, "");
    out[id] = { ...raw, id };
  }
  return out;
}
