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

Source of truth in code: `@anvil/schema` → `ERROR_CODES`, `ERROR_CODE_DOCS`, `err()`, `EXIT`.

## ErrorCode enum (exhaustive for M6)

| Code | When | Produced by (tests) |
|------|------|---------------------|
| `SCHEMA_INVALID` | Zod/schema fail | `validateProject` bad yaml; schema unit |
| `REF_MISSING` | content references unknown id | reserved genre loaders; `err()` catalog |
| `ASSET_MISSING` | path missing (strict mode) | `runTests` strictAssets; assets missing |
| `MODULE_UNKNOWN` | game.yaml module not installed | `validateProject` |
| `GENRE_MISMATCH` | content type vs genre | reserved validators; `err()` catalog |
| `LAUNCH_FAIL` | cannot enter entryScene | `createGame` |
| `TEST_FAIL` | assertion failed | `runTests` |
| `TEST_TIMEOUT` | scenario exceeded max ticks | `runTests` |
| `IO_ERROR` | filesystem read/write | missing root / game.yaml |
| `INVALID_ARGS` | CLI args | CLI usageError exit 2 |
| `NOT_IMPLEMENTED` | net/etc stub | stubs; `err()` catalog |
| `INTERNAL` | bug | CLI catch-all exit 3 |

CLI exit codes: `0` ok, `1` validation/test fail, `2` usage, `3` internal (`EXIT` in schema).

## Tests (M6)

- `packages/schema/src/errors.test.ts` — catalog exhaustiveness  
- `packages/core/src/errors.integration.test.ts` — runtime emission for IO/SCHEMA/MODULE/LAUNCH/TEST_*  
