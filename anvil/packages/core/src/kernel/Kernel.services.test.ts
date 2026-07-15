import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { createGame } from "../createGame.js";
import { observe } from "../observe.js";
import { ANVIL_VERSION } from "./Kernel.js";

const helloEmpty = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../../examples/hello-empty",
);

describe("Kernel first-class services", () => {
  it("createGame exposes particles, quests, plugins, ui, audio", async () => {
    const handle = await createGame({
      root: helloEmpty,
      headless: true,
      seed: 1,
    });
    expect(handle.version).toBe(ANVIL_VERSION);
    expect(handle.particles).toBeDefined();
    expect(handle.quests).toBeDefined();
    expect(handle.plugins).toBeDefined();
    expect(handle.ui).toBeDefined();
    expect(handle.audio).toBeDefined();

    handle.quests.register({
      id: "t",
      title: "Test",
      autoStart: true,
      steps: [{ id: "a", description: "do", completeFlag: "done" }],
    });
    handle.particles.burst({ x: 0, y: 0, count: 3, life: 1 });
    handle.tick(1 / 60);

    const snap = await observe(handle);
    expect(snap.engine.version).toBe(ANVIL_VERSION);
    expect(snap.engine.questsActive).toContain("t");
    expect((snap.engine.particles as number) >= 0).toBe(true);
    expect(Array.isArray(snap.engine.systems)).toBe(true);

    handle.dispose();
  });
});
