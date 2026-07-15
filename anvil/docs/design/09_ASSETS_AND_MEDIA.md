# 09 — Assets and Media

## 1. Principle

**Anvil loads files. Anvil does not create art.**

| Engine does | Engine does not |
|-------------|-----------------|
| Resolve path → texture/audio/video | Call Imagine / SD / any gen API |
| Greybox if missing | Own style bibles as runtime deps |
| Report missing paths | Require a specific art vendor |

Agents (including Grok Build with Imagine) **supply** files. Humans may supply files. Same paths.

## 2. Supported types (v1)

| Kind | Extensions |
|------|------------|
| Image | `.png`, `.webp`, `.jpg` |
| Audio | `.ogg`, `.wav`, `.mp3` |
| Video | `.mp4`, `.webm` |

## 3. Greybox policy (REQ-S03)

If path missing:

1. Log once: `ASSET_MISSING path=...`  
2. Draw colored quad + basename label  
3. Game continues  

`anvil test --strict-assets` fails on missing (optional for shipping).

## 4. Manifest (optional)

`assets/manifest.yaml`:

```yaml
# Inventory only — no prompts, no tools
required:
  - cards/strike.png
  - cards/defend.png
```

Or auto-derived from content references during validate.

## 5. Animation frames

Content lists ordered paths:

```json
"walk": ["actors/a_walk_01.png", "actors/a_walk_02.png"]
```

Runtime advances frames; no spritesheet packing required in v1 (optional later).

## 6. Cinematics

```json
{
  "id": "intro",
  "video": "cinema/intro.mp4",
  "skippable": true,
  "loop": false
}
```

Still images optional for poster frame.

## 7. Agent workflow for art

```text
anvil assets missing
→ produce files by ANY means
→ place at listed paths
→ anvil validate
```

No `anvil imagine` command.

## 8. Research note

GameDevBench: graphics tasks fail more than pure logic — **greybox + separate art pass** is intentional (arXiv:2602.11103).
