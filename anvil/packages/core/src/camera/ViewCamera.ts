/**
 * First-class view camera: ortho or iso projection, follow, shake.
 * Simulation stays world-space; presentation uses project/unproject.
 */

export type CameraMode = "ortho" | "iso";

export type IsoMetrics = {
  tileW: number;
  tileH: number;
};

export type ViewCameraOpts = {
  mode?: CameraMode;
  viewW?: number;
  viewH?: number;
  /** Ortho: pixels per world unit (default 1). */
  scale?: number;
  iso?: IsoMetrics;
  /** Lerp rate for follow (1 = snap). */
  followLerp?: number;
};

export class ViewCamera {
  mode: CameraMode;
  viewW: number;
  viewH: number;
  scale: number;
  iso: IsoMetrics;
  followLerp: number;
  /** World-space focus. */
  wx = 0;
  wy = 0;
  shakeX = 0;
  shakeY = 0;
  private shakeMag = 0;
  private shakeT = 0;

  constructor(opts: ViewCameraOpts = {}) {
    this.mode = opts.mode ?? "ortho";
    this.viewW = opts.viewW ?? 1280;
    this.viewH = opts.viewH ?? 720;
    this.scale = opts.scale ?? 1;
    this.iso = opts.iso ?? { tileW: 1.4, tileH: 0.7 };
    this.followLerp = opts.followLerp ?? 0.12;
  }

  setViewSize(w: number, h: number): void {
    this.viewW = w;
    this.viewH = h;
  }

  setMode(mode: CameraMode): void {
    this.mode = mode;
  }

  /** Instant focus. */
  snap(wx: number, wy: number): void {
    this.wx = wx;
    this.wy = wy;
  }

  /** Smooth follow toward target. */
  follow(tx: number, ty: number, dt = 1 / 60): void {
    const k = Math.min(1, this.followLerp * (dt * 60));
    this.wx += (tx - this.wx) * k;
    this.wy += (ty - this.wy) * k;
  }

  /** Screen-space shake impulse (seconds). */
  shake(mag: number, duration = 0.15): void {
    this.shakeMag = Math.max(this.shakeMag, mag);
    this.shakeT = Math.max(this.shakeT, duration);
  }

  update(dt: number): void {
    if (this.shakeT > 0) {
      this.shakeT = Math.max(0, this.shakeT - dt);
      const a = this.shakeT > 0 ? this.shakeMag * (this.shakeT / 0.15) : 0;
      this.shakeX = (Math.random() - 0.5) * 2 * a;
      this.shakeY = (Math.random() - 0.5) * 2 * a;
      if (this.shakeT <= 0) {
        this.shakeX = 0;
        this.shakeY = 0;
        this.shakeMag = 0;
      }
    }
  }

  private worldToView(wx: number, wy: number): { x: number; y: number } {
    if (this.mode === "iso") {
      const a = this.iso.tileW * 0.5;
      const b = this.iso.tileH * 0.5;
      return { x: (wx - wy) * a, y: (wx + wy) * b };
    }
    return { x: wx * this.scale, y: wy * this.scale };
  }

  private viewToWorld(vx: number, vy: number): { x: number; y: number } {
    if (this.mode === "iso") {
      const a = this.iso.tileW * 0.5;
      const b = this.iso.tileH * 0.5;
      return {
        x: vx / (2 * a) + vy / (2 * b),
        y: vy / (2 * b) - vx / (2 * a),
      };
    }
    return { x: vx / this.scale, y: vy / this.scale };
  }

  /** World → screen (includes camera center + shake). */
  project(wx: number, wy: number): { x: number; y: number } {
    const p = this.worldToView(wx, wy);
    const c = this.worldToView(this.wx, this.wy);
    return {
      x: p.x - c.x + this.viewW * 0.5 + this.shakeX,
      y: p.y - c.y + this.viewH * 0.5 + this.shakeY,
    };
  }

  /** Screen → world. */
  unproject(sx: number, sy: number): { x: number; y: number } {
    const c = this.worldToView(this.wx, this.wy);
    const vx = sx - this.viewW * 0.5 - this.shakeX + c.x;
    const vy = sy - this.viewH * 0.5 - this.shakeY + c.y;
    return this.viewToWorld(vx, vy);
  }

  /** Painter depth (iso: x+y; ortho: y). */
  depth(wx: number, wy: number): number {
    return this.mode === "iso" ? wx + wy : wy;
  }
}
