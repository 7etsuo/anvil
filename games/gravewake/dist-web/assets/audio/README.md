# Anvil bundled audio library

Free **CC0** game music and SFX, organized so agents can pick sounds without hunting online.

## Layout

```
audio/
  catalog.json     # machine index + suggested semantic cues
  LICENSES.md      # provenance (all CC0)
  music/           # background / loop tracks
  jingles/         # short stingers (optional)
  sfx/
    ui/            # clicks, confirms, errors, menus (Kenney)
    combat/        # hits, swings, spells, explosions
    inventory/     # pickup / equip materials
    world/         # doors, keys
    metal/         # metal foley
    wood/          # wood foley
    foley/         # household / object noises
    misc/          # overflow SFX
```

## Agent quick start

1. **Browse** `catalog.json` → `entries[]` (filter by `kind`, `tags`, or path prefix).
2. **Or** use engine helpers:
   - `listBundledAudio({ kind: "sfx", tag: "ui" })`
   - `getSuggestedAudioCues()` → semantic map (`hit`, `ui_click`, `music_battle`, …)
3. **Install into a game** so `AssetServer` can resolve paths:
   ```bash
   # from game root
   ln -sfn ../../../anvil/assets/audio assets/audio
   # or copy only the files you need under assets/audio/
   ```
4. **Wire cues** in `content/audio.json` or code:

```json
{
  "cues": {
    "ui_click": "audio/sfx/ui/click_001.ogg",
    "hit": "audio/sfx/combat/hit_01.ogg",
    "music_battle": "audio/music/battle_theme_a.mp3"
  }
}
```

Paths in the catalog are **relative to this folder**. When linked as `assets/audio`,
prefix with `audio/` for game asset resolution (`assets/audio/sfx/...` → cue path
`audio/sfx/...`).

```ts
import {
  getSuggestedAudioCues,
  listBundledAudio,
  cuesForAssetRoot,
} from "@anvil/core";

// Semantic defaults, paths ready for assets/audio symlink
const cues = cuesForAssetRoot(getSuggestedAudioCues(), "audio");
kernel.audio.setCues(cues);

// Play
kernel.audio.play("hit", "sfx");
kernel.audio.playMusic("music_battle");
// or events:
kernel.events.emit("audio:play", { cue: "ui_click", channel: "ui" });
kernel.events.emit("audio:music", { cue: "music_town" });
```

## Suggested cues (subset)

See `catalog.json` → `suggestedCues` for the full map. Common ones:

| Cue | Path |
|-----|------|
| `ui_click` | `sfx/ui/click_001.ogg` |
| `hit` | `sfx/combat/hit_01.ogg` |
| `swing` | `sfx/combat/rpg_battle_swing.wav` |
| `spell` | `sfx/combat/rpg_battle_spell.wav` |
| `pickup` | `sfx/inventory/rpg_inventory_bubble.wav` |
| `door_open` | `sfx/world/door_open.ogg` |
| `music_town` | `music/town_theme.mp3` |
| `music_battle` | `music/battle_theme_a.mp3` |
| `music_dungeon` | `music/dungeon_ambience.ogg` |

## Regenerating the catalog

From repo root (Node 22+):

```bash
node --input-type=module <<'NODE'
// or run the small generator used in packages/core tests / scripts
import { writeBundledAudioCatalog } from "@anvil/core";
writeBundledAudioCatalog();
NODE
```

Alternatively open `catalog.json` after adding files and re-run the generator in
`packages/core/src/audio/AudioCatalog.ts` via tests.

## License

**CC0** — see [LICENSES.md](./LICENSES.md). No attribution required for these files.
