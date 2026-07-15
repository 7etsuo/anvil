import type { AssetServer } from "../assets/AssetServer.js";
import type { EventBus } from "../events/EventBus.js";
import type { InputMap } from "../input/InputMap.js";

export interface CinematicDef {
  id: string;
  video: string;
  skippable?: boolean;
  loop?: boolean;
}

/**
 * Video cinematic player (S-ASSETS §8).
 * Browser: HTMLVideoElement overlay. Node: emit finished immediately.
 */
export class CinematicSystem {
  private assets: AssetServer;
  private events: EventBus;
  private input: InputMap;
  private active: CinematicDef | null = null;
  private videoEl: HTMLVideoElement | null = null;
  private finished = true;

  constructor(assets: AssetServer, events: EventBus, input: InputMap) {
    this.assets = assets;
    this.events = events;
    this.input = input;
  }

  isPlaying(): boolean {
    return !this.finished;
  }

  play(def: CinematicDef): void {
    this.stop(false);
    this.active = def;
    this.finished = false;

    const resolved = this.assets.resolveVideo(def.video);
    if (!resolved) {
      this.finish();
      return;
    }

    if (typeof document === "undefined") {
      // Node / headless
      this.finish();
      return;
    }

    const el = document.createElement("video");
    el.src = resolved;
    el.autoplay = true;
    el.loop = !!def.loop;
    el.style.cssText =
      "position:fixed;inset:0;width:100%;height:100%;object-fit:contain;background:#000;z-index:9999";
    el.addEventListener("ended", () => {
      if (!def.loop) this.finish();
    });
    document.body.appendChild(el);
    this.videoEl = el;
    void el.play().catch(() => this.finish());
  }

  update(): void {
    if (this.finished || !this.active) return;
    if (this.active.skippable !== false) {
      if (
        this.input.isPressed("skip_cinematic") ||
        this.input.isPressed("confirm") ||
        this.input.isPressed("cancel")
      ) {
        this.finish();
      }
    }
  }

  stop(emit = true): void {
    if (this.videoEl) {
      this.videoEl.pause();
      this.videoEl.remove();
      this.videoEl = null;
    }
    this.active = null;
    this.finished = true;
    if (emit) {
      // silent stop
    }
  }

  private finish(): void {
    const id = this.active?.id;
    this.stop(false);
    this.events.emit("cinematic:finished", { id });
  }
}
