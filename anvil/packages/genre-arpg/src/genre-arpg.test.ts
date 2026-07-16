import { describe, expect, it } from "vitest";
import type { ArpgCompiledIr } from "./content.js";
import { materializeArpgContent } from "./content.js";
import { ArpgRuleRuntime } from "./RuleRuntime.js";

describe("materializeArpgContent", () => {
  it("resolves prefab actor components beneath authored overrides", () => {
    const ir = {
      sourceHash: "abc",
      traits: {},
      prefabs: {
        minion: { id: "minion", traits: ["enemy", "melee"], components: { actor: { hp: 10, speed: 50, team: "enemy", ai: "chase_melee" } } },
      },
      triggers: {},
      machines: {},
      content: {
        "actors/brute.json": { id: "brute", prefab: "minion", hp: 25 },
        "areas/room.json": { id: "room", width: 10, height: 10 },
        "progression.json": { maxLevel: 100 },
      },
    } satisfies ArpgCompiledIr;
    const content = materializeArpgContent(ir);
    expect(content.actors.brute).toMatchObject({ hp: 25, speed: 50, team: "enemy", traits: ["enemy", "melee"] });
    expect(content.authoring.actorPrefabs.brute).toBe("minion");
    expect(content.sourceHash).toBe("abc");
  });

  it("rejects missing actor prefabs with source evidence", () => {
    const ir = { sourceHash: "x", traits: {}, prefabs: {}, triggers: {}, machines: {}, content: { "actors/lost.json": { id: "lost", prefab: "missing" } } } satisfies ArpgCompiledIr;
    expect(() => materializeArpgContent(ir)).toThrow(/unknown prefab 'missing'.*actors\/lost.json/);
  });
});

describe("ArpgRuleRuntime", () => {
  it("executes events, counters, once semantics, and deterministic state transitions", () => {
    const emitted: string[] = [];
    const runtime = new ArpgRuleRuntime({
      count: {
        id: "count",
        when: { op: "event", name: "enemy.killed" },
        then: [
          { op: "add_counter", key: "kills", amount: 1 },
          { op: "emit", event: "campaign.progress", data: {} },
        ],
        once: false,
        cooldownMs: 0,
      },
      boss: {
        id: "boss",
        when: { op: "event", name: "boss.killed" },
        then: [{ op: "set_flag", key: "boss_slain", value: true }],
        once: true,
        cooldownMs: 0,
      },
    }, {
      campaign: {
        id: "campaign",
        initial: "hunt",
        states: [
          { id: "hunt", enter: [], exit: [], transitions: [{ to: "endless", when: { op: "flag", key: "boss_slain", eq: true }, effects: [] }] },
          { id: "endless", enter: [{ op: "emit", event: "campaign.endless", data: {} }], exit: [], transitions: [] },
        ],
      },
    });
    const context = { emit: (event: string) => emitted.push(event) };
    runtime.dispatch("enemy.killed", { actorId: "slime" }, context);
    runtime.dispatch("boss.killed", { actorId: "lord" }, context);
    runtime.dispatch("boss.killed", { actorId: "lord" }, context);
    expect(runtime.snapshot()).toMatchObject({
      flags: { boss_slain: true },
      counters: { kills: 1 },
      machines: { campaign: "endless" },
      transitions: ["campaign:hunt->endless"],
      lastEvent: { name: "boss.killed" },
    });
    expect(emitted).toEqual(["campaign.progress", "campaign.endless"]);
  });

  it("uses logical time for cooldowns", () => {
    const runtime = new ArpgRuleRuntime({ pulse: { id: "pulse", when: { op: "event", name: "pulse" }, then: [{ op: "add_counter", key: "pulses", amount: 1 }], once: false, cooldownMs: 100 } });
    runtime.dispatch("pulse");
    runtime.dispatch("pulse");
    runtime.update(100);
    runtime.dispatch("pulse");
    expect(runtime.counter("pulses")).toBe(2);
  });
});
