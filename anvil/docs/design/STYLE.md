# Code style and package boundaries

## TypeScript

- Keep strict TypeScript enabled.
- Avoid `any`; when an external boundary requires it, isolate and justify it.
- Prefer interfaces for public object shapes and discriminated unions for
  finite protocols.
- Export public symbols through package barrels with JSDoc where behavior is
  not self-evident.
- Use deterministic iteration/order where output reaches tests, hashes, saves,
  diagnostics, or observations.

## Naming

| Kind | Convention |
|------|------------|
| Classes/types | PascalCase |
| Functions/modules | camelCase |
| Packages | `@anvil/<kebab-case>` |
| Content ids | lower snake/kebab/dotted ids accepted by the applicable schema |
| Events | `domain:action` for engine events; declarative event ids follow `EntityId` |

## Imports

- Games/examples use public exports from `@anvil/core`, selected
  `@anvil/genre-*`, and `@anvil/schema`.
- Schema-v2 Node/Vite host boundaries may use `@anvil/authoring` and
  `@anvil/authoring/vite`.
- Only `packages/render-phaser` may import `phaser`.
- Do not use relative paths to cross package boundaries; use workspace package
  exports.
- Do not import `KernelInternals` into ordinary game code. ARPG titles use the
  restricted services from `defineArpgGame`.

## Engine/game split

Reusable combat, input, loot, navigation, observation, multiplayer, or
authoring capability belongs in Anvil. Lore, named skills, area art, balance,
and title-specific presentation belong in the game. Prefer extending an
existing engine package to creating a parallel title implementation.

## Formatting and comments

Use the configured ESLint/TypeScript rules and two-space indentation. Do not
reformat unrelated files. Comments should explain ownership, invariants, safety
constraints, or non-obvious decisions—not narrate the code line by line.
