# Spec: Recipes

**Milestone:** M3+ · **REQ-A05**

## recipe.yaml

```ts
{
  id: string,                 // e.g. card.basic-attack
  title: string,
  genre: 'card'|'topdown2d'|'vn'|'shmup'|'fps2'|'none',
  files: Array<{ path: string, write: string }>,  // path relative game root
  tests?: string[],           // optional test file paths to copy
  validate?: boolean          // default true after apply guidance
}
```

## CLI

- `recipe list` → all ids from `@anvil/recipes`  
- `recipe show <id>` → full YAML to stdout  

No auto-apply in M3 (agent writes files). Optional `recipe apply` later.

## Backlog ids (must exist as files by M5)

See `11_RECIPES_AND_TEMPLATES.md` list 1–15. meta.* optional.
