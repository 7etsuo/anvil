import { describe, expect, it } from "vitest";
import { createAiAgent, tickAi } from "./ai/AiHelpers.js";
import {
  applyKnockback,
  canBeHit,
  registerHit,
  tickCombatBody,
} from "./combat/CombatFeel.js";
import {
  rollLootTable,
  validateItemDefs,
  validateLootTables,
} from "./content/validateContent.js";
import { ParticleSystem } from "./fx/ParticleSystem.js";
import { InputMap } from "./input/InputMap.js";
import { MapBuilder } from "./map/MapBuilder.js";
import { astar, wallsToGrid } from "./path/astar.js";
import { PluginRegistry } from "./plugins/PluginRegistry.js";
import { createPackageManifest, serializeManifest } from "./platform/packageGame.js";
import { QuestSystem } from "./quest/QuestSystem.js";
import { UiKit } from "./ui/UiKit.js";

describe("pathfinding", () => {
  it("finds a path around a block", () => {
    const grid = [
      [0, 0, 0, 0],
      [0, 1, 1, 0],
      [0, 0, 0, 0],
    ];
    const path = astar(grid, { x: 0, y: 0 }, { x: 3, y: 0 });
    expect(path).not.toBeNull();
    expect(path![path!.length - 1]).toEqual({ x: 3, y: 0 });
  });

  it("wallsToGrid marks cells", () => {
    const g = wallsToGrid(100, 100, [{ x: 40, y: 40, w: 20, h: 20 }], 20);
    expect(g[2]![2]).toBe(1);
    expect(g[0]![0]).toBe(0);
  });
});

describe("AI helpers", () => {
  it("chases when in range", () => {
    const agent = createAiAgent(0, 0, { aggroRange: 100, speed: 50 });
    const v = tickAi(agent, { x: 40, y: 0 }, 0.016);
    expect(agent.mode).toBe("chase");
    expect(v.vx).toBeGreaterThan(0);
  });
});

describe("combat feel", () => {
  it("applies knockback and iframes", () => {
    const body = {
      x: 10,
      y: 10,
      vx: 0,
      vy: 0,
      hitstunMs: 0,
      iframeMs: 0,
    };
    registerHit(body, 0, 10, { knockback: 100, iframeMs: 200 });
    expect(body.vx).toBeGreaterThan(0);
    expect(canBeHit(body)).toBe(false);
    tickCombatBody(body, 300);
    expect(canBeHit(body)).toBe(true);
    applyKnockback(body, 20, 10, 50);
  });
});

describe("particles", () => {
  it("bursts and ages out", () => {
    const ps = new ParticleSystem();
    ps.burst({ x: 0, y: 0, count: 10, life: 0.1 });
    expect(ps.particles.length).toBe(10);
    ps.update(0.2);
    expect(ps.particles.length).toBe(0);
  });
});

describe("quests", () => {
  it("completes steps via counts and flags", () => {
    const q = new QuestSystem();
    q.register({
      id: "kill_rats",
      title: "Rats",
      autoStart: true,
      steps: [
        {
          id: "s1",
          description: "Kill rats",
          countKey: "rat",
          countTarget: 2,
        },
        {
          id: "s2",
          description: "Return",
          completeFlag: "returned",
        },
      ],
    });
    q.addCount("rat", 2);
    expect(q.get("kill_rats")!.stepIndex).toBe(1);
    q.setFlag("returned");
    expect(q.get("kill_rats")!.status).toBe("completed");
  });
});

describe("content validators", () => {
  it("flags unknown loot items", () => {
    const items = validateItemDefs([
      { id: "sword", name: "Sword" },
      { id: "sword", name: "Dup" },
    ]);
    expect(items.some((i) => i.message.includes("duplicate"))).toBe(true);
    const loot = validateLootTables(
      [
        {
          id: "t1",
          entries: [{ item: "nope", weight: 1 }],
        },
      ],
      new Set(["sword"]),
    );
    expect(loot.some((i) => i.level === "error")).toBe(true);
    const roll = rollLootTable({
      id: "t",
      entries: [{ item: "sword", weight: 1, min: 1, max: 1 }],
    });
    expect(roll?.item).toBe("sword");
  });
});

describe("plugins", () => {
  it("registers and updates", () => {
    const reg = new PluginRegistry();
    let ticks = 0;
    reg.register({
      id: "t",
      update: () => {
        ticks++;
      },
    });
    reg.update(0.016);
    expect(ticks).toBe(1);
    expect(reg.list()).toEqual(["t"]);
  });
});

describe("map builder", () => {
  it("builds bordered map with gap", () => {
    const m = new MapBuilder("r1", 200, 200)
      .addBorder({ east: { y: 80, h: 40 } })
      .spawn("player", 40, 100, "player")
      .build();
    expect(m.walls.length).toBeGreaterThan(3);
    expect(m.spawns[0]!.actor).toBe("player");
  });
});

describe("ui kit", () => {
  it("detects button click", () => {
    const ui = new UiKit();
    const ctx = {
      fillStyle: "",
      strokeStyle: "",
      lineWidth: 0,
      font: "",
      textAlign: "left" as CanvasTextAlign,
      fillRect: () => {},
      strokeRect: () => {},
      fillText: () => {},
    } as unknown as CanvasRenderingContext2D;
    ui.beginFrame();
    ui.setPointer(15, 15, false);
    ui.setPointer(15, 15, true);
    const clicked = ui.button(ctx, "b1", { x: 0, y: 0, w: 40, h: 40 }, "OK");
    expect(clicked).toBe(true);
  });
});

describe("input rebind", () => {
  it("rebinds a key", () => {
    const input = new InputMap();
    input.installDefaults();
    input.beginRebind("shoot");
    expect(input.isRebinding()).toBe(true);
    input.handleKey("KeyQ", true);
    expect(input.isRebinding()).toBe(false);
    const b = input.exportBindings();
    expect(b.keys["KeyQ"]).toContain("shoot");
  });
});

describe("platform packaging", () => {
  it("builds serializable manifest for @anvil/desktop", () => {
    const m = createPackageManifest({ id: "g", title: "G" });
    expect(m.webDist).toBe("dist-web");
    expect(serializeManifest(m)).toContain("\"id\": \"g\"");
  });
});
