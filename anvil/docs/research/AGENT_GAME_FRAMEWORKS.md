# Research: Game frameworks agents can actually drive

Goal: an SDK **Grok Build** can use across genres without reinventing engines.

---

## 1. Why “just use Unity/Godot” fails for agents

| Obstacle | Why it hurts Grok Build |
|----------|-------------------------|
| Heavy GUI editors | Agent can’t click reliably |
| Binary scenes / opaque assets | Hard to diff and author |
| Huge API surface | Easy to hallucinate wrong calls |
| C#/GDScript project glue | Extra context, weaker file-native loop |
| Slow iteration for “try idea” | Agents thrive on file edit + run |

**Better fit:** small TypeScript runtime, **everything important in text files** (JSON/MD), CLI verify, browser play.

---

## 2. Patterns that work for agent-authored games

### 2.1 Data-driven content
Games are mostly data: enemies, rooms, items, dialog.  
Code is the interpreter. Industry practice: define entities in **JSON**, load at boot, tune without recompiling logic.

**Anvil:** `content/**/*.json` validated by Zod (or JSON Schema).

### 2.2 Composition over inheritance (ECS-lite)
ECS (Entity–Component–System): entities = IDs, components = data, systems = behavior.  
Widely used for composability (projectile + homing = add component, not new class).  
JS ecosystem: bitECS, Miniplex, Koota, etc. (see [webgamedev ECS overview](https://www.webgamedev.com/code-architecture/ecs)).

**Anvil v1 stance:** **ECS-lite** — not a hardcore SoA engine.  
`Actor` + attachable components (`Health`, `SpriteAnim`, `AI`, `LootTable`) is enough for 2D web games and easier for an agent to author than pure bitECS.

### 2.3 Genre as plugin packs
One core loop (scene, input, render, assets); genres add systems:

| Genre pack | Extra systems |
|------------|---------------|
| `arpg` | Overworld packs, dungeon rooms, XP, inventory, skills |
| `shmup` | Waves, scrolling, bullet patterns |
| `vn` | Script graph, portraits, choices |
| `roguelite` | Run seed, room gen hooks, meta unlocks |

Gravewake enables **`@anvil/genre-arpg`**.

### 2.4 Templates + contracts
Agent success rate rises when:
- Folder layout is fixed  
- Schemas reject invalid content  
- “Missing asset” is a typed error with fix hint  
- Commands are few: `new`, `validate`, `dev`, `assets check`

---

## 3. Runtime choice

| Option | Pros | Cons |
|--------|------|------|
| **Phaser 3** | Mature 2D, scenes, input, arcade physics | Heavier; API surface large |
| Pixi + custom | Lean render | Rebuild scene/input |
| Canvas only | Tiny | Painful long-term |
| Godot headless | Real engine | Worse agent/file workflow |

**Decision for Anvil v1:** **Phaser 3 + TypeScript + Vite**, wrap Phaser behind Anvil APIs so Grok mostly touches:

```ts
anvil.defineGame({ genres: ['arpg'], contentRoot: './content' })
anvil.spawn('scuttler', { x, y })
```

…not raw Phaser soup (allowed as escape hatch).

---

## 4. Agent API surface (conceptual)

What Grok should call or edit:

| Surface | Form |
|---------|------|
| Project scaffold | `npx @anvil/cli new my-game --genre arpg` |
| Content | JSON files matching schemas |
| Design docs | Markdown (human + agent) |
| Assets | Optional path manifest; files on disk |
| Validate | `anvil validate` → errors with paths |
| Run | `anvil dev` |
| Asset audit | `anvil assets missing` |

Optional later: MCP tools wrapping the same CLI for tool-calling agents.

---

## 5. Multi-game monorepo shape

```text
repo/
  anvil/                 # SDK packages
    packages/
      core/              # runtime
      cli/
      schema/
      genre-arpg/
      genre-shmup/       # later
  games/
    gravewake/           # first dogfood game (parked; outside anvil/)
    <next>/
```

*Layout: `x-game/anvil` (engine) + `x-game/games/*` (titles).*

---

## 6. What “Grok uses Anvil directly” means

1. **AGENTS.md / anvil skill** — rules: always validate, greybox first, base→edit art  
2. **Schemas** — invalid enemy JSON fails CI/dev boot  
3. **Missing-file reports** — optional path lists for content refs  
4. **No freeform engine invention** — if feature missing, extend Anvil, don’t fork random Phaser architecture per game  

---

## 7. Risks

| Risk | Mitigation |
|------|------------|
| Building engine forever, no game | Dogfood Gravewake every milestone |
| Schema too rigid | Versioned schemas, genre extensions |
| Phaser leak everywhere | Facade + lint boundaries |
| Art tool changes | No gen tool in engine; only file paths |

---

## 8. Success criteria for Anvil

1. New ARPG prototype scaffoldable in &lt; 30 minutes of agent time  
2. Gravewake runs only on public Anvil APIs + content  
3. Second genre template exists (even thin)  
4. `anvil assets missing` matches content path refs
5. Agent never needs Unity/Godot for v1 games  
