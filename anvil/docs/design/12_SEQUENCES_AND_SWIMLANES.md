# 12 — Sequences and Swimlanes

All critical flows. Implementers must match these.

## 1. Agent builds a new card game (happy path)

```mermaid
sequenceDiagram
  actor Agent
  participant CLI as Anvil CLI
  participant FS as Filesystem
  participant Ker as Kernel
  participant Test as TestRunner

  Agent->>CLI: anvil new demo --genre card
  CLI->>FS: write template package
  CLI-->>Agent: path + next steps
  Agent->>FS: edit content/cards/*.json
  Agent->>CLI: anvil validate
  CLI->>FS: load schemas + content
  CLI-->>Agent: ok
  Agent->>CLI: anvil test
  CLI->>Ker: launch headless
  Ker->>Test: run scenarios
  Test-->>Agent: pass
  Agent->>CLI: anvil observe --shot
  CLI->>Ker: snapshot
  Ker-->>Agent: JSON + PNG
  Agent->>CLI: anvil dev
  Note over Agent: Optional: drop PNGs into assets/
```

## 2. Swimlane: validate fail → fix

```mermaid
sequenceDiagram
  actor Agent
  participant CLI
  participant Schema

  Agent->>CLI: anvil validate
  CLI->>Schema: parse content
  Schema-->>CLI: SCHEMA_INVALID path=...
  CLI-->>Agent: error JSON + hint + example
  Agent->>Agent: patch file
  Agent->>CLI: anvil validate
  CLI-->>Agent: ok
```

## 3. Swimlane: missing asset greybox

```mermaid
sequenceDiagram
  participant Sys as SpriteSystem
  participant Assets as AssetServer
  participant R as RenderFacade

  Sys->>Assets: getTexture("cards/strike.png")
  alt exists
    Assets-->>Sys: texture
    Sys->>R: drawSprite
  else missing
    Assets-->>Sys: greybox handle
    Sys->>R: drawQuad + label "strike.png"
  end
```

## 4. Swimlane: module load at boot

```mermaid
sequenceDiagram
  participant Boot
  participant Desc as GameDescriptor
  participant Reg as ModuleRegistry
  participant Card as genre-card
  participant Ker as Kernel

  Boot->>Desc: load game.yaml
  Boot->>Boot: host/CLI resolves module ids to GenreModule values
  Boot->>Reg: pass loaded modules to createGame
  Reg->>Card: register(kernel)
  Card->>Ker: add systems + scenes + schemas
  Boot->>Ker: enter entryScene
```

The current CLI loader supports established schema-v1 genres, `genre-net`, and
relative modules. It does not yet resolve `genre-arpg` by id.

## 5. Swimlane: debug after test fail (research-aligned)

```mermaid
flowchart LR
  A[test fail] --> B[observe --json]
  B --> C[observe --shot]
  C --> D[read error + screenshot]
  D --> E[edit content or genre data]
  E --> F[validate]
  F --> G[test]
  G -->|fail| B
  G -->|pass| H[done]
```

(Perception-guided iteration: GameCraft-Bench §5.1; GameDevBench visual feedback.)

## 6. Sequence: recipe apply (manual agent)

```mermaid
sequenceDiagram
  actor Agent
  participant CLI
  participant FS

  Agent->>CLI: anvil recipe show topdown.wasd-player
  CLI-->>Agent: file list + contents
  Agent->>FS: write files
  Agent->>CLI: anvil validate && anvil test
```

## 7. Sequence: cinematic play

```mermaid
sequenceDiagram
  participant Scene
  participant Cin as CinematicSystem
  participant R as RenderFacade
  participant In as Input

  Scene->>Cin: play("intro")
  Cin->>R: present video file
  In-->>Cin: skip action
  Cin->>Scene: finished
```

## 8. Class interactions: damage effect (card)

```mermaid
sequenceDiagram
  participant UI as BattleUI
  participant FX as EffectResolveSystem
  participant E as Enemy Entity
  participant Bus as EventBus

  UI->>FX: playCard(strike)
  FX->>E: health.hp -= 6
  FX->>Bus: emit CardPlayed
  FX->>Bus: emit DamageDealt
  alt enemy hp <= 0
    FX->>Bus: emit EnemyDefeated
  end
```

## 9. Component diagram — deploy nodes

```mermaid
flowchart TB
  subgraph DevMachine
    Agent
    CLI
    Node[Node.js]
    Browser
  end
  Agent --> CLI
  CLI --> Node
  Node --> Browser
  Node --> Disk[(project files)]
```

## 10. Schema-v2 authoring flow

```mermaid
sequenceDiagram
  participant FS as game.yaml + intent + content
  participant Host as Node or Vite host
  participant AU as @anvil/authoring
  participant IR as immutable IR
  participant AR as @anvil/genre-arpg
  participant K as Core runtime

  Host->>AU: compileProject(gameRoot)
  AU->>FS: read safe YAML/JSON
  AU-->>Host: diagnostics or frozen IR + sourceHash
  Host->>AR: materializeArpgContent(IR)
  AR-->>Host: browser-safe content + rules + provenance
  Host->>K: createGame(modules: [titleModule])
```

In a browser build, the Vite plugin performs compilation on the host and the
browser imports `virtual:anvil-game-ir`; compiler filesystem code is excluded
from the browser graph.
