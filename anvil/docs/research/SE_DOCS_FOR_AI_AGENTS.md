# How to document software for AI coding agents (research)

Sources (2025–2026 practice + papers):

| Source | Key idea |
|--------|----------|
| [AGENTS.md](https://agents.md/) | Thin “README for agents” at repo root |
| [GitHub: great AGENTS.md (2500+ repos)](https://github.blog/ai-and-ml/github-copilot/how-to-write-a-great-agents-md-lessons-from-over-2500-repositories/) | Six areas: commands, style, testing, security, PR, overview |
| [Addy Osmani: good specs for agents](https://addyosmani.com/blog/good-spec/) | Spec as PRD/SRS; executable commands; boundaries |
| [Spec-Driven Development arXiv:2602.00180](https://arxiv.org/abs/2602.00180) | Spec is source of truth; code secondary; modular specs for context windows |
| [GitHub Spec Kit](https://github.com/github/spec-kit) | specify → plan → tasks → implement |
| [Martin Fowler / SDD tools](https://martinfowler.com/articles/exploring-gen-ai/sdd-3-tools.html) | Spec = behavior-oriented NL for agents |
| [Repositories as knowledge factories (SIGPLAN)](https://blog.sigplan.org/2026/04/21/repositories-are-human-agent-knowledge-factories/) | Hierarchy: AGENTS.md → reference → specs/*.md → code |
| GameCraft / GameDevBench | Interactive verify; observe; complete artifacts |

## Hierarchy Anvil adopts (normative)

```text
Level 0  AGENTS.md (repo root)     — always loaded; pointers only
Level 1  docs/design/README.md     — map + status
Level 2  docs/design/specs/*       — full contracts (this completion)
Level 3  docs/design/0x_*.md       — architecture/requirements spine
Level 4  Source + tests             — ground truth when code exists
```

## What a complete plan must contain (checklist)

From SDD + AGENTS.md research, a complete pre-code plan includes:

1. Overview + non-goals  
2. Exact build/test commands (even if aspirational until code lands)  
3. Architecture + diagrams  
4. Requirements with IDs  
5. **Task breakdown** (atomic, ordered, dependency-aware) — Spec Kit `tasks`  
6. Component contracts (inputs/outputs/invariants)  
7. Data schemas  
8. Test strategy + acceptance  
9. ADRs  
10. Security / boundaries  
11. Gap-free genre behavior specs for **all in-scope genres**  

Anvil now implements this checklist under `docs/design/` + `docs/design/specs/` + root `AGENTS.md`.
