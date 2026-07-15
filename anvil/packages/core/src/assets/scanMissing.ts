import fs from "node:fs";
import path from "node:path";
import yaml from "yaml";
import { AssetPath } from "@anvil/schema";
import type { AssetServer } from "./AssetServer.js";

const PATHISH =
  /["']([a-zA-Z0-9_./-]+\.(?:png|webp|jpe?g|ogg|wav|mp3|mp4|webm))["']/g;

/** Collect required asset paths from content tree + optional manifest. */
export function collectRequiredAssets(
  gameRoot: string,
  contentRoot: string,
  assetsRoot: string,
): string[] {
  const found = new Set<string>();

  const contentDir = path.join(gameRoot, contentRoot);
  if (fs.existsSync(contentDir)) {
    walk(contentDir, (file) => {
      if (!file.endsWith(".json") && !file.endsWith(".yaml") && !file.endsWith(".yml"))
        return;
      const text = fs.readFileSync(file, "utf8");
      let m: RegExpExecArray | null;
      const re = new RegExp(PATHISH.source, "g");
      while ((m = re.exec(text)) !== null) {
        found.add(m[1]!);
      }
    });
  }

  const manifestPath = path.join(gameRoot, assetsRoot, "manifest.yaml");
  if (fs.existsSync(manifestPath)) {
    try {
      const raw = yaml.parse(fs.readFileSync(manifestPath, "utf8")) as {
        required?: unknown;
      };
      if (Array.isArray(raw.required)) {
        for (const p of raw.required) {
          if (typeof p === "string") found.add(p);
        }
      }
    } catch {
      /* ignore parse for collection */
    }
  }

  return [...found].sort();
}

export function listMissingAssets(
  gameRoot: string,
  contentRoot: string,
  assetsRoot: string,
  assets: AssetServer,
): string[] {
  const required = collectRequiredAssets(gameRoot, contentRoot, assetsRoot);
  const missing: string[] = [];
  for (const p of required) {
    const check = AssetPath.safeParse(p);
    if (!check.success) continue;
    assets.requirePath(p);
    if (!assets.has(p)) missing.push(p);
  }
  // also any touched misses
  for (const m of assets.missing()) {
    if (!missing.includes(m)) missing.push(m);
  }
  return missing.sort();
}

function walk(dir: string, fn: (file: string) => void): void {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, fn);
    else fn(p);
  }
}
