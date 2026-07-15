import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, beforeEach } from "vitest";
import {
  clearBundledAudioCatalogCache,
  cuesForAssetRoot,
  getGameReadyAudioCues,
  getSuggestedAudioCues,
  listBundledAudio,
  loadBundledAudioCatalog,
  resolveBundledAudioRoot,
  writeBundledAudioCatalog,
} from "./AudioCatalog.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
// packages/core/src/audio → anvil/assets/audio
const AUDIO_ROOT = path.resolve(HERE, "../../../../assets/audio");

describe("AudioCatalog", () => {
  beforeEach(() => {
    clearBundledAudioCatalogCache();
  });

  it("resolves bundled audio root", () => {
    const root = resolveBundledAudioRoot(AUDIO_ROOT);
    expect(root).toBe(AUDIO_ROOT);
    expect(fs.existsSync(path.join(root!, "music"))).toBe(true);
  });

  it("loads catalog with music and sfx", () => {
    const cat = loadBundledAudioCatalog(AUDIO_ROOT);
    expect(cat).not.toBeNull();
    expect(cat!.counts.total).toBeGreaterThan(100);
    expect(cat!.counts.music).toBeGreaterThan(5);
    expect(cat!.counts.sfx).toBeGreaterThan(50);
    expect(cat!.entries.some((e) => e.path.startsWith("music/"))).toBe(true);
    expect(cat!.entries.some((e) => e.path.startsWith("sfx/ui/"))).toBe(true);
  });

  it("lists and filters audio", () => {
    const ui = listBundledAudio({ prefix: "sfx/ui", limit: 10 }, AUDIO_ROOT);
    expect(ui.length).toBeGreaterThan(0);
    expect(ui.length).toBeLessThanOrEqual(10);
    expect(ui.every((e) => e.path.startsWith("sfx/ui"))).toBe(true);

    const music = listBundledAudio({ kind: "music" }, AUDIO_ROOT);
    expect(music.every((e) => e.kind === "music")).toBe(true);
    expect(music.length).toBeGreaterThan(0);

    const hits = listBundledAudio({ query: "hit", limit: 20 }, AUDIO_ROOT);
    expect(hits.length).toBeGreaterThan(0);
  });

  it("provides suggested cues that exist on disk", () => {
    const cues = getSuggestedAudioCues(AUDIO_ROOT);
    expect(cues.ui_click).toBeTruthy();
    expect(cues.hit).toBeTruthy();
    expect(cues.music_battle).toBeTruthy();
    for (const p of Object.values(cues)) {
      expect(fs.existsSync(path.join(AUDIO_ROOT, p)), p).toBe(true);
    }
  });

  it("prefixes cues for game asset root", () => {
    const ready = getGameReadyAudioCues("audio", AUDIO_ROOT);
    expect(ready.hit).toMatch(/^audio\/sfx\//);
    expect(ready.music_town).toMatch(/^audio\/music\//);

    const again = cuesForAssetRoot({ a: "sfx/x.ogg" }, "audio");
    expect(again.a).toBe("audio/sfx/x.ogg");
    const idem = cuesForAssetRoot({ a: "audio/sfx/x.ogg" }, "audio");
    expect(idem.a).toBe("audio/sfx/x.ogg");
  });

  it("writeBundledAudioCatalog rewrites catalog.json", () => {
    const out = writeBundledAudioCatalog(AUDIO_ROOT);
    expect(out).toBe(path.join(AUDIO_ROOT, "catalog.json"));
    const raw = JSON.parse(fs.readFileSync(out!, "utf8")) as {
      counts: { total: number };
    };
    expect(raw.counts.total).toBeGreaterThan(100);
  });
});
