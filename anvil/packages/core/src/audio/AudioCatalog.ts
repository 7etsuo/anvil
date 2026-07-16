import fs from "node:fs";
import path from "node:path";
import type { AudioCues } from "./AudioSystem.js";

/** Avoid `node:url` — it breaks browser bundles (Vite/Phaser hosts). */
function moduleDirname(): string | null {
  try {
    const u = import.meta.url;
    if (typeof u !== "string" || u.startsWith("http:") || u.startsWith("https:")) {
      return null;
    }
    // file:///path or /path
    const raw = u.startsWith("file:") ? u.slice("file://".length) : u;
    const noQuery = raw.split("?")[0] ?? raw;
    const dir = noQuery.replace(/[/\\][^/\\]*$/, "");
    return dir || null;
  } catch {
    return null;
  }
}

const AUDIO_EXT = /\.(ogg|wav|mp3)$/i;

export type BundledAudioKind = "music" | "sfx" | "jingle";
export type BundledAudioChannel = "music" | "sfx" | "ui";

export type BundledAudioEntry = {
  id: string;
  /** Path relative to the bundled audio root (e.g. sfx/ui/click_001.ogg) */
  path: string;
  kind: BundledAudioKind;
  channel: BundledAudioChannel;
  ext: string;
  bytes: number;
  tags: string[];
};

export type BundledAudioCatalog = {
  version: number;
  generatedAt: string;
  license: string;
  root: string;
  description: string;
  counts: {
    total: number;
    music: number;
    sfx: number;
    jingles: number;
    byFolder: Record<string, number>;
  };
  suggestedCues: Record<string, string>;
  entries: BundledAudioEntry[];
};

export type ListBundledAudioFilter = {
  kind?: BundledAudioKind;
  channel?: BundledAudioChannel;
  /** Path prefix, e.g. "sfx/ui" or "music" */
  prefix?: string;
  /** Tag must be present (case-insensitive match against entry.tags) */
  tag?: string;
  /** Substring match on path or id */
  query?: string;
  limit?: number;
};

let cachedCatalog: BundledAudioCatalog | null = null;
let cachedRoot: string | null = null;

/**
 * Resolve the monorepo bundled audio directory (`anvil/assets/audio`).
 * Tries: explicit arg → env ANVIL_AUDIO_ROOT → walk up from this module → cwd.
 */
export function resolveBundledAudioRoot(explicit?: string): string | null {
  if (explicit) {
    const p = path.resolve(explicit);
    return fs.existsSync(p) ? p : null;
  }
  try {
    if (typeof process !== "undefined" && process.env?.ANVIL_AUDIO_ROOT) {
      const p = path.resolve(process.env.ANVIL_AUDIO_ROOT);
      if (fs.existsSync(p)) return p;
    }
  } catch {
    /* browser */
  }

  const candidates: string[] = [];
  const here = moduleDirname();
  if (here) {
    // dist/audio or src/audio → packages/core → packages → anvil → assets/audio
    candidates.push(
      path.resolve(here, "../../../../assets/audio"),
      path.resolve(here, "../../../../../assets/audio"),
    );
  }
  try {
    const cwd = typeof process !== "undefined" && process.cwd ? process.cwd() : "";
    if (cwd) {
      candidates.push(
        path.resolve(cwd, "assets/audio"),
        path.resolve(cwd, "anvil/assets/audio"),
        path.resolve(cwd, "../anvil/assets/audio"),
        path.resolve(cwd, "../../anvil/assets/audio"),
      );
    }
  } catch {
    /* browser */
  }

  for (const c of candidates) {
    if (fs.existsSync(path.join(c, "catalog.json")) || fs.existsSync(c)) {
      if (fs.existsSync(c) && fs.statSync(c).isDirectory()) {
        // Prefer a dir that actually has music or sfx
        if (
          fs.existsSync(path.join(c, "catalog.json")) ||
          fs.existsSync(path.join(c, "music")) ||
          fs.existsSync(path.join(c, "sfx"))
        ) {
          return c;
        }
      }
    }
  }
  return null;
}

function walkAudioFiles(dir: string, acc: string[] = []): string[] {
  if (!fs.existsSync(dir)) return acc;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name.startsWith(".")) continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walkAudioFiles(full, acc);
    else if (AUDIO_EXT.test(ent.name)) acc.push(full);
  }
  return acc;
}

