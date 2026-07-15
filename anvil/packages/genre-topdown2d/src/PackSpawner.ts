/**
 * Timed pack / respawn director for open maps and endless modes.
 * Genre-agnostic loop: call update(dtMs); when due and under cap, spawnOne().
 */
export type PackSpawnerOpts = {
  /** Base ms between spawn attempts (scaled by pressure). */
  intervalMs: number;
  /** Soft cap — do not spawn if livingCount() >= this. */
  maxLiving: number;
  /** How many actors to try per wave. */
  packSize: number | (() => number);
  livingCount: () => number;
  /** Place one enemy; return true if placed. */
  spawnOne: () => boolean;
  /** Optional: skip spawning entirely (safe zones). */
  enabled?: () => boolean;
};

export class PackSpawner {
  private timerMs: number;
  private opts: PackSpawnerOpts;
  waves = 0;

  constructor(opts: PackSpawnerOpts) {
    this.opts = opts;
    this.timerMs = opts.intervalMs * 0.35;
  }

  reset(intervalMs?: number): void {
    if (intervalMs !== undefined) this.opts.intervalMs = intervalMs;
    this.timerMs = this.opts.intervalMs * 0.25;
    this.waves = 0;
  }

  setMaxLiving(n: number): void {
    this.opts.maxLiving = n;
  }

  setIntervalMs(ms: number): void {
    this.opts.intervalMs = ms;
  }

  update(dtMs: number): number {
    if (this.opts.enabled && !this.opts.enabled()) return 0;
    this.timerMs -= dtMs;
    if (this.timerMs > 0) return 0;
    this.timerMs = this.opts.intervalMs;
    if (this.opts.livingCount() >= this.opts.maxLiving) return 0;

    const want =
      typeof this.opts.packSize === "function"
        ? this.opts.packSize()
        : this.opts.packSize;
    let placed = 0;
    for (let i = 0; i < want; i++) {
      if (this.opts.livingCount() >= this.opts.maxLiving) break;
      if (this.opts.spawnOne()) placed++;
    }
    if (placed > 0) this.waves++;
    return placed;
  }
}
