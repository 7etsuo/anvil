import fs from "node:fs";
import path from "node:path";
import type { GameHandle } from "./createGame.js";

export interface ObserveOpts {
  shot?: boolean;
  /** Directory for screenshot; default {root}/artifacts */
  shotDir?: string;
}

export interface ObserveSnapshot {
  anvilVersion: string;
  schemaVersion: 1;
  scene: string | null;
  time: number;
  tick: number;
  seed: number;
  paused: boolean;
  entities: Array<{
    id: string;
    tags: string[];
    x?: number;
    y?: number;
    hp?: number;
    maxHp?: number;
  }>;
  input: Record<string, boolean>;
  ui: Record<string, unknown>;
  genre: Record<string, unknown>;
  screenshot?: string;
}

export async function observe(
  handle: GameHandle,
  opts: ObserveOpts = {},
): Promise<ObserveSnapshot> {
  const entities = handle.world.all().map((e) => ({
    id: e.id,
    tags: [...e.tags],
    x: e.transform?.x,
    y: e.transform?.y,
    hp: e.health?.hp,
    maxHp: e.health?.max,
  }));

  const snap: ObserveSnapshot = {
    anvilVersion: "0.1.0",
    schemaVersion: 1,
    scene: handle.scenes.current(),
    time: handle.getTime(),
    tick: handle.getTick(),
    seed: handle.getSeed(),
    paused: handle.isPaused(),
    entities,
    input: handle.input.snapshot(),
    ui: {},
    genre: handle.kernel.getGenreObserve(),
  };

  if (opts.shot) {
    const bytes = await handle.kernel.renderer.captureScreenshot();
    const rel = "artifacts/observe.png";
    if (!handle.assets.isBrowser() && bytes.length > 0) {
      const dir = opts.shotDir
        ? path.resolve(opts.shotDir)
        : path.join(handle.root, "artifacts");
      fs.mkdirSync(dir, { recursive: true });
      const file = path.join(dir, "observe.png");
      fs.writeFileSync(file, bytes);
      snap.screenshot = path.relative(handle.root, file).replace(/\\/g, "/");
    } else {
      snap.screenshot = rel;
    }
  }

  return snap;
}
