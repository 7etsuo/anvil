import fs from "node:fs";
import path from "node:path";
import type { AssetServer } from "../assets/AssetServer.js";
import type { EventBus } from "../events/EventBus.js";

export type AudioCues = Record<string, string>;

export class AudioSystem {
  private cues: AudioCues = {};
  private assets: AssetServer;
  private events: EventBus;

  constructor(assets: AssetServer, events: EventBus) {
    this.assets = assets;
    this.events = events;
    this.events.on("audio:play", (payload) => {
      const p = payload as { cue?: string };
      if (p.cue) this.play(p.cue);
    });
  }

  loadCuesFromFile(gameRoot: string, contentRoot: string): void {
    if (this.assets.isBrowser()) return;
    const p = path.join(gameRoot, contentRoot, "audio.json");
    if (!fs.existsSync(p)) return;
    try {
      const raw = JSON.parse(fs.readFileSync(p, "utf8")) as {
        cues?: AudioCues;
      };
      this.cues = raw.cues ?? {};
    } catch {
      /* ignore */
    }
  }

  setCues(cues: AudioCues): void {
    this.cues = cues;
  }

  play(cue: string): void {
    const rel = this.cues[cue];
    if (!rel) {
      console.warn(`AUDIO_CUE_MISSING cue=${cue}`);
      return;
    }
    const handle = this.assets.getAudio(rel);
    if (!handle) return;
    if (handle.el) {
      handle.el.currentTime = 0;
      void handle.el.play().catch(() => {
        /* autoplay policies */
      });
    }
    // Node: existence already verified; no playback
  }
}
