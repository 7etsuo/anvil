/**
 * Screen fade / wipe transitions (logic; games draw overlay alpha).
 */

export type TransitionKind = "fade" | "hold" | "none";

export type TransitionPhase = "idle" | "out" | "hold" | "in";

export type ScreenTransitionState = {
  phase: TransitionPhase;
  kind: TransitionKind;
  /** 0 transparent → 1 full cover */
  alpha: number;
  /** Optional label for mid-hold (zone name) */
  label?: string;
};

export type TransitionOpts = {
  kind?: TransitionKind;
  outMs?: number;
  holdMs?: number;
  inMs?: number;
  label?: string;
  /** Called at mid-hold (swap scene/map here) */
  onMid?: () => void;
  onDone?: () => void;
};

export class ScreenTransition {
  private phase: TransitionPhase = "idle";
  private kind: TransitionKind = "fade";
  private alpha = 0;
  private t = 0;
  private outMs = 250;
  private holdMs = 100;
  private inMs = 300;
  private label?: string;
  private onMid?: () => void;
  private onDone?: () => void;
  private midFired = false;

  get state(): ScreenTransitionState {
    return {
      phase: this.phase,
      kind: this.kind,
      alpha: this.alpha,
      label: this.label,
    };
  }

  get active(): boolean {
    return this.phase !== "idle";
  }

  /**
   * Start fade-out → hold → fade-in. Safe to call while idle.
   */
  start(opts: TransitionOpts = {}): void {
    this.kind = opts.kind ?? "fade";
    this.outMs = opts.outMs ?? 250;
    this.holdMs = opts.holdMs ?? 100;
    this.inMs = opts.inMs ?? 300;
    this.label = opts.label;
    this.onMid = opts.onMid;
    this.onDone = opts.onDone;
    this.phase = "out";
    this.t = 0;
    this.alpha = 0;
    this.midFired = false;
  }

  /** Skip to idle. */
  cancel(): void {
    this.phase = "idle";
    this.alpha = 0;
    this.label = undefined;
  }

  /** dt in seconds */
  update(dt: number): void {
    if (this.phase === "idle") return;
    const dtMs = dt * 1000;
    this.t += dtMs;

    if (this.phase === "out") {
      this.alpha = Math.min(1, this.t / this.outMs);
      if (this.t >= this.outMs) {
        this.phase = "hold";
        this.t = 0;
        this.alpha = 1;
      }
    } else if (this.phase === "hold") {
      this.alpha = 1;
      if (!this.midFired) {
        this.midFired = true;
        this.onMid?.();
      }
      if (this.t >= this.holdMs) {
        this.phase = "in";
        this.t = 0;
      }
    } else if (this.phase === "in") {
      this.alpha = Math.max(0, 1 - this.t / this.inMs);
      if (this.t >= this.inMs) {
        this.phase = "idle";
        this.alpha = 0;
        this.label = undefined;
        this.onDone?.();
      }
    }
  }
}
