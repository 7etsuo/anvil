# ANVIL DOCUMENTATION — MASTER MAP

**Spec-driven development** for AI agents ([AGENTS.md](https://agents.md/), SDD arXiv:2602.00180, Spec Kit tasks).

---

## Always start here

| Order | File |
|-------|------|
| 0 | [`../../../AGENTS.md`](../../../AGENTS.md) |
| 1 | **This README** |
| 2 | [`20_FULL_TASK_BREAKDOWN.md`](./20_FULL_TASK_BREAKDOWN.md) |
| 3 | [`specs/README.md`](./specs/README.md) → task’s `S-*.md` |

---

## Planning complete?

**Yes — full engine plan for M1–M9** after sub-agent audit + remediation (`16`).

| Layer | Status |
|-------|--------|
| Vision, REQs, OOS, ADRs | Done |
| Architecture + diagrams index | Done |
| Full task WBS | Done (`20`) |
| Core/CLI/Test/Schema/Assets/Save contracts | Done (`specs/`) |
| All genres + net spike contracts | Done (`specs/S-CARD`…`S-NET`) |
| Agent STYLE / SECURITY / CONTRIBUTING | Done |
| Code | Not started |

Residual R1–R5 listed in `16` (recipe file bodies at M3–M5, etc.).

---

## Hierarchy (context loss)

```text
L0  /AGENTS.md
L1  design/README.md
L2  design/20_*.md + design/specs/*
L3  design/01–19, STYLE, SECURITY, CONTRIBUTING
L4  packages/* (code)
```

---

## Specs

| Spec | Topic |
|------|-------|
| S-CORE | Kernel complete API + input + save |
| S-RENDER | Facade |
| S-SCHEMA | game.yaml + content field tables |
| S-TEST | Scenario DSL |
| S-CLI | Commands + staged genres |
| S-ASSETS | Paths, greybox, manifest |
| S-SAVE | Save/load |
| S-ERRORS | Codes |
| S-CARD / TOPDOWN / VN / SHMUP / FPS2 / NET | Genres |
| S-RECIPES | Recipe format |

## Spine 01–20

See `00_INDEX.md`.

## Research

- `../research/SE_DOCS_FOR_AI_AGENTS.md`  
- `../research/LITERATURE_AGENTIC_GAME_ENGINES.md`  
- `../research/papers/*.pdf` (13 files incl. SDD)

## Next

M1–M9 complete. Engine + first title greybox (`games/gravewake`).
