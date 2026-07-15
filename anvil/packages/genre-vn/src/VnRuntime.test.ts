import { describe, expect, it } from "vitest";
import { InputMap } from "@anvil/core";
import { VnRuntime } from "./VnRuntime.js";
import type { VnScript } from "./types.js";

const linear: VnScript = {
  id: "linear",
  start: "n1",
  nodes: [
    {
      id: "n1",
      type: "line",
      speaker: "Narrator",
      text: "Hello",
      next: "n2",
    },
    {
      id: "n2",
      type: "line",
      speaker: "Hero",
      text: "World",
      next: "end_good",
    },
    { id: "end_good", type: "end", endingId: "good" },
  ],
};

const branched: VnScript = {
  id: "branch",
  start: "intro",
  nodes: [
    {
      id: "intro",
      type: "line",
      speaker: "Guide",
      text: "Pick a path",
      next: "choice",
    },
    {
      id: "choice",
      type: "choice",
      prompt: "Where to?",
      options: [
        { text: "Left", next: "left" },
        { text: "Right", next: "right" },
      ],
    },
    {
      id: "left",
      type: "line",
      speaker: "Guide",
      text: "Left path",
      next: "end_a",
    },
    {
      id: "right",
      type: "jump",
      next: "end_b",
    },
    { id: "end_a", type: "end", endingId: "ending_a" },
    { id: "end_b", type: "end", endingId: "ending_b" },
  ],
};

describe("VnRuntime", () => {
  it("linear script reaches end", () => {
    const r = new VnRuntime(linear);
    expect(r.advance()).toBe(true);
    expect(r.advance()).toBe(true);
    expect(r.isEnded()).toBe(true);
    expect(r.getEndingId()).toBe("good");
  });

  it("branch A vs B different endingId", () => {
    const a = new VnRuntime(branched);
    a.advance();
    a.choose(0);
    a.advance();
    expect(a.getEndingId()).toBe("ending_a");

    const b = new VnRuntime(branched);
    b.advance();
    b.choose(1);
    expect(b.isEnded()).toBe(true);
    expect(b.getEndingId()).toBe("ending_b");
  });

  it("confirm advances line via input", () => {
    const r = new VnRuntime(linear);
    const input = new InputMap();
    input.installDefaults();
    input.setDown("confirm", false);
    input.endFrame();
    input.setDown("confirm", true);
    r.update(input);
    expect(r.getCurrentId()).toBe("n2");
  });

  it("choice_N selects option", () => {
    const r = new VnRuntime(branched);
    r.advance();
    const input = new InputMap();
    input.installDefaults();
    input.setDown("choice_1", false);
    input.endFrame();
    input.setDown("choice_1", true);
    r.update(input);
    expect(r.getEndingId()).toBe("ending_b");
  });
});
