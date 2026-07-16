# games/iron-soul — Iron Soul game/sim layer

The Iron Soul modular platform on the Anvil runtime: **Arena Autobattler** + **World Sim Map**
as modules of one game. Content, entity definitions, progression, and simulation logic live
HERE; the engine stays clean.

**Golden rules (binding — Integration Framework §4.3):**
1. Nothing Iron-Soul inside `anvil/` — engine dir stays upstream-clean.
2. All game content under `games/iron-soul/` only.
3. Consume **public Anvil APIs only** (`anvil/ENGINE.md`).
4. Reusable behavior → implement in `anvil/`, propose upstream.

**Structure:**
- `public/assets/` — actors · gear · env · props · icons · fx · ui · audio (+ `style/` bible)
- `content/` — YAML definitions (agent-authored)
- `src/` — TypeScript game layer
- `docs/` — module docs (Arena Autobattler doc lands with its module)

**Status:** scaffold only. First module code is GATED on the H1 sandbox /delta-force verdict
(trust posture for agent-generated modules) + the operator toolchain verify (Node 22 + pnpm,
engine build, Gravewake run). See `project_iron_soul` `tasks/todo.md` — Anvil Readiness track.

**Canon authority:** any MAP/Scoria-canon subject rendered here defers to the ratified visual
canon (Character Domain v1.0 · VDF · Pebble Design Ratification Addendum v1.0). Reveal fence
per `public/assets/style/IRON_SOUL_STYLE.md`.
