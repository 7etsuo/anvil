import { describe, expect, it } from "vitest";
import { ProjectileSystem } from "./combat/ProjectileSystem.js";
import { ThreatTable } from "./combat/ThreatTable.js";
import { rollEliteAffixes } from "./combat/EliteAffixes.js";
import { DeathSystem } from "./combat/DeathSystem.js";
import { ResourcePool, DEFAULT_RESOURCES } from "./rpg/ResourcePool.js";
import { SkillTree, SAMPLE_COMBAT_TREE } from "./rpg/SkillTree.js";
import { Wallet } from "./rpg/Wallet.js";
import { InteractableSystem } from "./world/Interactables.js";
import { TriggerSystem } from "./world/Triggers.js";
import { MinimapFog } from "./world/MinimapFog.js";
import { hasLineOfSight, coverLevel } from "./world/LineOfSight.js";
import { Vendor } from "./economy/Vendor.js";
import { CraftingSystem, reforgeStats, socketGem } from "./economy/Crafting.js";
import { FloatTextSystem } from "./fx/FloatText.js";
import { ScreenTransition } from "./fx/ScreenTransition.js";
import { spatialVolume } from "./audio/SpatialAudio.js";
import { sheetFrames, tickAnimClip } from "./assets/SpriteAtlas.js";
import {
  InputPredictor,
  makeTopdownMoveFn,
} from "./net/InputPrediction.js";

describe("ProjectileSystem", () => {
  it("moves and hits with pierce", () => {
    const ps = new ProjectileSystem();
    ps.setHitQuery(() => [{ id: "e1", x: 50, y: 0, team: "enemy" }]);
    const hits: string[] = [];
    ps.setHitHandler((e) => hits.push(e.targetId));
    ps.spawn({ x: 0, y: 0, vx: 100, vy: 0, damage: 5, pierce: 1, lifeMs: 2000 });
    ps.update(0.6);
    expect(hits).toContain("e1");
    expect(ps.all().length).toBe(1); // pierced, still alive
  });
});

describe("ThreatTable", () => {
  it("tracks top aggro", () => {
    const t = new ThreatTable();
    t.add("boss", "p1", 10);
    t.add("boss", "p2", 30);
    t.add("boss", "p1", 5);
    expect(t.topId("boss")).toBe("p2");
  });
});

describe("EliteAffixes", () => {
  it("rolls without replacement", () => {
    const r = rollEliteAffixes(2, () => 0.5);
    expect(r.affixes.length).toBe(2);
    const stats = r.applyToStats({ maxHp: 100, damage: 10, speed: 100 });
    expect(stats.maxHp).toBeGreaterThan(0);
  });
});

describe("DeathSystem", () => {
  it("dying → corpse → removed", () => {
    const d = new DeathSystem({ dyingMs: 100, corpseMs: 100 });
    d.markDead("m1", { x: 0, y: 0 });
    expect(d.tick(100).some((e) => e.type === "corpse")).toBe(true);
    expect(d.tick(100).some((e) => e.type === "removed")).toBe(true);
  });
});

describe("ResourcePool", () => {
  it("spend and regen", () => {
    const r = new ResourcePool();
    r.registerAll(DEFAULT_RESOURCES);
    r.attach("player");
    expect(r.spend("player", "mana", 10)).toBe(true);
    expect(r.get("player", "mana")!.current).toBe(40);
    r.tick(2000);
    expect(r.get("player", "mana")!.current).toBeGreaterThan(40);
  });
});

describe("SkillTree", () => {
  it("enforces prereqs", () => {
    const t = new SkillTree(SAMPLE_COMBAT_TREE);
    expect(t.unlock("whirlwind")).toBe(false);
    expect(t.unlock("power")).toBe(true);
    t.addPoints(1);
    expect(t.unlock("whirlwind", 3)).toBe(true);
  });

  it("reports currently unlockable nodes and completion", () => {
    const t = new SkillTree({
      id: "small",
      startPoints: 2,
      nodes: [
        { id: "first", name: "First" },
        { id: "second", name: "Second", requires: ["first"] },
      ],
    });
    expect(t.unlockable().map((node) => node.id)).toEqual(["first"]);
    expect(t.isComplete()).toBe(false);
    expect(t.unlock("first")).toBe(true);
    expect(t.unlockable().map((node) => node.id)).toEqual(["second"]);
    expect(t.unlock("second")).toBe(true);
    expect(t.isComplete()).toBe(true);
  });
});

describe("Wallet", () => {
  it("multi-currency afford", () => {
    const w = new Wallet({ gold: 100, shards: 2 });
    expect(w.canAfford({ gold: 50, shards: 1 })).toBe(true);
    expect(w.spendMany({ gold: 50, shards: 1 })).toBe(true);
    expect(w.get("gold")).toBe(50);
  });
});

