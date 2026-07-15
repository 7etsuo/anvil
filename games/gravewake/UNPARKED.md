# Gravewake — UNPARKED (M9)

**Decision (T-M9-001):** Ship **Gravewake** as the first Anvil title.

**Scope (vertical slice greybox):**

| Area | Fiction | Runtime |
|------|---------|---------|
| Town | Ashen Lychgate | Safe hub, portal east → parish |
| Overworld | Cinder Parish | Scuttlers + wretch, clear for crypt gate |
| Dungeon | Bellcrypt | Crypt guard + Bellwarden; victory on clear |

**Engine:** Anvil only (`@anvil/core`, `@anvil/genre-topdown2d` combat/move via `TopdownSim`).  
**Game module:** `./dist/module.js` (relative load from CLI).  
**Art:** Greybox / manifest optional paths (Imagine later).

**Playable:** `pnpm run play` → browser at http://127.0.0.1:5180/ (WASD + Space).

**Not in slice yet:** full 12-room dungeon graph, vendor UI, full inventory, cinematics, multiplayer.

See `docs/` for full design bible.
