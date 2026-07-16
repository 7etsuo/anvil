import { describe, expect, it } from "vitest";
import {
  ERROR_CODES,
  ERROR_CODE_DOCS,
  EXIT,
  err,
  isErrorCode,
  type ErrorCode,
} from "./errors.js";

describe("ErrorCode catalog (S-ERRORS exhaustive)", () => {
  it("has exactly the documented engine and authoring codes", () => {
    expect(ERROR_CODES).toEqual([
      "SCHEMA_INVALID",
      "SCHEMA_VERSION_UNSUPPORTED",
      "MIGRATION_REQUIRED",
      "INTENT_INVALID",
      "COMPILE_FAILED",
      "PREFAB_CYCLE",
      "PREFAB_CONFLICT",
      "REF_MISSING",
      "ASSET_MISSING",
      "MODULE_UNKNOWN",
      "GENRE_MISMATCH",
      "LAUNCH_FAIL",
      "TEST_FAIL",
      "TEST_TIMEOUT",
      "IO_ERROR",
      "INVALID_ARGS",
      "NOT_IMPLEMENTED",
      "INTERNAL",
    ]);
    expect(ERROR_CODES).toHaveLength(18);
  });

  it("documents every code", () => {
    for (const code of ERROR_CODES) {
      expect(ERROR_CODE_DOCS[code].length).toBeGreaterThan(0);
    }
  });

  it("isErrorCode accepts only catalog members", () => {
    expect(isErrorCode("SCHEMA_INVALID")).toBe(true);
    expect(isErrorCode("NOPE")).toBe(false);
  });

  it("err() builds AnvilError shape for every code", () => {
    for (const code of ERROR_CODES) {
      const e = err(code, `msg-${code}`, {
        path: "p",
        hint: "h",
        example: { code },
      });
      expect(e).toEqual({
        code,
        message: `msg-${code}`,
        path: "p",
        hint: "h",
        example: { code },
        fingerprint: e.fingerprint,
      });
      expect(e.fingerprint).toMatch(/^anvil-[0-9a-f]{8}$/);
    }
  });

  it("EXIT codes match S-ERRORS", () => {
    expect(EXIT.OK).toBe(0);
    expect(EXIT.FAIL).toBe(1);
    expect(EXIT.USAGE).toBe(2);
    expect(EXIT.INTERNAL).toBe(3);
  });

  it("type-level ErrorCode union stays in sync with ERROR_CODES", () => {
    // If a code is added to the type but not ERROR_CODES, this map fails to compile
    // when `satisfies` is used on ERROR_CODE_DOCS; runtime check:
    const keys = Object.keys(ERROR_CODE_DOCS) as ErrorCode[];
    expect(new Set(keys)).toEqual(new Set(ERROR_CODES));
  });
});