describe("Interactables + Triggers", () => {
  it("opens chest once", () => {
    const i = new InteractableSystem();
    i.register({ id: "c1", kind: "chest", x: 0, y: 0, once: true });
    expect(i.interact("c1").ok).toBe(true);
    expect(i.interact("c1").ok).toBe(false);
  });

  it("enter exit volumes", () => {
    const t = new TriggerSystem();
    t.register({ id: "z", x: 0, y: 0, w: 10, h: 10 });
    const e1 = t.update({ p: { x: 5, y: 5 } });
    expect(e1.some((x) => x.type === "enter")).toBe(true);
    const e2 = t.update({ p: { x: 50, y: 50 } });
    expect(e2.some((x) => x.type === "exit")).toBe(true);
  });
});

describe("MinimapFog + LOS", () => {
  it("reveals cells", () => {
    const f = new MinimapFog({ width: 20, height: 20, cellSize: 10 });
    f.reveal(50, 50, 25);
    expect(f.isVisible(5, 5)).toBe(true);
  });

  it("blocks LOS through walls", () => {
    const grid = {
      width: 10,
      height: 10,
      blocked: (x: number, y: number) => x === 5 && y === 0,
    };
    expect(hasLineOfSight(grid, 0, 0, 9, 0)).toBe(false);
    expect(hasLineOfSight(grid, 0, 0, 4, 0)).toBe(true);
    expect(coverLevel(grid, 0, 0, 9, 0)).not.toBe("none");
  });
});

describe("Vendor + Crafting", () => {
  it("buys with wallet", () => {
    const v = new Vendor({
      id: "shop",
      offers: [
        { id: "potion", itemId: "health_potion", price: { gold: 25 }, stock: 2 },
      ],
    });
    const w = new Wallet({ gold: 100 });
    const grants: string[] = [];
    const r = v.buy("potion", w, {
      grant: (id) => {
        grants.push(id);
        return true;
      },
    });
    expect(r.ok).toBe(true);
    expect(w.get("gold")).toBe(75);
    expect(grants).toEqual(["health_potion"]);
  });

  it("crafts and sockets", () => {
    const bags: Record<string, number> = { iron: 2, wood: 1 };
    const inv = {
      countDef: (id: string) => bags[id] ?? 0,
      removeDef: (id: string, q: number) => {
        if ((bags[id] ?? 0) < q) return false;
        bags[id]! -= q;
        return true;
      },
      addDef: (id: string, q: number) => {
        bags[id] = (bags[id] ?? 0) + q;
        return true;
      },
    };
    const c = new CraftingSystem();
    c.register({
      id: "sword",
      inputs: [
        { itemId: "iron", qty: 2 },
        { itemId: "wood", qty: 1 },
      ],
      outputId: "rusty_sword",
    });
    expect(c.craft("sword", inv).ok).toBe(true);
    expect(bags.rusty_sword).toBe(1);

    const sock = socketGem(
      { uid: "1", defId: "sword", qty: 1, data: {} },
      0,
      "ruby",
    );
    expect(sock.ok).toBe(true);

    const ref = reforgeStats(
      { uid: "1", defId: "s", qty: 1, rolledStats: { damage: 10 } },
      () => 0.5,
    );
    expect(ref.ok).toBe(true);
  });
});

describe("FloatText + Transition + Spatial + Atlas + Prediction", () => {
  it("float text decays", () => {
    const f = new FloatTextSystem();
    f.damage(0, 0, 12, true);
    f.update(1);
    expect(f.all().length).toBe(0);
  });

  it("transition reaches mid", () => {
    let mid = false;
    const s = new ScreenTransition();
    s.start({ outMs: 50, holdMs: 10, inMs: 50, onMid: () => (mid = true) });
    s.update(0.06);
    s.update(0.02);
    expect(mid).toBe(true);
  });

  it("spatial volume falls off", () => {
    const v = spatialVolume({ x: 0, y: 0 }, { x: 500, y: 0 }, {
      minDistance: 10,
      maxDistance: 400,
    });
    expect(v).toBe(0);
  });

  it("sheet frames and anim tick", () => {
    const frames = sheetFrames({
      image: "a.png",
      frameWidth: 16,
      frameHeight: 16,
      columns: 2,
      rows: 2,
    });
    expect(frames.length).toBe(4);
    const t = tickAnimClip(
      { name: "walk", frames: [0, 1, 2], frameMs: 100, loop: true },
      { frame: 0, accMs: 0 },
      150,
    );
    expect(t.frame).toBe(1);
  });

  it("predicts and reconciles", () => {
    const p = new InputPredictor(makeTopdownMoveFn(100), { x: 0, y: 0 });
    p.sample({ move_right: true }, 0.1);
    expect(p.getPose().x).toBeGreaterThan(0);
    p.reconcile({ x: 0, y: 0, seq: 0 }, 0.1);
    expect(p.pendingCount()).toBeGreaterThan(0);
  });
});
