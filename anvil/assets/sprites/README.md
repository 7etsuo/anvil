# Bundled sprite library (optional)

Mirror of the audio library idea: drop **CC0** sprite sheets / tiles here so
agents can pick paths without hunting online.

## Layout

```
sprites/
  catalog.json     # generated index (optional)
  LICENSES.md      # provenance
  characters/      # walk cycles, idle
  tiles/           # floors, walls
  ui/              # panels, icons
  fx/              # slash, explosion frames
  items/           # loot icons
```

## Agent API

Use `listBundledSprites()` / `loadBundledSpriteCatalog()` from `@anvil/core`
(same pattern as audio). Paths are relative to this folder; symlink into a game
as `assets/sprites`.

## License

Only **CC0 / public domain** assets. See `LICENSES.md` when packs are added.
