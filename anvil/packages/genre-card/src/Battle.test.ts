import { describe, expect, it } from "vitest";
import { Battle, dealDamage, resetInstCounter } from "./Battle.js";
import type { BattleDef, CardDef, EnemyDef, Fighter } from "./types.js";

const cards: Record<string, CardDef> = {
  strike: {
    id: "strike",
    name: "Strike",
    cost: 1,
    effects: [{ op: "damage", amount: 6, target: "enemy" }],
  },
  defend: {
    id: "defend",
    name: "Defend",
    cost: 1,
    effects: [{ op: "block", amount: 5, target: "self" }],
  },
  bash: {
    id: "bash",
    name: "Bash",
    cost: 2,
    effects: [
      { op: "damage", amount: 8, target: "enemy" },
      { op: "apply_status", status: "vulnerable", amount: 2, target: "enemy" },
    ],
  },
};

const enemies: Record<string, EnemyDef> = {
  slime: {
    id: "slime",
    name: "Slime",
    hp: 20,
    intents: [{ kind: "attack", amount: 4 }],
  },
};

function fixedRng(): () => number {
  // always pick last element in shuffle (deterministic enough)
  return () => 0.99;
}

describe("Battle", () => {
  it("play strike reduces enemy hp", () => {
    resetInstCounter(1);
    const battleDef: BattleDef = {
      id: "b1",
      playerHp: 50,
      energyMax: 3,
      handSize: 5,
      deck: ["strike", "strike", "strike", "defend", "defend"],
      enemies: ["slime"],
    };
    const b = new Battle(battleDef, cards, enemies, fixedRng());
    b.setEnemyDefs(enemies);
    // force hand to have strike at 0
    const strikeInst = Object.entries(b.state.cardDefs).find(
      ([, d]) => d === "strike",
    )![0];
    b.state.hand = [strikeInst, ...b.state.hand.filter((h) => h !== strikeInst)];
    b.state.draw = b.state.draw.filter((h) => h !== strikeInst);
    const before = b.state.enemies[0]!.hp;
    expect(b.playSlot(0)).toBe(true);
    expect(b.state.enemies[0]!.hp).toBe(before - 6);
  });

  it("block absorbs damage", () => {
    const player: Fighter = {
      id: "player",
      hp: 50,
      maxHp: 50,
      block: 5,
      statuses: [],
      intentIndex: 0,
    };
    const enemy: Fighter = {
      id: "e",
      hp: 20,
      maxHp: 20,
      block: 0,
      statuses: [],
      intentIndex: 0,
    };
    dealDamage(enemy, player, 8);
    expect(player.block).toBe(0);
    expect(player.hp).toBe(47);
  });

  it("win when enemies dead", () => {
    resetInstCounter(1);
    const battleDef: BattleDef = {
      id: "b1",
      playerHp: 50,
      energyMax: 10,
      handSize: 5,
      deck: ["strike", "strike", "strike", "strike", "strike"],
      enemies: ["slime"],
    };
    const b = new Battle(battleDef, cards, enemies, fixedRng());
    b.setEnemyDefs(enemies);
    b.state.enemies[0]!.hp = 6;
    // put strike in hand
    const strikeInst = Object.entries(b.state.cardDefs).find(
      ([, d]) => d === "strike",
    )![0];
    b.state.hand = [strikeInst];
    b.state.energy = 10;
    b.playSlot(0);
    expect(b.state.won).toBe(true);
    expect(b.state.phase).toBe("win");
  });

  it("reshuffles discard into draw", () => {
    resetInstCounter(1);
    const battleDef: BattleDef = {
      id: "b1",
      playerHp: 50,
      energyMax: 3,
      handSize: 2,
      deck: ["strike", "defend"],
      enemies: ["slime"],
    };
    const b = new Battle(battleDef, cards, enemies, fixedRng());
    b.setEnemyDefs(enemies);
    // empty draw, put cards in discard, hand empty, force draw via play defend that draws? use draw effect
    // manually call private path via playing - simpler: set piles
    const all = [...b.state.hand, ...b.state.draw, ...b.state.discard];
    b.state.hand = [];
    b.state.draw = [];
    b.state.discard = all;
    // enter player turn draws handSize
    b.state.phase = "player_turn";
    // use endTurn -> enterPlayerTurn cycle
    b.state.energy = 0;
    // hack: call play that draws - add temporary card with draw
    // Direct: empty hand, discard full — play nothing; use endTurn after setting energy
    // Force draw by constructing new battle and exhausting draw
    expect(b.state.discard.length).toBeGreaterThan(0);
    // simulate drawCards by endTurn which enters player turn
    b.state.player.block = 0;
    // endTurn needs phase player_turn
    b.endTurn();
    // after enemy acts, enterPlayerTurn should reshuffle
    expect(b.state.hand.length + b.state.draw.length).toBeGreaterThan(0);
  });
});
