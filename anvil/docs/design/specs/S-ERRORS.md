# Spec: Error Catalog (complete v1)

Every CLI/lib failure uses:

```ts
interface AnvilError {
  code: ErrorCode
  message: string
  path?: string
  hint?: string
  example?: unknown
}
```

## ErrorCode enum (exhaustive for M6)

| Code | When |
|------|------|
| `SCHEMA_INVALID` | Zod/schema fail |
| `REF_MISSING` | content references unknown id |
| `ASSET_MISSING` | path missing (strict mode) |
| `MODULE_UNKNOWN` | game.yaml module not installed |
| `GENRE_MISMATCH` | content type vs genre |
| `LAUNCH_FAIL` | cannot enter entryScene |
| `TEST_FAIL` | assertion failed |
| `TEST_TIMEOUT` | scenario exceeded max ticks |
| `IO_ERROR` | filesystem read/write |
| `INVALID_ARGS` | CLI args |
| `NOT_IMPLEMENTED` | net/etc stub |
| `INTERNAL` | bug |

CLI exit codes: `0` ok, `1` validation/test fail, `2` usage, `3` internal.
