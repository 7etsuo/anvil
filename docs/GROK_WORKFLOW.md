# Grok Build + Grok Imagine workflow for Anvil

How to use **Grok Build** (coding agent) and **Grok Imagine** (image tools)
with this monorepo. Anvil is **work in progress**: M1–M9 runtime is usable;
M10/M11 authoring integration is still landing.

Repo: https://github.com/7etsuo/anvil

## Principle

**Anvil loads files. Anvil does not create art.**

| Tool | Job |
|------|-----|
| **Grok Build** | Code, content, path wiring, greybox → real art, tests, validate |
| **Grok Imagine** | New identities (`image_gen`), pose/variant frames (`image_edit`), optional cinematics (`image_to_video`) |
| **Anvil** | Resolve `assetsRoot` paths, greybox if missing, advance frame lists, play audio/video |

Hard rules (also in [`AGENTS.md`](../AGENTS.md)):

- Do **not** add image-generation APIs to Anvil.
- Do **not** put game content inside `anvil/`.
- Games consume **public Anvil APIs only** (no raw Phaser outside `@anvil/render-phaser`).

Engine media contract: [`anvil/docs/design/09_ASSETS_AND_MEDIA.md`](../anvil/docs/design/09_ASSETS_AND_MEDIA.md).

---

## Bootstrap

```bash
git clone https://github.com/7etsuo/anvil.git
cd anvil

# engine
cd anvil
pnpm install
pnpm -r run build
pnpm test

# reference game
cd ../games/gravewake
pnpm install
pnpm play
# → http://127.0.0.1:5180/
```

Requires Node.js 22+ and pnpm 9.15.9.

### Agent entry points

| Goal | Read first |
|------|------------|
| Monorepo rules | [`AGENTS.md`](../AGENTS.md) |
| Engine public surface | [`anvil/ENGINE.md`](../anvil/ENGINE.md) |
| Change the engine | [`anvil/docs/design/README.md`](../anvil/docs/design/README.md) |
| Ship / polish Gravewake | [`games/gravewake/README.md`](../games/gravewake/README.md) |
| Media contract | [`anvil/docs/design/09_ASSETS_AND_MEDIA.md`](../anvil/docs/design/09_ASSETS_AND_MEDIA.md) |

### Starter prompt for Grok Build

> Open the Anvil monorepo. Work only through public Anvil APIs for games.
> Find missing asset paths (greyboxes / `ASSET_MISSING`), produce art with
> Imagine, place files under the game `assetsRoot`, wire content, and run
> `pnpm play` (or `pnpm anvil validate` for engine examples).

---

## Asset loop

```text
1. Content declares paths   →  walk frames, icons, env plates, etc.
2. Missing paths greybox    →  colored quad + basename; game continues
3. Imagine produces PNGs
4. Files land on exact paths under assetsRoot
5. Validate / play / iterate
```

Optional strict gate when shipping polish:

```bash
# when available for the project
pnpm anvil test --strict-assets
pnpm anvil validate <project-root>
```

There is **no** `anvil imagine` command. Agents (or humans) supply files by any
means; Anvil only cares that paths exist.

---

## Where files go (Gravewake)

`games/gravewake/game.yaml` sets:

```yaml
assetsRoot: public/assets
```

Typical layout:

```text
games/gravewake/public/assets/
  actors/     # hero, enemies — idle / walk / attack / …
  gear/       # paper-doll equipment layers
  env/        # room / wastes / dungeon plates
  props/      # chest, door, portal, barrels
  icons/      # items, skills, currency
  fx/         # impacts, AoE decals
  ui/         # decorative frames / portraits (not HP bars)
  audio/      # often from anvil/assets/audio (CC0)
```

Audio: prefer the bundled CC0 library under [`anvil/assets/audio/`](../anvil/assets/audio/README.md).
Sprites under `anvil/assets/sprites/` are **reserved / empty of packs** until a
licensed catalog is added — keep game art in the title’s `assetsRoot`.

---

## Imagine workflow

### 1. Style bible (once per title)

Before mass generation, lock:

- Mood plates (hub, overworld, dungeon)
- Hero base
- One or two enemy bases
- A few item icons + one UI frame sample
- Short locked phrases (e.g. dark fantasy, ash, bone, high ¾ top-down)

