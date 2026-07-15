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