function tagsFromPath(rel: string): string[] {
  const tags = new Set<string>();
  const parts = rel.split("/");
  for (const p of parts.slice(0, -1)) tags.add(p.toLowerCase());
  const base = path.basename(rel, path.extname(rel)).toLowerCase();
  const keys = [
    "hit",
    "click",
    "select",
    "door",
    "swing",
    "magic",
    "spell",
    "explosion",
    "jump",
    "pickup",
    "metal",
    "wood",
    "ui",
    "combat",
    "inventory",
    "confirm",
    "error",
    "open",
    "close",
    "toggle",
    "scroll",
    "key",
    "unsheathe",
    "armor",
    "cloth",
    "chiptune",
    "town",
    "battle",
    "dungeon",
    "rpg",
    "peaceful",
    "calm",
    "ambient",
    "lullaby",
    "sadness",
    "stars",
    "dreams",
    "zen",
    "relax",
  ];
  for (const key of keys) {
    if (base.includes(key) || rel.toLowerCase().includes(key)) tags.add(key);
  }
  // Heuristic zen tags for known calm filenames
  if (
    /peaceful|lullaby|field_of_dreams|observing|among_the_stars|mysterious_ambient|mercury|map_theme|sadness|town_/.test(
      base,
    )
  ) {
    tags.add("calm");
    tags.add("zen");
  }
  return [...tags];
}

function kindOf(rel: string): BundledAudioKind {
  if (rel.startsWith("music/")) return "music";
  if (rel.startsWith("jingles/")) return "jingle";
  return "sfx";
}

function channelOf(rel: string): BundledAudioChannel {
  if (rel.startsWith("music/") || rel.startsWith("jingles/")) return "music";
  if (rel.includes("/ui/")) return "ui";
  return "sfx";
}

const DEFAULT_SUGGESTED: Record<string, string> = {
  ui_click: "sfx/ui/click_001.ogg",
  ui_confirm: "sfx/ui/confirmation_001.ogg",
  ui_back: "sfx/ui/back_001.ogg",
  ui_error: "sfx/ui/error_001.ogg",
  ui_open: "sfx/ui/open_001.ogg",
  ui_close: "sfx/ui/close_001.ogg",
  ui_select: "sfx/ui/select_001.ogg",
  ui_toggle: "sfx/ui/toggle_001.ogg",
  hit: "sfx/combat/hit_01.ogg",
  hit_alt: "sfx/combat/hit_02.ogg",
  swing: "sfx/combat/rpg_battle_swing.wav",
  swing_alt: "sfx/combat/rpg_battle_swing2.wav",
  spell: "sfx/combat/rpg_battle_spell.wav",
  magic: "sfx/combat/rpg_battle_magic1.wav",
  explosion: "sfx/combat/explosion.ogg",
  unsheathe: "sfx/combat/rpg_battle_sword-unsheathe.wav",
  door_open: "sfx/world/door_open.ogg",
  door_close: "sfx/world/door_close_01.ogg",
  key: "sfx/world/key_open_01.ogg",
  pickup: "sfx/inventory/rpg_inventory_bubble.wav",
  equip_armor: "sfx/inventory/rpg_inventory_armor-light.wav",
  equip_metal: "sfx/inventory/rpg_inventory_metal-small1.wav",
  equip_cloth: "sfx/inventory/rpg_inventory_cloth.wav",
  metal_hit: "sfx/metal/metal_hit_01.ogg",
  wood_hit: "sfx/wood/wood_hit_01.ogg",
  music_town: "music/town_theme.mp3",
  music_town_alt: "music/town_new.mp3",
  music_battle: "music/battle_theme_a.mp3",
  music_dungeon: "music/dungeon_ambience.ogg",
  music_title_chip: "music/chiptune_title.mp3",
  music_level1_chip: "music/chiptune_level1.mp3",
  music_level2_chip: "music/chiptune_level2.mp3",
  music_level3_chip: "music/chiptune_level3.mp3",
  music_ending_chip: "music/chiptune_ending.mp3",
  music_action: "music/great_mission.mp3",
  music_tense: "music/doomed.mp3",
  music_dark: "music/waking_the_devil.mp3",
  music_space: "music/spacetime.mp3",
  music_warped: "music/warped.mp3",
  // Calm / zen / hub (CC0)
  music_peaceful: "music/peaceful_theme.ogg",
  music_zen: "music/lullaby.mp3",
  music_calm: "music/field_of_dreams.mp3",
  music_ambient: "music/mysterious_ambient.mp3",
  music_stars: "music/observing_the_star.ogg",
  music_stars_alt: "music/among_the_stars.ogg",
  music_melancholy: "music/sadness.ogg",
  music_map: "music/map_theme.ogg",
  music_soft: "music/mercury_calm.ogg",
  // Prefer peaceful for hubs when agents pick "relax"
  music_hub: "music/peaceful_theme.ogg",
  music_hub_alt: "music/field_of_dreams.mp3",
};

/**
 * Build a catalog by scanning the audio directory (or load catalog.json if present).
 */
export function loadBundledAudioCatalog(
  audioRoot?: string,
): BundledAudioCatalog | null {
  const root = resolveBundledAudioRoot(audioRoot);
  if (!root) return null;

  if (cachedCatalog && cachedRoot === root) return cachedCatalog;

  const catalogPath = path.join(root, "catalog.json");
  if (fs.existsSync(catalogPath)) {
    try {
      const raw = JSON.parse(
        fs.readFileSync(catalogPath, "utf8"),
      ) as BundledAudioCatalog;
      if (raw?.entries?.length) {
        cachedCatalog = raw;
        cachedRoot = root;
        return raw;
      }
    } catch {
      /* rebuild */
    }
  }

  const built = buildCatalogFromDisk(root);
  cachedCatalog = built;
  cachedRoot = root;
  return built;
}

