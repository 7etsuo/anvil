# Spec: structured error catalog

The source of truth is `@anvil/schema`:
`ERROR_CODES`, `ERROR_CODE_DOCS`, `AnvilError`, `err`, `sortDiagnostics`, and
`EXIT`.

## Error shape

```ts
interface AnvilError {
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
```

`err()` supplies a stable FNV-1a fingerprint when the caller does not. Sorted
diagnostics order by path, code, then message for deterministic agent output.

## Exhaustive current codes

| Code | Meaning |
|------|---------|
| `SCHEMA_INVALID` | YAML/JSON/Zod contract failure |
| `SCHEMA_VERSION_UNSUPPORTED` | Project schema is newer/unknown to this release |
| `MIGRATION_REQUIRED` | Legacy project cannot use a version-specific authoring path |
| `INTENT_INVALID` | Intent file is absent or invalid |
| `COMPILE_FAILED` | Declarative source cannot compile |
| `PREFAB_CYCLE` | Prefab inheritance cycle |
| `PREFAB_CONFLICT` | Trait requirement/conflict failure |
| `REF_MISSING` | Unknown referenced id |
| `ASSET_MISSING` | Missing path in strict mode |
| `MODULE_UNKNOWN` | Manifest module is not installed/known to validation |
| `GENRE_MISMATCH` | Content/module does not match selected genre |
| `LAUNCH_FAIL` | Entry scene cannot be entered |
| `TEST_FAIL` | Scenario assertion failed |
| `TEST_TIMEOUT` | Scenario exceeded its tick budget |
| `IO_ERROR` | Filesystem/storage read or write failure |
| `INVALID_ARGS` | CLI usage error |
| `NOT_IMPLEMENTED` | Explicit stub/unsupported operation |
| `INTERNAL` | Unexpected engine/CLI defect |

Compiler `MIGRATION_REQUIRED` hints currently mention the planned
`anvil migrate` command. Until that CLI command exists, use
`migrateProject(root, { write? })` from `@anvil/authoring`.

## Process exits

| Exit | Meaning |
|------|---------|
| 0 | Success |
| 1 | Validation/test/expected operation failure |
| 2 | Invalid CLI usage |
| 3 | Unexpected internal failure |

The schema catalog test must fail if a new code lacks documentation. Producers
should include `path`, `actual`, `expected`, and a safe actionable hint when
they help an agent repair the problem.
