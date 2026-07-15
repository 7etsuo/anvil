import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { createGame } from "../createGame.js";
import { observe } from "../observe.js";
import { agentStep } from "./agentStep.js";
import { observeDiff, observeSummary } from "./observeDiff.js";
import { playReplay, ReplayRecorder } from "./replay.js";
import { AGENT_TOOL_CATALOG } from "./types.js";

const hello = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../../examples/hello-empty",
);

describe("agent ACI", () => {
  it("tool catalog stays small", () => {
    expect(AGENT_TOOL_CATALOG.length).toBeLessThanOrEqual(15);
    expect(AGENT_TOOL_CATALOG.some((t) => t.name === "observe")).toBe(true);
    expect(AGENT_TOOL_CATALOG.some((t) => t.name === "test")).toBe(true);
  });

  it("agentStep moves without raw key codes", async () => {
    const handle = await createGame({ root: hello, headless: true, seed: 7 });
    // spawn a mover for empty scene
    handle.world.spawn({
      id: "player",
      tags: ["player"],
      transform: { x: 0, y: 0 },
      health: { hp: 10, max: 10 },
    });
    // empty scene won't apply topdown — just ensure step advances tick
    const before = handle.getTick();
    agentStep(handle, { type: "wait", frames: 5 });
    expect(handle.getTick()).toBe(before + 5);
    handle.dispose();
  });

  it("observe includes summary and allowedActions", async () => {
    const handle = await createGame({ root: hello, headless: true, seed: 1 });
    const snap = await observe(handle);
    expect(snap.summary.length).toBeGreaterThan(0);
    expect(snap.allowedActions).toContain("move_right");
    expect(observeSummary(snap)).toContain("tick=");
    handle.dispose();
  });

  it("observeDiff reports entity changes", async () => {
    const handle = await createGame({ root: hello, headless: true, seed: 1 });
    const a = await observe(handle);
    handle.world.spawn({
      id: "e1",
      tags: ["enemy"],
      transform: { x: 1, y: 2 },
      health: { hp: 5, max: 5 },
    });
    handle.tick(1 / 60);
    const b = await observe(handle);
    const d = observeDiff(a, b);
    expect(d.addedEntities).toContain("e1");
    expect(d.summary).toContain("+entities");
    handle.dispose();
  });

  it("engine metrics appear on observe", async () => {
    const handle = await createGame({ root: hello, headless: true, seed: 1 });
    handle.tick(1 / 60);
    const snap = await observe(handle);
    const m = snap.engine.metrics as {
      entities: number;
      entityBudget: number;
      lastTickMs: number;
    };
    expect(m.entities).toBeGreaterThanOrEqual(0);
    expect(m.entityBudget).toBe(500);
    expect(typeof m.lastTickMs).toBe("number");
    handle.dispose();
  });

  it("replay is deterministic for same seed", async () => {
    const tape = new ReplayRecorder(42);
    tape.record({ type: "wait", frames: 3 });
    tape.record({ type: "tap", action: "confirm" }, 1);

    const h1 = await createGame({ root: hello, headless: true, seed: 42 });
    playReplay(h1, tape.toJSON());
    const t1 = h1.getTick();
    h1.dispose();

    const h2 = await createGame({ root: hello, headless: true, seed: 42 });
    playReplay(h2, tape.toJSON());
    expect(h2.getTick()).toBe(t1);
    h2.dispose();
  });
});
