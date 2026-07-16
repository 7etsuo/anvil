# Bundled sprite directory

This directory reserves the same catalog layout used by bundled audio, but the
current checkout contains **no sprite assets or `catalog.json`**. Do not tell an
agent to select or link sprites from here until a licensed pack is actually
added.

The intended future layout is:

```text
sprites/
  catalog.json
  LICENSES.md
  characters/
  tiles/
  ui/
  fx/
  items/
```

Core exports `listBundledSprites` and `loadBundledSpriteCatalog`; with the
current empty directory they cannot provide a usable asset inventory. Games
should keep their own images under the declared `assetsRoot` and may use Anvil
greyboxes while art is missing.

Only CC0/public-domain assets with recorded provenance may be added. Update
[`LICENSES.md`](./LICENSES.md), generate a catalog, and update this status in
the same change.
