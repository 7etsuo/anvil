# Gravewake current progression and combat values

This document mirrors [`../content/progression.json`](../content/progression.json)
and the implemented character/skill rules. Content JSON and code are
authoritative if this document drifts.

## Starting character

| Field | Value |
|-------|-------|
| Level / total XP | 1 / 0 |
| Base maximum HP | 130 |
| Base damage | 11 |
| Base armor | 2 |
| Base speed | 205 |
| Base critical chance | 8% |
| Base critical multiplier | 1.8× |
| Gold | 40 |
| Backpack capacity | 32 stacks |
| Starting equipment | Level-1 rolled Rusty Sword |
| Starting consumables | 5 health potions |
| Skill points | 1 |

Final combat stats are base stats plus rolled equipped-item values, skill-tree
bonuses, and active status modifiers.

## XP thresholds

XP is cumulative. The explicit table supplies the next-level threshold through
level 15:

| Reach level | Total XP required |
|-------------|-------------------|
| 2 | 40 |
| 3 | 100 |
| 4 | 180 |
| 5 | 280 |
| 6 | 400 |
| 7 | 550 |
| 8 | 750 |
| 9 | 1,000 |
| 10 | 1,300 |
| 11 | 1,700 |
| 12 | 2,200 |
| 13 | 2,800 |
| 14 | 3,600 |
| 15 | 4,500 |

After the table, the previous per-level XP step grows by 12%, rounded to a
whole number, and is added to the prior cumulative threshold. Maximum level is
100.

On every level gained:

- base maximum HP increases by 8;
- base damage increases by 1;
- current HP is restored to the new maximum;
- one health potion is granted;
- mana/stamina resource pools are filled; and
- one skill point is granted while the sample combat tree is incomplete.

Armor does not increase automatically with level.

## XP per kill

| Enemy | XP | Enemy | XP |
|-------|---:|-------|---:|
| Fallen | 6 | Raider | 20 |
| Thrall | 8 | Crypt Archer | 22 |
| Scuttler | 10 | Hell Raider | 28 |
| Bone Hound | 11 | Crypt Guard | 30 |
| Shade | 12 | Bone Brute | 40 |
| Wretch | 13 | Bellwarden | 180 |
| Plague Scuttler | 14 | Death Knight | 220 |
| Void Shade | 16 | Bone Tyrant | 350 |
| Ash Ghoul | 18 | | |

Elite enemies award 2.5× the base XP, rounded down. There is no level-difference
modifier or pack-clear XP bonus in the current implementation.

## Abilities

| Input | Ability | Damage/range | Cost | Cooldown |
|-------|---------|--------------|------|----------|
| Space/RMB | Slash | 1.0× effective damage, physical, range 80 | — | 260 ms |
| 2 | Whirl | 0.78× effective damage, physical AoE, range 104 | 18 stamina | 800 ms |
| 3 | Smite | 1.4× effective damage, holy projectile, range 170 | 12 mana | 620 ms |
| 1 | Potion | Heal 50, capped by current max HP | 1 potion | 400 ms |

Critical hits use the effective critical chance/multiplier. Enemy mitigation
uses armor and typed resistances through Anvil combat systems.

## Skill choices

The engine sample combat tree is currently used:

| Node | Ranks/requirement | Effect data |
|------|-------------------|-------------|
| Power | 3 ranks | +2 damage per rank |
| Iron Skin | 3 ranks | +2 armor per rank |
| Whirlwind | Requires Power, level 3 | Ability-unlock metadata |
| Smite | Requires Power + Iron Skin, level 5 | Ability-unlock metadata |

The title currently accepts the Whirl and Smite combat inputs regardless of
tree metadata; the chosen Power/Iron Skin bonuses do affect effective stats.
Treat stricter ability gating as future work unless code and tests change.

## Threat scaling

Current threat tier:

```text
area threat
+ (level - 1) × 0.12
+ kills × 0.02
+ bosses killed × 0.25
```

Authored area threat is 0 in Lychgate, 1 in Ashen Wastes, 2 in Bellcrypt, 3 in
Howling Catacombs, and 4 in Bonekeep.

Enemy scaling from the resulting threat `t`:

```text
HP multiplier     = 1 + t × 0.35
damage multiplier = 1 + t × 0.18
speed multiplier  = 1 + min(0.35, t × 0.04)
```

## Economy and items

- Ash Shrine vendor starts with potions (25 gold), rubies (40), and sapphires
  (40); its sell ratio is 0.4.
- Crafting recipes brew potions, cut a ruby bundle, and temper Ash Mail into a
  Warden Cloak using the authored inputs/costs shown in the craft panel.
- Gems can be socketed into eligible equipped weapon/chest/head gear, up to the
  engine-enforced socket limit.
- Loot rolls item level and requirement level through Anvil itemization; title
  tests enforce usable level ranges.

The live item definitions under [`../content/items/`](../content/items/) and
loot tables under [`../content/loot/`](../content/loot/) replace the historical
fixed item/affix tables.

## Save and death

Level, XP, character sheet, inventory, equipment, wallet, skill tree, area,
position, and run counters are persisted. The browser saves every 15 seconds
and at important events.

Death currently has no implemented XP or gold penalty. It requires a page
reload, which restores the latest saved state. Older 30%-gold-loss/town-respawn
documentation is historical and must not be implemented without updating the
current intent, code, and tests.
