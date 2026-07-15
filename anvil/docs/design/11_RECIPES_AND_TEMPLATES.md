# 11 — Recipes and Templates

**Research:** Voyager skill library (arXiv:2305.16291); DreamGarden leaf submodules (arXiv:2410.01791).

## 1. Definitions

| Term | Meaning |
|------|---------|
| **Template** | Full starter game package from `anvil new` |
| **Recipe** | Small verified content/code patch that adds one capability |

## 2. Templates (REQ-A04)

| Template | Genre | Includes |
|----------|-------|----------|
| card-starter | card | battle scene, 8 cards, 1 enemy, tests |
| topdown-starter | topdown2d | player, slime, 1 map, tests |
| vn-starter | vn | short script, 1 choice |
| shmup-starter | shmup | ship + 3 waves |
| fps2-starter | fps2 | corridor (M7) |

## 3. Recipe format

`packages/recipes/<id>/recipe.yaml`:

```yaml
id: card.basic-attack
title: Add a basic attack card
genre: card
files:
  - path: content/cards/strike.json
    write: |
      { "id": "strike", "name": "Strike", "cost": 1,
        "effects": [{ "op": "damage", "amount": 6, "target": "enemy" }] }
tests:
  - tests/card_strike_exists.json
validate: true
```

`anvil recipe show card.basic-attack` prints files for the agent to write (or optional apply flag later).

## 4. Initial recipe backlog (≥15 for agent-ready)

### Card
1. `card.basic-attack`  
2. `card.defend`  
3. `card.draw`  
4. `card.enemy-basic`  
5. `card.win-lose-ui`  

### Topdown
6. `topdown.wasd-player`  
7. `topdown.chase-enemy`  
8. `topdown.solid-walls`  
9. `topdown.contact-damage`  
10. `topdown.restart`  

### VN
11. `vn.linear-scene`  
12. `vn.two-choice`  

### Shmup
13. `shmup.player-ship`  
14. `shmup.wave-1`  
15. `shmup.bullet-player`  

### Meta
16. `meta.observe-smoke`  
17. `meta.cinematic-stub`  

## 5. Quality bar for a recipe

- [ ] Applies cleanly to empty template of its genre  
- [ ] `anvil validate` passes  
- [ ] At least one `anvil test` asserts behavior  
- [ ] Documented one-line purpose  
- [ ] No raw Phaser imports  

## 6. Relationship to multi-agent papers

ChatDev/MetaGPT/GameGPT use roles. Anvil uses **recipes as skills** instead of mandatory multi-agent orgs (simpler ACI). Roles remain optional in human/agent process docs.
