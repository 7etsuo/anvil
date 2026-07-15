# 04 — System Architecture

**Research:** GC desiderata; DG submodule pattern; SW ACI; LR high-level API.

## 1. Context diagram

```mermaid
flowchart LR
  subgraph Agents
    A[Coding Agent / Human]
  end
  subgraph AnvilCLI[Anvil CLI - ACI]
    C[new validate dev test observe assets recipe]
  end
  subgraph GamePkg[Game Package]
    Y[game.yaml]
    J[content/*.json]
    F[assets/*]
    T[tests/*]
  end
  subgraph Runtime
    K[Core Kernel]
    M[Genre Modules]
    R[Render Facade]
  end
  A --> C
  C --> GamePkg
  C --> K
  K --> M
  K --> R
  K --> F
  K --> J
```

## 2. Package UML (logical)

```mermaid
classDiagram
  direction TB
  class AnvilCLI {
    +new()
    +validate()
    +dev()
    +test()
    +observe()
    +assetsMissing()
    +recipeList()
  }
  class GameDescriptor {
    +id: string
    +genre: string
    +modules: string[]
    +contentRoot: string
    +assetsRoot: string
  }
  class Kernel {
    +tick()
    +pause()
    +seed: number
  }
  class World {
    +spawn()
    +destroy()
    +query()
  }
  class Entity {
    +id: string
    +components: Map
  }
  class System {
    <<interface>>
    +update(dt, world)
  }
  class SceneManager {
    +push()
    +pop()
    +replace()
  }
  class AssetServer {
    +getTexture(path)
    +getAudio(path)
    +greybox(path)
  }
  class ObserveService {
    +snapshotJSON()
    +screenshot()
  }
  class GenreModule {
    <<interface>>
    +register(kernel)
  }
  class CardModule
  class TopdownModule
  class VnModule
  class ShmupModule
  class Fps2Module
  class RenderFacade {
    +drawSprite()
    +drawText()
  }

  AnvilCLI --> GameDescriptor
  AnvilCLI --> Kernel
  AnvilCLI --> ObserveService
  Kernel --> World
  Kernel --> SceneManager
  Kernel --> AssetServer
  Kernel --> RenderFacade
  World "1" *-- "many" Entity
  Kernel --> System
  GenreModule <|-- CardModule
  GenreModule <|-- TopdownModule
  GenreModule <|-- VnModule
  GenreModule <|-- ShmupModule
  GenreModule <|-- Fps2Module
  GenreModule --> Kernel
```

## 3. Layering rules

| Layer | May depend on | Must not depend on |
|-------|---------------|--------------------|
| Game package content | schemas only | Phaser, kernel internals |
| Genre modules | core | other genres (except via events) |
| Core | render facade interface | game content |
| CLI | core + schema + recipes | game-specific code |
| Render backend (Phaser) | nothing above | — |

**Dependency rule (REQ-A03):** game code imports `@anvil/core` and `@anvil/genre-*` only.

## 4. Directory layout (repo)

**Canonical tree:** [`17_MONOREPO_AND_STACK.md`](./17_MONOREPO_AND_STACK.md)  
(includes `render-phaser`, `hello-empty`, `hello-fps2`, `fps2-starter`).

## 5. Component responsibilities

| Component | Responsibility | REQ |
|-----------|----------------|-----|
| CLI | ACI entry | P01–P10 |
| Schema | Zod/JSON Schema validate | P04 |
| Kernel | tick, seed, pause | K01–K02 |
| World | entities/components | K04 |
| Systems | behavior | K05 |
| SceneManager | flow | K03 |
| AssetServer | paths + greybox | K08, S01–S03 |
| Input | action map | K07 |
| Events | decouple systems | K06 |
| ObserveService | agent eyes | P07–P08 |
| TestRunner | headless scenarios | P06 |
| Genre modules | domain rules | G01–G06 |
| Recipes | verified snippets | A05, VY |
| RenderFacade | draw abstraction | K12 |

## 6. Deployment views

### 6.1 Dev (agent loop)

```text
Agent → CLI → Vite dev server → Browser
                ↘ headless test process
```

### 6.2 CI

```text
git push → pnpm test → anvil validate (all examples) → anvil test (all examples)
```

## 7. Security / sandbox (agent safety)

- CLI operates only within project root  
- No privileged host commands in recipes  
- Tests run sandboxed cwd  

(Aligns with agent failure catalogs; keep destructive ops out of ACI.)