export function buildCatalogFromDisk(root: string): BundledAudioCatalog {
  const files = walkAudioFiles(root).sort();
  const entries: BundledAudioEntry[] = files.map((full) => {
    const rel = path.relative(root, full).split(path.sep).join("/");
    const st = fs.statSync(full);
    return {
      id: rel.replace(/\.[^.]+$/, "").replace(/\//g, "."),
      path: rel,
      kind: kindOf(rel),
      channel: channelOf(rel),
      ext: path.extname(rel).slice(1).toLowerCase(),
      bytes: st.size,
      tags: tagsFromPath(rel),
    };
  });

  const byFolder: Record<string, number> = {};
  for (const e of entries) {
    const folder = path.dirname(e.path);
    byFolder[folder] = (byFolder[folder] || 0) + 1;
  }

  const suggestedCues: Record<string, string> = {};
  for (const [k, p] of Object.entries(DEFAULT_SUGGESTED)) {
    if (fs.existsSync(path.join(root, p))) suggestedCues[k] = p;
  }

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    license: "CC0-1.0 (public domain dedication) unless noted in LICENSES.md",
    root: "anvil/assets/audio",
    description:
      "Bundled free (CC0) game audio for agents. Paths relative to this folder.",
    counts: {
      total: entries.length,
      music: entries.filter((e) => e.kind === "music").length,
      sfx: entries.filter((e) => e.kind === "sfx").length,
      jingles: entries.filter((e) => e.kind === "jingle").length,
      byFolder,
    },
    suggestedCues,
    entries,
  };
}

/** Write catalog.json next to the audio files. */
export function writeBundledAudioCatalog(audioRoot?: string): string | null {
  const root = resolveBundledAudioRoot(audioRoot);
  if (!root) return null;
  const catalog = buildCatalogFromDisk(root);
  const out = path.join(root, "catalog.json");
  fs.writeFileSync(out, JSON.stringify(catalog, null, 2) + "\n");
  cachedCatalog = catalog;
  cachedRoot = root;
  return out;
}

/** Clear in-memory catalog cache (tests). */
export function clearBundledAudioCatalogCache(): void {
  cachedCatalog = null;
  cachedRoot = null;
}

/**
 * List bundled audio entries for agents (filterable).
 */
export function listBundledAudio(
  filter: ListBundledAudioFilter = {},
  audioRoot?: string,
): BundledAudioEntry[] {
  const catalog = loadBundledAudioCatalog(audioRoot);
  if (!catalog) return [];

  let list = catalog.entries;
  if (filter.kind) list = list.filter((e) => e.kind === filter.kind);
  if (filter.channel) list = list.filter((e) => e.channel === filter.channel);
  if (filter.prefix) {
    const p = filter.prefix.replace(/\\/g, "/").replace(/\/+$/, "");
    list = list.filter(
      (e) => e.path === p || e.path.startsWith(p + "/") || e.path.startsWith(p),
    );
  }
  if (filter.tag) {
    const t = filter.tag.toLowerCase();
    list = list.filter((e) => e.tags.some((x) => x.toLowerCase() === t));
  }
  if (filter.query) {
    const q = filter.query.toLowerCase();
    list = list.filter(
      (e) =>
        e.path.toLowerCase().includes(q) ||
        e.id.toLowerCase().includes(q) ||
        e.tags.some((x) => x.toLowerCase().includes(q)),
    );
  }
  if (filter.limit != null && filter.limit >= 0) {
    list = list.slice(0, filter.limit);
  }
  return list;
}

/**
 * Semantic cue map from catalog (`hit` → `sfx/combat/hit_01.ogg`).
 * Paths are relative to the bundled audio root.
 */
export function getSuggestedAudioCues(audioRoot?: string): AudioCues {
  const catalog = loadBundledAudioCatalog(audioRoot);
  return { ...(catalog?.suggestedCues ?? DEFAULT_SUGGESTED) };
}

/**
 * Prefix cue paths for a game asset tree, e.g. rootPrefix `"audio"` →
 * `audio/sfx/ui/click_001.ogg` when the pack is at `assets/audio/`.
 */
export function cuesForAssetRoot(
  cues: AudioCues,
  rootPrefix = "audio",
): AudioCues {
  const prefix = rootPrefix.replace(/^\/+|\/+$/g, "");
  const out: AudioCues = {};
  for (const [k, v] of Object.entries(cues)) {
    const rel = v.replace(/^\/+/, "");
    if (rel.startsWith(prefix + "/")) out[k] = rel;
    else out[k] = `${prefix}/${rel}`;
  }
  return out;
}

/**
 * Convenience: suggested cues already prefixed for `assets/audio` symlink layout.
 */
export function getGameReadyAudioCues(
  assetPrefix = "audio",
  audioRoot?: string,
): AudioCues {
  return cuesForAssetRoot(getSuggestedAudioCues(audioRoot), assetPrefix);
}
