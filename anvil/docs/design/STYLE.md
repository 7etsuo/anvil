# Code Style (agents + humans)

## TypeScript

- `strict: true`  
- No `any` unless justified with comment  
- Prefer `interface` for object shapes  
- Named exports only from package barrels  

## Naming

| Kind | Style |
|------|-------|
| Files | `PascalCase.ts` classes; `camelCase.ts` functions/modules |
| Packages | `@anvil/<kebab>` |
| Content ids | `snake` or `kebab` lowercase |
| Events | `domain:action` |

## Imports

- Games/examples: only `@anvil/core`, `@anvil/genre-*`, `@anvil/schema`  
- **Forbidden:** `phaser` outside `packages/render-phaser`  
- **Forbidden:** relative imports that cross package boundaries  

## Formatting

- Prettier defaults (printWidth 100) if configured; else 2-space indent  

## Comments

- Public API JSDoc on exports  
- No narrating comments  
