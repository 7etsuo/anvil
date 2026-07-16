# 01 — Vision and Scope

## 1. Problem

Coding agents fail at traditional game engines:

- Huge APIs → hallucinated methods (Godot 3/4 mixups, invented Unity APIs)
- GUI / binary scenes → hard to diff, edit, headless-test
- No eyes → agents miss visual bugs (GameDevBench, GameCraft-Bench)
- Partial outputs scored as “code” but not **playable games** (GameCraft-Bench)

Evidence: best agents ~41% end-to-end Godot (GameCraft-Bench, arXiv:2606.17861); ~50% local Godot edits (GameDevBench, arXiv:2602.11103).

## 2. Vision

**Anvil** = the development & runtime **environment ℰ** that maximizes agent success on:

```text
specification s  +  environment ℰ  →  playable game artifact G
```

(formalization from GameCraft-Bench §2).

Anvil is **not** “Unity but worse.” It is a **deliberately constrained engine** whose agent-facing surface is as small and reliable as a good ACI (SWE-agent, arXiv:2405.15793).

## 3. Goals

| ID | Goal |
|----|------|
| G1 | Agents produce **complete, launchable** games via text files only |
| G2 | **Multi-genre** via modules (card, topdown, VN, shmup, FPS2, ARPG, networking) |
| G3 | **Interactive verification** built-in (test, observe, semantic action, diff, replay) |
| G4 | **Asset-agnostic**: any files on disk; no image-gen vendor in engine |
| G5 | **Trivial agent UX**: ≤30 commands; recipes; schemas; structured errors |
| G6 | Research-aligned evaluation against GameCraft desiderata |

## 4. Non-goals (explicit)

| Out of scope v1–v2 | Why |
|--------------------|-----|
| AAA 3D / Unreal parity | Research shows agents already fail 2D Godot |
| Live MMO / ops platform | Tier 3; separate multi-year product |
| Built-in Grok Imagine / any art model | Art is agent-supplied files |
| Neural frame engines (GameNGen-style) | No discrete multi-genre rules |
| Replacing human designers for “fun” | GameCraft also does not measure fun |

## 5. Users

| User | Needs |
|------|-------|
| **Coding agent** (primary) | ACI, schemas, recipes, observe, tests |
| **Human developer** | Same CLI; readable JSON; browser preview |
| **Future game titles** | Depend on Anvil packages only |

## 6. Original readiness definition and current state

The original readiness bar was:

1. Agent can scaffold + complete **card** and **topdown2d** demos end-to-end with `validate` / `test` / `observe` green  
2. No example game imports raw Phaser  
3. Recipe library ≥ 15 verified skills  
4. Design suite + papers are the single source of truth  

That bar has been met: all listed examples and recipes exist, the renderer
boundary is linted, and Gravewake is active. Current work extends the product
with schema-v2 intent/IR and a reusable ARPG layer. Those libraries exist, but
their generic CLI/scaffold integration is not complete; see `16` and `20`.

## 7. Related docs

- Requirements: `03_REQUIREMENTS.md`  
- Research mapping: `02_RESEARCH_BASIS.md`  
