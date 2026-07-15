import fs from "node:fs";
import path from "node:path";
import { createGame, type GameHandle } from "../createGame.js";
import type { GenreModule } from "../modules/ModuleRegistry.js";
import { observe } from "../observe.js";

export interface TestOpts {
  seed?: number;
  strictAssets?: boolean;
  modules?: GenreModule[];
}

export interface TestDiagnosis {
  /** One-line world state at failure */
  summary: string;
  /** Assert path + actual value */
  path?: string;
  actual?: unknown;
  /** Agent-oriented next step */
  hint: string;
  /** Compact entity list (id, tags, hp) */
  entities?: Array<{ id: string; tags: string[]; hp?: number }>;
}

export interface TestReport {
  ok: boolean;
  results: Array<{
    id: string;
    pass: boolean;
    ticks?: number;
    error?: { code: string; message: string; path?: string };
    /** Present on failure — agents should read this before raw dumps */
    diagnosis?: TestDiagnosis;
  }>;
}

interface Assertion {
  path: string;
  eq?: unknown;
  neq?: unknown;
  exists?: boolean;
  gt?: number;
  lt?: number;
  gte?: number;
  lte?: number;
}

interface TestStep {
  tick: number;
  setDown?: Record<string, boolean>;
  setUp?: string[];
  action?: string;
  args?: Record<string, unknown>;
  assert?: Assertion;
  wait?: number;
}

interface TestScenario {
  id: string;
  seed?: number;
  maxTicks?: number;
  strictAssets?: boolean;
  steps: TestStep[];
}

export async function runTests(
  root: string,
  opts: TestOpts = {},
): Promise<TestReport> {
  const abs = path.resolve(root);
  const testsDir = path.join(abs, "tests");
  const files = collectJsonTests(testsDir);
  const results: TestReport["results"] = [];

  if (files.length === 0) {
    // smoke: launch only
    try {
      const handle = await createGame({
        root: abs,
        headless: true,
        seed: opts.seed,
        modules: opts.modules,
      });
      handle.tick(1 / 60);
      handle.dispose();
      results.push({ id: "_launch_smoke", pass: true, ticks: 1 });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      results.push({
        id: "_launch_smoke",
        pass: false,
        error: { code: "LAUNCH_FAIL", message: msg },
      });
    }
    return { ok: results.every((r) => r.pass), results };
  }

  for (const file of files) {
    const scenario = JSON.parse(fs.readFileSync(file, "utf8")) as TestScenario;
    const r = await runScenario(abs, scenario, opts);
    results.push(r);
  }

  return { ok: results.every((r) => r.pass), results };
}

