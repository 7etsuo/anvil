# Bundled audio licenses

All audio under `anvil/assets/audio/` is free for commercial and non-commercial use
in Anvil games. **Prefer CC0** so agents do not need attribution bookkeeping.

This file is the source of truth for provenance. When adding packs, only include
**CC0 / public domain** unless a maintainer explicitly approves a CC-BY set and
updates this file.

## Packs included (CC0)

| Pack | Author | Source | Notes |
|------|--------|--------|-------|
| UI Audio | Kenney | [kenney.nl](https://kenney.nl/assets) / OpenGameArt mirrors | `sfx/ui/*` |
| 100 CC0 SFX | various (community pack) | OpenGameArt / public CC0 collections | `sfx/foley`, `sfx/misc`, combat hits, world doors |
| Metal & wood SFX | community CC0 | OpenGameArt-style metal/wood packs | `sfx/metal/*`, `sfx/wood/*` |
| RPG Sound Pack | community CC0 | OpenGameArt RPG interface/inventory/battle clips | `sfx/combat/rpg_*`, `sfx/inventory/*`, some world |
| Battle Theme A | cynicmusic | [OpenGameArt](https://opengameart.org/content/battle-theme-a) | `music/battle_theme_a.mp3` |
| Town Theme | cynicmusic | [OpenGameArt](https://opengameart.org/content/town-theme-rpg) | `music/town_theme.mp3` |
| A New Town (RPG Theme) | Josepharaoh99 | [OpenGameArt](https://opengameart.org/content/a-new-town-rpg-theme) | `music/town_new.mp3` |
| Free Music Pack (7 tracks) | Alexander Ehlers (tricksntraps) | [OpenGameArt](https://opengameart.org/content/free-music-pack) | `music/doomed.mp3`, `flags.mp3`, `great_mission.mp3`, `spacetime.mp3`, `twists.mp3`, `waking_the_devil.mp3`, `warped.mp3` |
| 5 Action Chiptunes | Juhani Junkala | [OpenGameArt](https://opengameart.org/content/5-chiptunes-action) | `music/chiptune_*.mp3` |
| Dungeon Ambience | community CC0 | [OpenGameArt](https://opengameart.org/content/dungeon-ambience) | `music/dungeon_ambience.ogg` |

## License text (CC0 1.0)

To the extent possible under law, the authors have waived all copyright and related
or neighboring rights to these works. You can copy, modify, distribute and perform
the works, even for commercial purposes, all without asking permission.

Full legal text: https://creativecommons.org/publicdomain/zero/1.0/

## Intentionally excluded

Packs that are free but **not** CC0 (CC-BY / CC-BY-SA) were downloaded during
research and **not** committed, so agents never ship attribution-required audio by
accident. Examples: Peaceful Village (CC-BY 4.0), Dark Descent (CC-BY 3.0),
Mystery Forest (CC-BY 3.0), Game Over Jingles (CC-BY-SA 4.0), Level Up! (CC-BY 3.0),
8-Bit Sound Library (CC-BY 3.0).

## Adding more audio

1. Confirm **CC0** on the source page.
2. Drop files under the appropriate folder (`music/`, `sfx/ui/`, `sfx/combat/`, …).
3. Regenerate `catalog.json` (see README).
4. Append a row to the table above.
