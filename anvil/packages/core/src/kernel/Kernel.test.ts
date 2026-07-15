import { describe, expect, it } from "vitest";
import { Kernel } from "./Kernel.js";
import { NullRenderFacade } from "../render/RenderFacade.js";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";

function tmpRoot(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "anvil-"));
  fs.mkdirSync(path.join(dir, "assets"), { recursive: true });
  return dir;
}

describe("Kernel", () => {
  it("seeds RNG deterministically", () => {
    const root = tmpRoot();
    const a = new Kernel({ gameRoot: root, seed: 42, renderer: new NullRenderFacade() });
    const b = new Kernel({ gameRoot: root, seed: 42, renderer: new NullRenderFacade() });
    const seqA = Array.from({ length: 10 }, () => a.random());
    const seqB = Array.from({ length: 10 }, () => b.random());
    expect(seqA).toEqual(seqB);
    a.dispose();
    b.dispose();
  });

  it("pause freezes sim time", () => {
    const root = tmpRoot();
    const k = new Kernel({ gameRoot: root, seed: 1, renderer: new NullRenderFacade() });
    k.registerScene("main", () => ({ update() {} }));
    k.scenes.push("main");
    k.tick(1 / 60);
    const t1 = k.getTime();
    k.pause();
    k.tick(1 / 60);
    k.tick(1 / 60);
    expect(k.getTime()).toBe(t1);
    k.resume();
    k.tick(1 / 60);
    expect(k.getTime()).toBeGreaterThan(t1);
    k.dispose();
  });

  it("spawn destroy query", () => {
    const root = tmpRoot();
    const k = new Kernel({ gameRoot: root, renderer: new NullRenderFacade() });
    const id = k.world.spawn({
      tags: ["player"],
      transform: { x: 1, y: 2 },
      health: { hp: 10, max: 10 },
    });
    expect(k.world.query("transform", "health")).toHaveLength(1);
    k.world.destroy(id);
    expect(k.world.has(id)).toBe(false);
    k.dispose();
  });
});