async function runScenario(
  root: string,
  scenario: TestScenario,
  opts: TestOpts,
): Promise<TestReport["results"][0]> {
  const maxTicks = scenario.maxTicks ?? 10000;
  let handle: GameHandle;
  try {
    handle = await createGame({
      root,
      headless: true,
      seed: opts.seed ?? scenario.seed,
      modules: opts.modules,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      id: scenario.id,
      pass: false,
      error: { code: "LAUNCH_FAIL", message: msg },
    };
  }

  try {
    const steps = [...scenario.steps].sort((a, b) => a.tick - b.tick);
    let stepIdx = 0;
    let tick = 0;

    while (tick <= maxTicks) {
      while (stepIdx < steps.length && steps[stepIdx]!.tick === tick) {
        const step = steps[stepIdx]!;
        applyStep(handle, step);
        if (step.assert) {
          const snap = await observe(handle);
          const check = checkAssert(snap, step.assert);
          if (!check.ok) {
            const diagnosis = buildDiagnosis(snap, step.assert, check.message);
            handle.dispose();
            return {
              id: scenario.id,
              pass: false,
              ticks: tick,
              error: {
                code: "TEST_FAIL",
                message: check.message,
                path: step.assert.path,
              },
              diagnosis,
            };
          }
        }
        stepIdx++;
      }
      if (stepIdx >= steps.length) break;
      handle.tick(1 / 60);
      tick = handle.getTick();
    }

    if (stepIdx < steps.length) {
      const snap = await observe(handle);
      const diagnosis: TestDiagnosis = {
        summary: snap.summary,
        hint: `Scenario timed out at tick ${tick} with steps remaining. Raise maxTicks or fix stuck state. See summary.`,
        entities: snap.entities.slice(0, 24).map((e) => ({
          id: e.id,
          tags: e.tags,
          hp: e.hp,
        })),
      };
      handle.dispose();
      return {
        id: scenario.id,
        pass: false,
        ticks: tick,
        error: {
          code: "TEST_TIMEOUT",
          message: `Exceeded maxTicks=${maxTicks}`,
        },
        diagnosis,
      };
    }

    if (opts.strictAssets || scenario.strictAssets) {
      const missing = handle.assets.missing();
      if (missing.length) {
        handle.dispose();
        return {
          id: scenario.id,
          pass: false,
          error: {
            code: "ASSET_MISSING",
            message: missing.join(", "),
          },
        };
      }
    }

    handle.dispose();
    return { id: scenario.id, pass: true, ticks: tick };
  } catch (e) {
    handle.dispose();
    return {
      id: scenario.id,
      pass: false,
      error: {
        code: "INTERNAL",
        message: e instanceof Error ? e.message : String(e),
      },
    };
  }
}

function applyStep(handle: GameHandle, step: TestStep): void {
  if (step.setDown) {
    for (const [a, v] of Object.entries(step.setDown)) {
      handle.input.setDown(a, v);
    }
  }
  if (step.setUp) {
    for (const a of step.setUp) handle.input.setDown(a, false);
  }
  // Pulse actions: release then press so isPressed edges fire every time
  const pulse = (action: string) => {
    handle.input.setDown(action, false);
    handle.input.endFrame();
    handle.input.setDown(action, true);
  };
  if (step.action === "play_card") {
    const slot = Number(step.args?.slot ?? 0);
    pulse(`play_card_${slot}`);
  } else if (step.action === "end_turn") {
    pulse("end_turn");
  } else if (step.action) {
    pulse(step.action);
  }
  if (step.wait && step.wait > 0) {
    for (let i = 0; i < step.wait; i++) handle.tick(1 / 60);
  }
}

function buildDiagnosis(
  snap: Awaited<ReturnType<typeof observe>>,
  assertion: Assertion,
  message: string,
): TestDiagnosis {
  const actual = getPath(snap, assertion.path);
  let hint = `Assertion failed on '${assertion.path}'. ${message}. Fix content/logic so the path matches, then re-run anvil test.`;
  if (assertion.eq !== undefined) {
    hint = `Expected ${assertion.path} == ${JSON.stringify(assertion.eq)} but got ${JSON.stringify(actual)}. Adjust content or scenario steps; re-test.`;
  }
  if (assertion.gt !== undefined || assertion.lt !== undefined) {
    hint = `Numeric assert on ${assertion.path} failed (value=${JSON.stringify(actual)}). Check movement/combat timing or maxTicks.`;
  }
  return {
    summary: snap.summary,
    path: assertion.path,
    actual,
    hint,
    entities: snap.entities.slice(0, 24).map((e) => ({
      id: e.id,
      tags: e.tags,
      hp: e.hp,
    })),
  };
}

function checkAssert(
  snap: unknown,
  assertion: Assertion,
): { ok: boolean; message: string } {
  const value = getPath(snap, assertion.path);
  if (assertion.exists !== undefined) {
    const exists = value !== undefined && value !== null;
    if (exists !== assertion.exists) {
      return {
        ok: false,
        message: `exists expected ${assertion.exists}, got ${exists}`,
      };
    }
  }
  if (assertion.eq !== undefined && !deepEq(value, assertion.eq)) {
    return {
      ok: false,
      message: `eq expected ${JSON.stringify(assertion.eq)}, got ${JSON.stringify(value)}`,
    };
  }
  if (assertion.neq !== undefined && deepEq(value, assertion.neq)) {
    return { ok: false, message: `neq failed, both ${JSON.stringify(value)}` };
  }
  if (typeof value === "number") {
    if (assertion.gt !== undefined && !(value > assertion.gt))
      return { ok: false, message: `gt ${assertion.gt} failed (${value})` };
    if (assertion.lt !== undefined && !(value < assertion.lt))
      return { ok: false, message: `lt ${assertion.lt} failed (${value})` };
    if (assertion.gte !== undefined && !(value >= assertion.gte))
      return { ok: false, message: `gte ${assertion.gte} failed (${value})` };
    if (assertion.lte !== undefined && !(value <= assertion.lte))
      return { ok: false, message: `lte ${assertion.lte} failed (${value})` };
  }
  return { ok: true, message: "" };
}

function getPath(obj: unknown, pathStr: string): unknown {
  const parts = pathStr.split(".");
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur === null || cur === undefined) return undefined;
    if (typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

function deepEq(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function collectJsonTests(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  const walk = (d: string) => {
    for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, ent.name);
      if (ent.isDirectory()) walk(p);
      else if (ent.name.endsWith(".json")) out.push(p);
    }
  };
  walk(dir);
  return out.sort();
}

