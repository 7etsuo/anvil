import { describe, expect, it } from "vitest";
import { EventBus } from "../events/EventBus.js";
import { AssetServer } from "../assets/AssetServer.js";
import { AudioSystem } from "../audio/AudioSystem.js";
import { wireCombatAudio } from "../audio/wireCombatAudio.js";
import { emitHeal, emitHit, emitKill } from "./CombatEvents.js";
import {
  getResist,
  mitigateDamage,
  resolveDamage,
  type DamageType,
} from "./Damage.js";
import { BUILTIN_STATUS_DEFS, StatusSystem } from "./StatusSystem.js";

describe("Damage types + resists", () => {
  it("applies armor only to physical", () => {
    const phys = mitigateDamage({ raw: 100, type: "physical", armor: 100 });
    expect(phys.final).toBeLessThan(100);
    const fire = mitigateDamage({ raw: 100, type: "fire", armor: 100 });
    expect(fire.final).toBe(100); // no resist
  });

  it("applies type resist after armor", () => {
    const r = mitigateDamage({
      raw: 100,
      type: "fire",
      resists: { resistFire: 0.5 },
    });
    expect(r.final).toBe(50);
    expect(r.mitigated).toBe(50);
  });

  it("caps resist", () => {
    const r = mitigateDamage({
      raw: 100,
      type: "cold",
      resists: { cold: 0.99 },
    });
    // 90% hard cap → ~10 remaining (floor)
    expect(r.final).toBeGreaterThanOrEqual(9);
    expect(r.final).toBeLessThanOrEqual(10);
    expect(r.mitigated).toBeGreaterThanOrEqual(90);
  });

  it("resolveDamage uses defender stats", () => {
    const r = resolveDamage(
      { raw: 50, type: "lightning", crit: true },
      { stats: { armor: 0, resistLightning: 0.2 } },
    );
    expect(r.final).toBe(40);
    expect(r.crit).toBe(true);
  });

  it("getResist reads map or stat key", () => {
    expect(getResist({ fire: 0.3 }, "fire")).toBe(0.3);
    expect(getResist({ resistPoison: 0.25 }, "poison")).toBe(0.25);
    expect(getResist({}, "holy" as DamageType)).toBe(0);
  });
});

describe("StatusSystem", () => {
  it("applies refresh and stack modes", () => {
    const s = new StatusSystem();
    s.registerAll(BUILTIN_STATUS_DEFS);
    expect(s.apply("e1", "chill")).toBe(true);
    expect(s.has("e1", "chill")).toBe(true);
    s.apply("e1", "chill"); // refresh
    expect(s.getActive("e1")[0]!.stacks).toBe(1);

    s.apply("e1", "poison");
    s.apply("e1", "poison");
    expect(s.getActive("e1").find((x) => x.defId === "poison")!.stacks).toBe(2);
  });

  it("aggregates stat mods and stun flag", () => {
    const s = new StatusSystem();
    s.registerAll(BUILTIN_STATUS_DEFS);
    s.apply("p", "chill");
    s.apply("p", "stun");
    const mods = s.aggregateMods("p");
    expect(mods.speed).toBe(-40);
    expect(s.isStunned("p")).toBe(true);
  });

  it("ticks DoT and expires", () => {
    const s = new StatusSystem();
    s.register({
      id: "dot_test",
      durationMs: 1000,
      tickDamage: 5,
      tickIntervalMs: 200,
      damageType: "fire",
    });
    s.apply("mob", "dot_test");
    const { ticks } = s.tick(450);
    expect(ticks.length).toBe(2);
    expect(ticks[0]!.amount).toBe(5);

    s.tick(600);
    expect(s.has("mob", "dot_test")).toBe(false);
  });
});

describe("wireCombatAudio", () => {
  it("plays cues on combat events", () => {
    const events = new EventBus();
    const assets = new AssetServer("/tmp", "assets", false);
    const audio = new AudioSystem(assets, events);
    audio.setCues({
      hit: "audio/sfx/combat/hit_01.ogg",
      hit_alt: "audio/sfx/combat/hit_02.ogg",
      swing: "audio/sfx/combat/rpg_battle_swing.wav",
      explosion: "audio/sfx/combat/explosion.ogg",
      ui_confirm: "audio/sfx/ui/confirmation_001.ogg",
    });
    const played: string[] = [];
    const orig = audio.play.bind(audio);
    audio.play = (cue, ch) => {
      played.push(cue);
      orig(cue, ch);
    };

    const off = wireCombatAudio(events, audio);
    emitHit(events, {
      targetId: "e",
      damage: 10,
      x: 0,
      y: 0,
    });
    emitHit(events, {
      targetId: "e",
      damage: 20,
      x: 0,
      y: 0,
      crit: true,
    });
    emitKill(events, { targetId: "e", x: 0, y: 0 });
    emitHeal(events, { targetId: "p", amount: 5, x: 0, y: 0 });
    events.emit("ui:click", {});
    off();

    expect(played).toContain("hit");
    expect(played).toContain("swing"); // crit maps to swing by default
    expect(played).toContain("explosion");
    expect(played).toContain("ui_confirm");
  });
});