Put a small `STYLE.md` next to style bases if the title uses one (e.g. under
`public/assets/style/`).

### 2. One base identity per subject (`image_gen`)

Generate **once** per character or prop family (hero, each enemy id, boss,
chest family, etc.). Do not re-roll a new identity for every animation frame.

Prompt shape that works for top-down ARPGs:

> High three-quarter top-down game sprite, [subject], dark fantasy ash and bone,
> full body visible, solid flat or easy-to-key background, no UI text, no HP bar,
> consistent light from upper left, game-ready PNG

### 3. All other frames via `image_edit`

Edit the approved base for:

| State | Intent |
|-------|--------|
| idle | subtle breath / stance (1–2 frames) |
| walk | cycle (typically 4 frames), same camera and scale |
| attack / shoot | wind-up → contact → recover |
| hit / death | readable silhouette (1–2 frames) |
| prop open/closed | same object, state change only |

### 4. Cinematics only for video (`image_to_video`)

Use short clips (prefer ~6s) for title / boss intro / victory / death movies —
**never** for walk or attack gameplay loops.

### 5. Split: Imagine vs code

| On-screen thing | Owner |
|-----------------|--------|
| Body poses, props, icons, env plates, decorative UI frames | **Imagine** |
| Which frame is shown, X/Y motion, flip L/R | **Code / Anvil** |
| HP bars, cooldowns, gold digits, tooltips | **Code** |
| Particles, screen shake, flash | **Code** |
| Collision, fog, minimap dots | **Code** |

Content lists ordered paths; runtime advances them, for example:

```json
"walk": ["actors/hero_walk_01.png", "actors/hero_walk_02.png"]
```

---

## What Grok Build does after Imagine

1. **Place** files on the exact paths content already references.
2. **Wire** any new paths in content / anim tables / item defs.
3. **Prefer engine APIs** for reusable behavior (`ActorAnimController`,
   particles, `equippedVisuals`, combat, save, etc.). If the game needs a
   reusable system, implement it in Anvil — not as a one-off title hack.
4. **Reuse CC0 audio** from `anvil/assets/audio` unless custom SFX is required.
5. **Play and QA** every animation state in-browser.

### Full art-pass prompt

> Open Gravewake. List missing actor/icon/env paths shown as greyboxes or
> `ASSET_MISSING`. For each identity, generate one base with Imagine, then
> `image_edit` walk/attack/hit/death frames matching the style bible. Save under
> `public/assets/` with the names content already references. Run `pnpm play`
> and fix path mismatches.

### First-hour recipe

1. `pnpm play` Gravewake — note greyboxes.
2. Lock five style phrases + one hero base (`image_gen`).
3. `image_edit` idle (2) + walk (4) + attack (3).
4. Save under `public/assets/actors/…` with content-matching names.
5. Replay; adjust scale/hitbox in code if needed.
6. Repeat for one trash enemy + three item icons.

---

## Do not

| Don’t | Why |
|-------|-----|
| Put title art inside `anvil/` | Engine and games stay separate |
| Call Imagine from Anvil packages | Explicit hard rule — no gen APIs in the engine |
| One unique `image_gen` per animation frame | Identity drifts; always edit from base |
| Bake damage numbers or bars into sprites | UI is code |
| Use video for walk/attack loops | Cinematics only |
| Assume `anvil/assets/sprites` is a full pack | Docs/layout only until assets are added |
| Special-case reusable mechanics only in the title | Promote into Anvil instead |

---

## Historical notes

Gravewake’s original vertical-slice Imagine checklist and frame counts live
under `games/gravewake/docs/ASSET_PIPELINE.md` and `ASSET_CHECKLIST.md`. Those
files are **historical archives**, not current runtime contracts. Prefer live
`content/`, `public/assets/`, and `games/gravewake/README.md` for what the game
actually loads today.

Research-only note (not an engine API):
[`anvil/docs/research/AI_GAME_ASSETS.md`](../anvil/docs/research/AI_GAME_ASSETS.md).

---

## One-liner

**Grok Build owns code and paths; Grok Imagine owns pixels; Anvil only loads
files.** Greybox until art exists; base identity once; edit every frame; drop
PNGs under the game’s `assetsRoot`.
