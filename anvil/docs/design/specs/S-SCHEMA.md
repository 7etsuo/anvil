# Spec: `@anvil/schema` — Full schemas

**Milestone:** M1 (game.yaml); content schemas grow with genres

## 1. game.yaml (normative fields)

```ts
// Zod-equivalent — implement exactly
{
  id: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(1),
  version: z.string().default('0.0.0'),
  anvil: z.string().optional(),          // semver range, not enforced M1
  genre: z.enum(['none','card','topdown2d','vn','shmup','fps2']),
  modules: z.array(z.string()).default([]),
  entryScene: z.string().min(1),
  seed: z.number().int().optional(),
  contentRoot: z.string().default('content'),
  assetsRoot: z.string().default('assets'),
  schemaVersion: z.literal(1).default(1),
}
```

**hello-empty:** `genre: none`, `modules: []`, `entryScene: main`.

**Module ids allowed:** `core` (implicit), `genre-card`, `genre-topdown2d`, `genre-vn`, `genre-shmup`, `genre-fps2`, `genre-net`.

Unknown module → `MODULE_UNKNOWN`.  
If `genre` is `card` and `genre-card` not in modules, validator MUST auto-include or error `GENRE_MISMATCH` — **Decision: auto-append genre module if missing** (agent-friendly).

## 2. Shared primitives

```ts
AssetPath = z.string().min(1).refine(p => !p.includes('..') && !p.startsWith('/'))
EntityId = z.string().regex(/^[a-zA-Z0-9_.:-]+$/)
NonNegInt = z.number().int().min(0)
PositiveNumber = z.number().positive()
```

## 3. Content path registry

| Glob | Schema owner | Genre |
|------|--------------|-------|
| `content/meta.json` | schema | all |
| `content/cards/*.json` | genre-card | card |
| `content/enemies/*.json` | genre-card or topdown | card/topdown |
| `content/battles/*.json` | genre-card | card |
| `content/actors/*.json` | topdown/shmup/fps2 | those |
| `content/maps/*.json` | topdown/fps2 | those |
| `content/scripts/*.json` | vn | vn |
| `content/waves/*.json` | shmup | shmup |
| `content/weapons/*.json` | fps2 | fps2 |
| `content/audio.json` | core | all |
| `content/cinematics.json` | core | all |

## 4. Referential integrity (validate)

1. Parse all JSON under contentRoot  
2. For each AssetPath field, record required asset (missing = warn; strict = ASSET_MISSING)  
3. Card battles: every enemy id exists; every deck card id exists  
4. Maps: every spawn actor id exists in actors  
5. VN: every `next` and choice next resolves to a node id; start exists  
6. Failures → `REF_MISSING` with path  

## 5. ValidationResult

```ts
type ValidationResult =
  | { ok: true; warnings?: AnvilError[] }
  | { ok: false; errors: AnvilError[] }
```

## 6. Content schemas (field tables)

### meta.json
`{ "title"?: string, "description"?: string }`

### CardDef (`content/cards/*.json`)
```ts
{
  id: EntityId,
  name: string,
  cost: NonNegInt,
  art?: AssetPath,
  effects: Effect[],
  tags?: string[]
}
Effect =
  | { op: 'damage'; amount: number; target: 'enemy'|'all_enemies'|'self' }
  | { op: 'block'; amount: number; target?: 'self'|'enemy' }  // default self
  | { op: 'draw'; amount: number }
  | { op: 'apply_status'; status: 'weak'|'vulnerable'; amount: number; target: 'enemy'|'self'|'all_enemies' }
```

### EnemyDef card (`content/enemies/*.json`)
```ts
{
  id: EntityId,
  name: string,
  hp: number,
  art?: AssetPath,
  intents: Array<
    | { kind: 'attack'; amount: number }
    | { kind: 'block'; amount: number }
    | { kind: 'buff'; status: string; amount: number }
  >
}
```

### BattleDef (`content/battles/*.json`)
```ts
{
  id: EntityId,
  playerHp: number,
  energyMax: number,
  handSize?: number,          // default 5
  deck: EntityId[],           // card def ids
  enemies: EntityId[]
}
```

### ActorDef (`content/actors/*.json`)
```ts
{
  id: EntityId,
  hp: number,
  speed: number,
  damage?: number,            // contact default 1
  ai?: 'none'|'chase_melee'|'keep_distance_ranged',
  aiParams?: {
    meleeRange?: number,      // default 24
    bandMin?: number,         // default 120
    bandMax?: number,         // default 200
    fireCooldownMs?: number,     // default 800
    projectileSpeed?: number  // default 220
  },
  animations: Record<string, AssetPath[]>,
  collider?: { kind: 'circle'; r: number } | { kind: 'aabb'; w: number; h: number },
  team?: 'player'|'enemy'
}
```

### MapDef — see S-TOPDOWN  
### VnScript — see S-VN  
### WaveDef — see S-SHMUP  
### audio.json
`{ "cues": Record<string, AssetPath> }`  
### cinematics.json
`{ "items": Array<{ id: string, video: AssetPath, skippable?: boolean, loop?: boolean }> }`  

## 7. Optional assets/manifest.yaml

```yaml
required:
  - relative/path.png
```
Paths only. No prompts. Validate as string array.
