# How to document software for AI coding agents (research)

> **Research/process reference.** The current repository hierarchy is
> documented in [`../design/README.md`](../design/README.md); this file explains
> why that hierarchy was chosen.

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
Level 2  docs/design/20 + specs/*  — task status + full contracts
Level 3  docs/design/0x_*.md       — architecture/requirements spine
Level 4  Source + tests            — executable implementation evidence
```

## What a complete plan must contain (checklist)

From SDD + AGENTS.md research, a complete pre-code plan includes:

1. Overview + non-goals  
2. Exact build/test commands; planned commands must be visibly marked and must
   not appear in current quick starts
3. Architecture + diagrams  
4. Requirements with IDs  
5. **Task breakdown** (atomic, ordered, dependency-aware) — Spec Kit `tasks`  
6. Component contracts (inputs/outputs/invariants)  
7. Data schemas  
8. Test strategy + acceptance  
9. ADRs  
10. Security / boundaries  
11. Gap-free genre behavior specs for **all in-scope genres**  

Anvil implements this hierarchy under `docs/design/`, component specs, task
status, root `AGENTS.md`, and executable examples. The M10/M11 gap register is
an example of keeping a shipped library distinct from pending CLI integration.
