import { describe, expect, it } from "vitest";
import { createGame } from "./createGame.js";
import { observe } from "./observe.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Soft budget from docs/design/07_RUNTIME_KERNEL.md §8 */
const ENTITY_BUDGET = 500;
const OBSERVE_JSON_BUDGET = 256 * 1024;
const TICKS = 60;

const helloEmpty = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../examples/hello-empty",
);

describe("performance smoke (entity budget)", () => {
  it(`spawns ${ENTITY_BUDGET} entities and ticks ${TICKS} frames under soft budget`, async () => {
    const handle = await createGame({
      root: helloEmpty,
      headless: true,
      seed: 1,
    });

    for (let i = 0; i < ENTITY_BUDGET; i++) {
      handle.world.spawn({
        tags: ["perf"],
        transform: { x: i % 100, y: Math.floor(i / 100) },
        health: { hp: 1, max: 1 },
        data: { i },
      });
    }

    const t0 = performance.now();
    for (let i = 0; i < TICKS; i++) {
      handle.tick(1 / 60);
    }
    const ms = performance.now() - t0;

    expect(handle.world.all().length).toBeGreaterThanOrEqual(ENTITY_BUDGET);
    // Soft wall: 5s is generous on CI; catches catastrophic regressions only
    expect(ms).toBeLessThan(5000);

    const snap = await observe(handle);
    const bytes = Buffer.byteLength(JSON.stringify(snap), "utf8");
    expect(bytes).toBeLessThan(OBSERVE_JSON_BUDGET);

    handle.dispose();
  });
});
