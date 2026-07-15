import fs from "node:fs";
import path from "node:path";
import type { AssetServer } from "../assets/AssetServer.js";
import type { EventBus } from "../events/EventBus.js";

export type AudioCues = Record<string, string>;
export type AudioChannel = "master" | "music" | "sfx" | "ui";

/**
 * Multi-channel audio bus.
 * Browser: HTMLAudioElement + gain-like volume scaling.
 * Node: cue existence only (tests/CI).
 */
export class AudioSystem {
  private cues: AudioCues = {};
  private assets: AssetServer;
  private events: EventBus;
  private volumes: Record<AudioChannel, number> = {
    master: 1,
    music: 0.7,
    sfx: 1,
    ui: 0.9,
  };
  private musicEl: HTMLAudioElement | null = null;
  private musicCue: string | null = null;
  private muted = false;

  constructor(assets: AssetServer, events: EventBus) {
    this.assets = assets;
    this.events = events;
    this.events.on("audio:play", (payload) => {
      const p = payload as { cue?: string; channel?: AudioChannel };
      if (p.cue) this.play(p.cue, p.channel ?? "sfx");
    });
    this.events.on("audio:music", (payload) => {
      const p = payload as { cue?: string | null };
      if (p.cue) this.playMusic(p.cue);
      else this.stopMusic();
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

  setVolume(channel: AudioChannel, volume: number): void {
    this.volumes[channel] = Math.max(0, Math.min(1, volume));
    if (this.musicEl) {
      this.musicEl.volume = this.effective("music");
    }
  }

  getVolume(channel: AudioChannel): number {
    return this.volumes[channel];
  }

  setMuted(m: boolean): void {
    this.muted = m;
    if (this.musicEl) this.musicEl.muted = m;
  }

  private effective(channel: AudioChannel): number {
    if (this.muted) return 0;
    return this.volumes.master * this.volumes[channel];
  }

  play(cue: string, channel: AudioChannel = "sfx"): void {
    const rel = this.cues[cue];
    if (!rel) {
      console.warn(`AUDIO_CUE_MISSING cue=${cue}`);
      return;
    }
    const handle = this.assets.getAudio(rel);
    if (!handle?.el) return;
    const el = handle.el.cloneNode(true) as HTMLAudioElement;
    el.volume = this.effective(channel);
    el.currentTime = 0;
    void el.play().catch(() => {
      /* autoplay */
    });
  }

  playMusic(cue: string, loop = true): void {
    if (this.musicCue === cue && this.musicEl && !this.musicEl.paused) return;
    this.stopMusic();
    const rel = this.cues[cue];
    if (!rel) {
      console.warn(`AUDIO_CUE_MISSING cue=${cue}`);
      return;
    }
    const handle = this.assets.getAudio(rel);
    if (!handle?.el) return;
    this.musicEl = handle.el;
    this.musicEl.loop = loop;
    this.musicEl.volume = this.effective("music");
    this.musicEl.muted = this.muted;
    this.musicCue = cue;
    void this.musicEl.play().catch(() => {
      /* autoplay */
    });
  }

  stopMusic(): void {
    if (this.musicEl) {
      this.musicEl.pause();
      this.musicEl.currentTime = 0;
    }
    this.musicEl = null;
    this.musicCue = null;
  }
}
