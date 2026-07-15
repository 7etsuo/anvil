/** Error codes — authoritative for v1 (S-ERRORS). */
export type ErrorCode =
  | "SCHEMA_INVALID"
  | "REF_MISSING"
  | "ASSET_MISSING"
  | "MODULE_UNKNOWN"
  | "GENRE_MISMATCH"
  | "LAUNCH_FAIL"
  | "TEST_FAIL"
  | "TEST_TIMEOUT"
  | "IO_ERROR"
  | "INVALID_ARGS"
  | "NOT_IMPLEMENTED"
  | "INTERNAL";

/** Exhaustive list (order stable for docs/tests). */
export const ERROR_CODES: readonly ErrorCode[] = [
  "SCHEMA_INVALID",
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
] as const;

/** Human-facing one-liner per code (S-ERRORS). */
export const ERROR_CODE_DOCS: Record<ErrorCode, string> = {
  SCHEMA_INVALID: "Zod/schema fail",
  REF_MISSING: "content references unknown id",
  ASSET_MISSING: "path missing (strict mode)",
  MODULE_UNKNOWN: "game.yaml module not installed",
  GENRE_MISMATCH: "content type vs genre",
  LAUNCH_FAIL: "cannot enter entryScene",
  TEST_FAIL: "assertion failed",
  TEST_TIMEOUT: "scenario exceeded max ticks",
  IO_ERROR: "filesystem read/write",
  INVALID_ARGS: "CLI args",
  NOT_IMPLEMENTED: "net/etc stub",
  INTERNAL: "bug",
};

export function isErrorCode(v: string): v is ErrorCode {
  return (ERROR_CODES as readonly string[]).includes(v);
}

export interface AnvilError {
  code: ErrorCode;
  message: string;
  path?: string;
  hint?: string;
  example?: unknown;
}

export type ValidationResult =
  | { ok: true; warnings?: AnvilError[] }
  | { ok: false; errors: AnvilError[] };

export function err(
  code: ErrorCode,
  message: string,
  extra?: Partial<Omit<AnvilError, "code" | "message">>,
): AnvilError {
  return { code, message, ...extra };
}

/** CLI exit codes (S-ERRORS). */
export const EXIT = {
  OK: 0,
  FAIL: 1,
  USAGE: 2,
  INTERNAL: 3,
} as const;
