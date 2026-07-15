# 16 — Planning Status (post sub-agent audit)

**Date:** 2026-07-15  
**Method:** 4 parallel read-only audits (hierarchy, specs, REQ/tasks/diagrams, SE checklist) + remediation pass.

## Verdict

| Question | Answer |
|----------|--------|
| Product + architecture + full WBS for Anvil M1–M9? | **Yes** |
| Genre/core **implementable contracts** (not stubs)? | **Yes after remediation** — S-CORE, S-SCHEMA, S-TEST, S-ASSETS, S-SAVE, S-CLI, expanded S-CARD/TOPDOWN, etc. |
| Agent doc hierarchy (AGENTS.md six areas)? | **Yes** — root AGENTS + design AGENTS + STYLE/SECURITY/CONTRIBUTING |
| Zero contradictions ever? | **Remediated major ones** (P08, Phaser, K11 tasks, error catalog pointer) |
| Code? | **No** |

## Audit findings closed

| Finding | Fix |
|---------|-----|
| S-CORE incomplete | Full World/Scene/Event/Input/Module/Asset/RNG/Save API |
| S-SCHEMA prose only | Field tables + Zod-equivalent + content paths |
| Test DSL conflict | S-TEST unified with slot-based play_card |
| K11 no task | T-M2-008b + S-SAVE |
| P08 on M1 | M1 P01–P07; P08 on M2 |
| Phaser in core wording | render-phaser only |
| Six AGENTS areas missing | STYLE, SECURITY, CONTRIBUTING, expanded AGENTS |
| i18n/a11y silent | OOS-05, OOS-06 |
| S-NET task “write file” | Confirm existing |
| Broken AGENTS path | `../../../AGENTS.md` |

## Remaining residual (acceptable at implement time)

| ID | Item | When filled |
|----|------|-------------|
| R1 | Full 15 recipe **file bodies** on disk | M3–M5 tasks (IDs frozen in 11) |
| R2 | Exact Phaser patch version | package.json at M1 |
| R3 | Headless canvas vs pure null screenshot | decide in T-M2-008d |
| R4 | Net lag compensation | OOS beyond S-NET spike |
| R5 | C4 code diagrams | after code exists |

## Honest statement

Planning is **complete for AI-led implementation of the full engine** with contracts and tasks.  
Agents must still **write code**; they must not invent product scope, APIs, or genre rules outside `specs/` + `20`.
