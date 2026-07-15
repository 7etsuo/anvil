# Spec: Assets (S-ASSETS)

**Milestone:** M1–M2 · **REQ:** K08, S01–S04

## 1. Path rules

- Paths in content are relative to `assetsRoot`  
- MUST reject `..` and absolute paths at validate  
- Extensions: `.png .webp .jpg .jpeg .ogg .wav .mp3 .mp4 .webm`  

## 2. Resolve algorithm

```
full = path.join(gameRoot, assetsRoot, relPath)
if full escapes gameRoot → IO_ERROR / INVALID
if !exists → missing
```

## 3. Greybox (REQ-S03)

On getTexture miss:

1. Record path in missing set  
2. Log once: `ASSET_MISSING path=...` (not fatal)  
3. Return greybox handle → drawQuad color from hash(path) + label basename  

## 4. Strict mode

`runTests({ strictAssets: true })` or CLI `--strict-assets`: any missing after preload → fail `ASSET_MISSING`.

## 5. `anvil assets missing`

Print sorted unique missing paths (one per line or JSON array). Exit 0 always unless IO_ERROR.

## 6. Manifest (REQ-S04)

Optional `assets/manifest.yaml` with `required: string[]`.  
Validate: each entry is AssetPath.  
`assets missing` unions manifest required with content refs.

## 7. Audio

Missing audio → null handle; play is no-op + one log.

## 8. Video cinematic

Missing video → skip cinematic + log; emit finished immediately.
