/**
 * Bundled sprite library discovery (parallel to AudioCatalog).
 */

import fs from "node:fs";
import path from "node:path";

/** Avoid `node:url` — breaks browser bundles. */
function moduleDirname(): string | null {
  try {
    const u = import.meta.url;
    if (typeof u !== "string" || u.startsWith("http:") || u.startsWith("https:")) {
      return null;
    }
    const raw = u.startsWith("file:") ? u.slice("file://".length) : u;
    const noQuery = raw.split("?")[0] ?? raw;
    return noQuery.replace(/[/\\][^/\\]*$/, "") || null;
  } catch {
    return null;
  }
}

const IMG_EXT = /\.(png|webp|jpe?g|gif)$/i;

export type BundledSpriteEntry = {
  id: string;
  path: string;
  ext: string;
  bytes: number;
  tags: string[];
};

export type BundledSpriteCatalog = {
  version: number;
  generatedAt: string;
  root: string;
  description: string;
  counts: { total: number; byFolder: Record<string, number> };
  entries: BundledSpriteEntry[];
};

let cached: BundledSpriteCatalog | null = null;
let cachedRoot: string | null = null;

export function resolveBundledSpriteRoot(explicit?: string): string | null {
  if (explicit) {
    const p = path.resolve(explicit);
    return fs.existsSync(p) ? p : null;
  }
  try {
    if (typeof process !== "undefined" && process.env?.ANVIL_SPRITES_ROOT) {
      const p = path.resolve(process.env.ANVIL_SPRITES_ROOT);
      if (fs.existsSync(p)) return p;
    }
  } catch {
    /* browser */
  }
  const candidates: string[] = [];
  const here = moduleDirname();
  if (here) {
    candidates.push(
      path.resolve(here, "../../../../assets/sprites"),
      path.resolve(here, "../../../../../assets/sprites"),
    );
  }
  try {
    const cwd = typeof process !== "undefined" && process.cwd ? process.cwd() : "";
    if (cwd) {
      candidates.push(
        path.resolve(cwd, "assets/sprites"),
        path.resolve(cwd, "anvil/assets/sprites"),
      );
    }
  } catch {
    /* browser */
  }
  for (const c of candidates) {
    if (fs.existsSync(c) && fs.statSync(c).isDirectory()) return c;
  }
  return null;
}

function walk(dir: string, acc: string[] = []): string[] {
  if (!fs.existsSync(dir)) return acc;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name.startsWith(".")) continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(full, acc);
    else if (IMG_EXT.test(ent.name)) acc.push(full);
  }
  return acc;
}

export function buildSpriteCatalogFromDisk(root: string): BundledSpriteCatalog {
  const files = walk(root).sort();
  const entries: BundledSpriteEntry[] = files.map((full) => {
    const rel = path.relative(root, full).split(path.sep).join("/");
    const st = fs.statSync(full);
    const tags = rel.split("/").slice(0, -1).map((t) => t.toLowerCase());
    return {
      id: rel.replace(/\.[^.]+$/, "").replace(/\//g, "."),
      path: rel,
      ext: path.extname(rel).slice(1).toLowerCase(),
      bytes: st.size,
      tags,
    };
  });
  const byFolder: Record<string, number> = {};
  for (const e of entries) {
    const folder = path.dirname(e.path);
    byFolder[folder] = (byFolder[folder] || 0) + 1;
  }
  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    root: "anvil/assets/sprites",
    description: "Bundled CC0 sprites for agents (optional).",
    counts: { total: entries.length, byFolder },
    entries,
  };
}

export function loadBundledSpriteCatalog(
  root?: string,
): BundledSpriteCatalog | null {
  const r = resolveBundledSpriteRoot(root);
  if (!r) return null;
  if (cached && cachedRoot === r) return cached;
  const catalogPath = path.join(r, "catalog.json");
  if (fs.existsSync(catalogPath)) {
    try {
      cached = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
      cachedRoot = r;
      return cached;
    } catch {
      /* rebuild */
    }
  }
  cached = buildSpriteCatalogFromDisk(r);
  cachedRoot = r;
  return cached;
}

export function writeBundledSpriteCatalog(root?: string): string | null {
  const r = resolveBundledSpriteRoot(root);
  if (!r) return null;
  const cat = buildSpriteCatalogFromDisk(r);
  const out = path.join(r, "catalog.json");
  fs.writeFileSync(out, JSON.stringify(cat, null, 2) + "\n");
  cached = cat;
  cachedRoot = r;
  return out;
}

export function listBundledSprites(
  filter: { prefix?: string; query?: string; limit?: number } = {},
  root?: string,
): BundledSpriteEntry[] {
  const cat = loadBundledSpriteCatalog(root);
  if (!cat) return [];
  let list = cat.entries;
  if (filter.prefix) {
    const p = filter.prefix.replace(/\/+$/, "");
    list = list.filter((e) => e.path === p || e.path.startsWith(p + "/"));
  }
  if (filter.query) {
    const q = filter.query.toLowerCase();
    list = list.filter(
      (e) =>
        e.path.toLowerCase().includes(q) || e.id.toLowerCase().includes(q),
    );
  }
  if (filter.limit != null) list = list.slice(0, filter.limit);
  return list;
}

export function clearBundledSpriteCatalogCache(): void {
  cached = null;
  cachedRoot = null;
}
