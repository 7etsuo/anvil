/** Error codes — authoritative catalog (S-ERRORS + S-AUTHORING). */
export type ErrorCode =
  | "SCHEMA_INVALID"
  | "SCHEMA_VERSION_UNSUPPORTED"
  | "MIGRATION_REQUIRED"
  | "INTENT_INVALID"
  | "COMPILE_FAILED"
  | "PREFAB_CYCLE"
  | "PREFAB_CONFLICT"
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
] as const;

/** Human-facing one-liner per code (S-ERRORS). */
export const ERROR_CODE_DOCS: Record<ErrorCode, string> = {
  SCHEMA_INVALID: "Zod/schema fail",
  SCHEMA_VERSION_UNSUPPORTED: "project schema is newer than this Anvil release",
  MIGRATION_REQUIRED: "legacy project must be migrated before authoring or launch",
  INTENT_INVALID: "game intent contract is missing or invalid",
  COMPILE_FAILED: "declarative authoring source cannot compile",
  PREFAB_CYCLE: "prefab inheritance contains a cycle",
  PREFAB_CONFLICT: "prefab traits have unmet requirements or conflicts",
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
  severity?: "error" | "warning" | "info";
  message: string;
  path?: string;
  actual?: unknown;
  expected?: unknown;
  hint?: string;
  example?: unknown;
  docs?: string;
  fingerprint?: string;
  fixes?: Array<{ id: string; title: string; safe: boolean }>;
}

export type ValidationResult =
  | { ok: true; warnings?: AnvilError[] }
  | { ok: false; errors: AnvilError[] };

export function err(
  code: ErrorCode,
  message: string,
  extra?: Partial<Omit<AnvilError, "code" | "message">>,
): AnvilError {
  return {
    code,
    message,
    ...extra,
    fingerprint:
      extra?.fingerprint ?? diagnosticFingerprint(code, extra?.path, message),
  };
}

/** Stable diagnostic ordering for deterministic agent and CLI output. */
export function sortDiagnostics(
  diagnostics: readonly AnvilError[],
): AnvilError[] {
  return [...diagnostics].sort(
    (a, b) =>
      (a.path ?? "").localeCompare(b.path ?? "") ||
      a.code.localeCompare(b.code) ||
      a.message.localeCompare(b.message),
  );
}

/** Browser-safe FNV-1a fingerprint over the diagnostic's stable identity. */
function diagnosticFingerprint(
  code: ErrorCode,
  path: string | undefined,
  message: string,
): string {
  const value = `${code}\u0000${path ?? ""}\u0000${message}`;
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `anvil-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

/** CLI exit codes (S-ERRORS). */
export const EXIT = {
  OK: 0,
  FAIL: 1,
  USAGE: 2,
  INTERNAL: 3,
} as const;
