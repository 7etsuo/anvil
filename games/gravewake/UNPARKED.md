# Gravewake — ACTIVE (M9)

**Decision (T-M9-001):** Ship **Gravewake** as the first Anvil title.

**Current playable scope:**

| Area | Fiction | Runtime |
|------|---------|---------|
| Town | Ashen Lychgate | Safe hub, shrine vendor, crafting, inventory |
| Overworld | Ashen Wastes | Procedural layout, timed packs, four portals |
| Dungeon | Bellcrypt | Procedural delve + Bellwarden |
| Dungeon | Howling Catacombs | Harder delve + Death Knight |
| Dungeon | Bonekeep | Endgame delve + Bone Tyrant |

**Engine:** Anvil only (`@anvil/core`, `@anvil/genre-topdown2d` combat/move via `TopdownSim`).  
**Game module:** `./dist/module.js` (relative load from CLI).  
**Art:** Production actor, environment, gear, portal, and loot sprites with greybox fallback.

**Playable:** `pnpm run play` → browser at http://127.0.0.1:5180/ (mouse or WASD; see README).

**Not in the current build:** cinematics, multiplayer, and a fixed hand-authored 12-room dungeon. Dungeons intentionally use Anvil procedural generation instead.

See `docs/` for full design bible.
