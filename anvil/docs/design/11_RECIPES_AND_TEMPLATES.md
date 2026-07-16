# 11 — Recipes and templates

Templates are complete schema-v1 starter packages used by `anvil new`.
Recipes are small declarative file patches an agent can inspect and apply
manually.

## Current templates

| Template | Genre | Current project schema |
|----------|-------|------------------------|
| `card-starter` | card | v1 |
| `topdown-starter` | topdown2d | v1 |
| `vn-starter` | vn | v1 |
| `shmup-starter` | shmup | v1 |
| `fps2-starter` | fps2 | v1 |

The `none` scaffold is derived from the empty example. There is no ARPG starter
yet. Every example/template now contains a `game.spec.yaml` file, but its
manifest remains schema v1 and the generic CLI does not compile that intent.

## Current recipe storage and shape

Recipes are individual YAML files under
`packages/recipes/recipes/<id>.yaml`, not nested `<id>/recipe.yaml`
directories. A recipe contains id/title/genre, one or more target file entries,
optional tests, and validation intent. `recipe show` prints the descriptor; it
does not write files.

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

## Implemented recipe catalog

There are 19 recipes:

- Card: `card.basic-attack`, `card.defend`, `card.draw`,
  `card.enemy-basic`, `card.win-lose-ui`
- Top-down: `topdown.wasd-player`, `topdown.chase-enemy`,
  `topdown.solid-walls`, `topdown.contact-damage`, `topdown.restart`
- VN: `vn.linear-scene`, `vn.two-choice`
- Shmup: `shmup.player-ship`, `shmup.wave-1`, `shmup.bullet-player`
- FPS2: `fps2.corridor`
- Meta: `meta.observe-smoke`, `meta.cinematic-stub`, `meta.net-loopback`

Use the live catalog rather than copying this list when automating:

```bash
pnpm anvil recipe list
pnpm anvil recipe show card.basic-attack
```

## Agent quality check

After manually applying a recipe:

1. confirm every path stays inside the game root;
2. adapt ids/references without inventing unsupported fields;
3. run `validate`;
4. run the recipe's or title's scenario tests; and
5. inspect state/visual output if behavior is not obvious.

Schema-v2 template migration, automatic intent compilation, and an ARPG
starter are pending M10/M11 tasks.
