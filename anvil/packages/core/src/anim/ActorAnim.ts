/**
 * Actor animation state machine — idle / walk / attack / hit / death.
 * Presentation reads currentFrame path; games call setState on transitions.
 */

export type ActorAnimState =
  | "idle"
  | "walk"
  | "attack"
  | "hit"
  | "death"
  | "cast";

export type ActorAnimClips = Partial<Record<ActorAnimState, string[]>>;

export type ActorAnimOpts = {
  clips: ActorAnimClips;
  fps?: number;
  /** Priority: higher wins if multiple request (death always top). */
  defaultFps?: number;
};

const PRIORITY: Record<ActorAnimState, number> = {
  death: 100,
  hit: 80,
  attack: 70,
  cast: 70,
  walk: 20,
  idle: 10,
};

export class ActorAnimController {
  clips: ActorAnimClips;
  fps: number;
  state: ActorAnimState = "idle";
  frame = 0;
  private accum = 0;
  private lockedUntil = 0; // time ms remaining for one-shot
  flipX = false;

  constructor(opts: ActorAnimOpts) {
    this.clips = opts.clips;
    this.fps = opts.fps ?? opts.defaultFps ?? 8;
  }

  /** Request a state; respects priority and one-shot lock. */
  setState(next: ActorAnimState, opts?: { force?: boolean; lockMs?: number }): void {
    if (this.state === "death" && next !== "death" && !opts?.force) return;
    if (
      !opts?.force &&
      this.lockedUntil > 0 &&
      PRIORITY[next] < PRIORITY[this.state]
    ) {
      return;
    }
    if (this.state !== next) {
      this.state = next;
      this.frame = 0;
      this.accum = 0;
    }
    if (opts?.lockMs) this.lockedUntil = Math.max(this.lockedUntil, opts.lockMs);
  }

  /** Drive from velocity + combat flags. */
  tick(
    dtMs: number,
    opts: {
      moving?: boolean;
      attacking?: boolean;
      dead?: boolean;
      casting?: boolean;
      hit?: boolean;
    } = {},
  ): void {
    this.lockedUntil = Math.max(0, this.lockedUntil - dtMs);
    if (opts.dead) {
      this.setState("death", { force: true });
    } else if (opts.hit) {
      this.setState("hit", { lockMs: 150 });
    } else if (opts.attacking) {
      this.setState("attack", { lockMs: 200 });
    } else if (opts.casting) {
      this.setState("cast", { lockMs: 250 });
    } else if (this.lockedUntil <= 0) {
      this.setState(opts.moving ? "walk" : "idle");
    }

    const frames = this.clips[this.state] ?? this.clips.idle ?? [];
    if (frames.length <= 1 || this.fps <= 0) return;
    const loop = this.state === "idle" || this.state === "walk";
    this.accum += dtMs / 1000;
    const dur = 1 / this.fps;
    while (this.accum >= dur) {
      this.accum -= dur;
      if (loop) this.frame = (this.frame + 1) % frames.length;
      else this.frame = Math.min(this.frame + 1, frames.length - 1);
    }
  }

  currentFrame(): string | null {
    const frames = this.clips[this.state] ?? this.clips.idle ?? [];
    if (!frames.length) return null;
    return frames[Math.min(this.frame, frames.length - 1)] ?? null;
  }
}
