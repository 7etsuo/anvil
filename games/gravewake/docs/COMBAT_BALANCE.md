# Gravewake — original combat and balance targets (historical)

> **Historical design archive — not a current runtime contract.** This file
> preserves the original vertical-slice intent. Do not use its controls,
> filenames, IDs, scope, balance numbers, scene plan, or asset status to change
> the active game. Start with [`../README.md`](../README.md),
> [`INDEX.md`](./INDEX.md), [`SYSTEMS.md`](./SYSTEMS.md), current `content/`, and
> current source.

Numbers are **starting targets**. Tune after greybox, but do not add new stats without docs update.

**World unit:** 1 unit ≈ 1 px at design zoom (Phaser world). Camera zoom may scale view; keep hitboxes in world units.

---

## 1. Damage formula

```
raw = abilityBaseDamage * (1 + attacker.damageStat / 100)
mitigated = raw * (100 / (100 + defender.armor))
final = max(1, floor(mitigated))
```

- No crit in v1  
- No elemental resists  
- Shield (Grave Veil) absorbs before HP  

---

## 2. Player base stats (naked, level 1)

| Stat | Value |
|------|-------|
| Level | 1 (max 20) — see PROGRESSION.md |
| Max HP | 100 + `(level-1)*8` + gear |
| Damage stat | `(level-1)*1` + gear |
| Armor | `floor(level/2)` + gear |
| Move speed | 160 units/s |
| Dodge distance | 120 |
| Dodge duration | 0.28 s |
| Dodge i-frames | 0.22 s from start |
| Dodge cooldown | 1.4 s (1.2 s at level ≥15) |
| Potion heal | 40 HP |
| Potion max stack | 5 / 6 / 7 / 8 by level band (PROGRESSION) |
| Start potions | 3 |
| Start gold | 25 |

### Level skill ranks (passive)

| Level | Effect |
|-------|--------|
| 5 | Cinder Nova radius 96→112 |
| 10 | Grave Veil shield +15 |
| 15 | Ash Step CD −0.2s |
| 20 | Rite Slash base damage +4 |

### Ability numbers

| Ability | Base damage | Cooldown | Notes |
|---------|-------------|----------|-------|
| Rite Slash | 12 | 0.45 s swing lock (can buffer) | Cone 90°, range 72 |
| Cinder Nova | 28 | 5.0 s | Radius 96 |
| Grave Veil | 0 | 8.0 s | Shield **35** HP, duration **3.0 s**, slow aura 35% for 2.5 s, radius 64 |
| Ash Step | 0 | 1.4 s | See dodge |

---

## 3. Enemy stats

Base stats at their **native level**. Optional slight scaling if used outside band:  
`hp *= 1 + 0.04*(enemyLevel-native)` (cap ±20%).

| ID | Native Lv | HP | Damage | Armor | Move | Aggro | Base XP |
|----|-----------|-----|--------|-------|------|-------|---------|
| `scuttler` | 3 | 28 | 7 | 0 | 110 | 280 | 12 |
| `wretch` | 3 | 22 | 9 (arrow) | 0 | 95 | 320 | 15 |
| `crypt_guard` | 6 | 160 | Cleave 16 / Bash 12 / Slam 22 | 8 | 85 | 300 | 80 |
| `bellwarden` | 12 | 900 | P1 Swing 18 / Hammer 24; P2 higher | 12 | 70–80 | arena | 500 |

Overworld pack enemy levels: see OVERWORLD pack bands (override native for XP mult).

### Enemy ability details

**Scuttler swipe:** range 48, active 0.1s, recovery 0.45s  

**Wretch arrow:** speed 220, damage 9, max range 420, shot CD 1.3s after recovery  

**Crypt Guard**
- Cleave: cone 120°, range 80, CD chain  
- Bash: range 56, applies hitstun 0.25s player (cannot attack; can still dodge)  
- Bell Toll Slam: telegraph 0.7s danger radius 70 at guard feet; damage 22; used every 3rd attack action  

**Bellwarden**
- Attack cadence P1: 1.8–2.4s between actions  
- P2: 1.3–1.8s  
- Summon CD 12s, max 4 adds  
- Peal: ring expands 0→220 radius over 1.1s; damage once per peal on cross  
- Phase transition: 50% HP, 1.0s immune, knockback light  

---

## 4. Player effective HP budget (design intent)

- Naked vs scuttler: ~12 hits to die  
- With starter armor (~+20 HP / +3 armor): comfortable  
- Boss: learn telegraphs; 2–4 potions expected  
- Elite: dangerous if ignored; should not one-shot with veil up  

---

## 5. Stun / CC rules

| Effect | On player | On enemy |
|--------|-----------|----------|
| Hitstun (bash) | 0.25s action lock | n/a |
| Slow (veil) | n/a | 35% movespeed |
| i-frames | Immune damage | n/a |
| Boss immune | only phase transition | — |

No stun on boss. Adds can be cleaved freely.

---

## 6. Loot combat hooks

- Champion/elite glow: code outline color, not extra sheet required  
- On-hit spark: `fx_impact`  
- Floating damage numbers: white normal, orange player crit n/a, red player HP loss optional  

---

## 7. Difficulty single-knob (future)

Global multipliers (not exposed v1):
- `enemyHpMul = 1`  
- `enemyDmgMul = 1`  
- `playerDmgMul = 1`  

---

## 8. Tune log

| Date | Change | Reason |
|------|--------|--------|
| 2026-07-15 | Initial locks | GDD freeze |
