import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ERROR_CODES, isErrorCode } from "@anvil/schema";
import { createGame } from "./createGame.js";
import { runTests } from "./test/runTests.js";
import { validateProject } from "./validate.js";

function tmpDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

describe("error codes produced by runtime (S-ERRORS coverage)", () => {
  it("IO_ERROR when root missing", async () => {
    const r = await validateProject(path.join(os.tmpdir(), "anvil-no-such-root"));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors[0]!.code).toBe("IO_ERROR");
      expect(isErrorCode(r.errors[0]!.code)).toBe(true);
    }
  });

  it("IO_ERROR when game.yaml missing", async () => {
    const d = tmpDir("anvil-no-yaml-");
    const r = await validateProject(d);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0]!.code).toBe("IO_ERROR");
    fs.rmSync(d, { recursive: true, force: true });
  });

  it("SCHEMA_INVALID on bad game.yaml", async () => {
    const d = tmpDir("anvil-bad-schema-");
    fs.writeFileSync(path.join(d, "game.yaml"), "id: BAD\ntitle: x\ngenre: nope\n");
    const r = await validateProject(d);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.some((e) => e.code === "SCHEMA_INVALID")).toBe(true);
    }
    fs.rmSync(d, { recursive: true, force: true });
  });

  it("MODULE_UNKNOWN for garbage module id", async () => {
    const d = tmpDir("anvil-mod-");
    fs.writeFileSync(
      path.join(d, "game.yaml"),
      `id: t
title: T
genre: none
modules: [not-a-real-module]
entryScene: main
schemaVersion: 1
`,
    );
    const r = await validateProject(d);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.some((e) => e.code === "MODULE_UNKNOWN")).toBe(true);
    }
    fs.rmSync(d, { recursive: true, force: true });
  });

  it("LAUNCH_FAIL for unknown entryScene", async () => {
    const d = tmpDir("anvil-launch-");
    fs.writeFileSync(
      path.join(d, "game.yaml"),
      `id: t
title: T
genre: none
modules: []
entryScene: does_not_exist
schemaVersion: 1
`,
    );
    await expect(
      createGame({ root: d, headless: true }),
    ).rejects.toMatchObject({
      anvilError: { code: "LAUNCH_FAIL" },
    });
    fs.rmSync(d, { recursive: true, force: true });
  });

  it("TEST_FAIL on assertion", async () => {
    const d = tmpDir("anvil-test-fail-");
    fs.writeFileSync(
      path.join(d, "game.yaml"),
      `id: t
title: T
genre: none
modules: []
entryScene: main
seed: 1
schemaVersion: 1
`,
    );
    fs.mkdirSync(path.join(d, "tests"));
    fs.writeFileSync(
      path.join(d, "tests", "fail.json"),
      JSON.stringify({
        id: "fail",
        seed: 1,
        maxTicks: 5,
        steps: [{ tick: 0, assert: { path: "tick", eq: 999 } }],
      }),
    );
    const report = await runTests(d);
    expect(report.ok).toBe(false);
    expect(report.results[0]!.error?.code).toBe("TEST_FAIL");
    fs.rmSync(d, { recursive: true, force: true });
  });

  it("TEST_TIMEOUT when steps never complete", async () => {
    const d = tmpDir("anvil-test-to-");
    fs.writeFileSync(
      path.join(d, "game.yaml"),
      `id: t
title: T
genre: none
modules: []
entryScene: main
seed: 1
schemaVersion: 1
`,
    );
    fs.mkdirSync(path.join(d, "tests"));
    fs.writeFileSync(
      path.join(d, "tests", "timeout.json"),
      JSON.stringify({
        id: "timeout",
        seed: 1,
        maxTicks: 2,
        steps: [{ tick: 100, assert: { path: "tick", gte: 0 } }],
      }),
    );
    const report = await runTests(d);
    expect(report.ok).toBe(false);
    expect(report.results[0]!.error?.code).toBe("TEST_TIMEOUT");
    fs.rmSync(d, { recursive: true, force: true });
  });

  it("catalog includes the engine and authoring diagnostics", () => {
    expect(ERROR_CODES).toHaveLength(18);
  });
});
