import { describe, expect, it } from "vitest";
import { InputMap } from "@anvil/core";
import { castRay } from "./dda.js";
import { Fps2Sim } from "./Fps2Sim.js";
import type { Fps2LevelDef, Fps2MapDef } from "./types.js";

/** Simple corridor: open cells in middle row, walls around */
const corridor: Fps2MapDef = {
  id: "corridor",
  cells: [
    [1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1],
  ],
  playerStart: { x: 1.5, y: 2.5, angle: 0 },
  enemies: [{ id: "grunt", x: 5.5, y: 2.5, hp: 2 }],
  exit: { x: 6.5, y: 2.5, radius: 0.5 },
};

const level: Fps2LevelDef = {
  id: "lv1",
  map: "corridor",
  moveSpeed: 4,
  turnSpeed: 3,
  weaponDamage: 1,
  weaponMaxDist: 20,
  aimConeRad: 0.2,
  fireCooldownMs: 50,
};

function idle(): InputMap {
  const i = new InputMap();
  i.installDefaults();
  return i;
}

describe("castRay DDA", () => {
  it("hits wall east of player", () => {
    const hit = castRay(corridor.cells, 1.5, 2.5, 0);
    expect(hit).not.toBeNull();
    expect(hit!.dist).toBeGreaterThan(0);
    expect(hit!.mapX).toBe(7);
  });

  it("hits wall when looking into north wall", () => {
    const hit = castRay(corridor.cells, 1.5, 2.5, -Math.PI / 2);
    expect(hit).not.toBeNull();
    expect(hit!.mapY).toBe(0);
  });
});

describe("Fps2Sim", () => {
  it("wall blocks movement", () => {
    const sim = new Fps2Sim(corridor, level);
    const input = idle();
    // face west into wall at x=0
    sim.angle = Math.PI;
    input.setDown("move_forward", true);
    for (let i = 0; i < 60; i++) sim.update(1 / 60, input);
    // should not enter wall cell x=0
    expect(sim.x).toBeGreaterThan(1.0);
  });

  it("center ray hits wall (integration smoke)", () => {
    const sim = new Fps2Sim(corridor, level);
    sim.update(0, idle());
    const blob = sim.observeBlob();
    expect(blob.centerRay).not.toBeNull();
    expect((blob.centerRay as { dist: number }).dist).toBeGreaterThan(0);
    expect(blob.columnCount).toBe(80);
  });

  it("shoot damages enemy in front", () => {
    const sim = new Fps2Sim(corridor, level);
    // face east toward grunt at 5.5
    sim.angle = 0;
    const before = (sim.observeBlob().billboards as { hp: number }[])[0]!.hp;
    sim.shoot();
    const after = (sim.observeBlob().billboards as { hp: number }[])[0]!.hp;
    expect(after).toBeLessThan(before);
    expect(sim.observeBlob().lastShotHit).toBe("grunt");
  });

  it("two shots can kill enemy", () => {
    const sim = new Fps2Sim(corridor, { ...level, weaponDamage: 1 });
    sim.angle = 0;
    sim.shoot();
    sim.shoot();
    const b = (sim.observeBlob().billboards as { dead: boolean }[])[0]!;
    expect(b.dead).toBe(true);
    expect(sim.observeBlob().enemyCount).toBe(0);
  });

  it("billboards include angleDiff", () => {
    const sim = new Fps2Sim(corridor, level);
    const bbs = sim.getBillboards();
    expect(bbs.length).toBe(1);
    expect(Math.abs(bbs[0]!.angleDiff)).toBeLessThan(0.5);
  });
});
