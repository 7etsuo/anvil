/**
 * Client-side input prediction helpers (lag-friendly movement).
 * Server remains authoritative; client predicts and reconciles.
 */

export type InputFrame = {
  seq: number;
  /** Wall or sim time ms when sampled */
  t: number;
  /** Buttons / axes snapshot */
  input: Record<string, boolean | number>;
};

export type PredictedPose = {
  x: number;
  y: number;
  seq: number;
};

export type MoveFn = (
  pose: { x: number; y: number },
  input: Record<string, boolean | number>,
  dtSec: number,
) => { x: number; y: number };

/**
 * Buffer local inputs and re-apply after server correction.
 */
export class InputPredictor {
  private pending: InputFrame[] = [];
  private seq = 0;
  private pose: PredictedPose = { x: 0, y: 0, seq: 0 };
  private maxBuffer = 64;

  constructor(
    private move: MoveFn,
    start?: { x: number; y: number },
  ) {
    if (start) {
      this.pose.x = start.x;
      this.pose.y = start.y;
    }
  }

  getPose(): PredictedPose {
    return { ...this.pose };
  }

  /**
   * Sample input for this frame; advances local prediction.
   */
  sample(
    input: Record<string, boolean | number>,
    dtSec: number,
    t = Date.now(),
  ): InputFrame {
    this.seq += 1;
    const frame: InputFrame = { seq: this.seq, t, input: { ...input } };
    this.pending.push(frame);
    if (this.pending.length > this.maxBuffer) this.pending.shift();
    const next = this.move(this.pose, input, dtSec);
    this.pose = { x: next.x, y: next.y, seq: this.seq };
    return frame;
  }

  /**
   * Server ack: authoritative pose at seq.
   * Drop buffered inputs ≤ seq and replay the rest.
   */
  reconcile(
    server: { x: number; y: number; seq: number },
    dtSecPerFrame = 1 / 60,
  ): PredictedPose {
    this.pending = this.pending.filter((f) => f.seq > server.seq);
    let pose = { x: server.x, y: server.y };
    for (const f of this.pending) {
      pose = this.move(pose, f.input, dtSecPerFrame);
    }
    this.pose = { ...pose, seq: this.seq };
    return this.getPose();
  }

  /** Snap without replay (teleport / hard correction). */
  hardSnap(x: number, y: number, seq?: number): void {
    this.pose = { x, y, seq: seq ?? this.seq };
    if (seq != null) {
      this.pending = this.pending.filter((f) => f.seq > seq);
    }
  }

  pendingCount(): number {
    return this.pending.length;
  }

  clear(): void {
    this.pending = [];
  }
}

/**
 * Typical top-down move: WASD / move_* buttons, speed units/sec.
 */
export function makeTopdownMoveFn(speed: number): MoveFn {
  return (pose, input, dt) => {
    let dx = 0;
    let dy = 0;
    if (input.move_left || input.left || input.a) dx -= 1;
    if (input.move_right || input.right || input.d) dx += 1;
    if (input.move_up || input.up || input.w) dy -= 1;
    if (input.move_down || input.down || input.s) dy += 1;
    if (dx === 0 && dy === 0) return { ...pose };
    const len = Math.hypot(dx, dy) || 1;
    return {
      x: pose.x + (dx / len) * speed * dt,
      y: pose.y + (dy / len) * speed * dt,
    };
  };
}
