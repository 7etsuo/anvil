# Gravewake — Progression: XP, Levels & Power (Locked)

Diablo-like **character level** + **gear** dual progression.  
Skills stay the same kit; levels make the body stronger. Gear is still the big spike.

---

## 1. Goals

| Goal | How |
|------|-----|
| “I want to grind” | Cinder Parish packs respawn + XP |
| “I want to get stronger” | Levels + loot + vendor |
| “I want to win” | Enter Bellcrypt with level + gear, kill Bellwarden |

**No skill tree / class change in v1.**  
Level rewards = **stats** + **potion capacity milestones** + feel (level-up FX).

---

## 2. Level range

| Field | Value |
|-------|-------|
| Start level | **1** |
| Max level v1 | **20** |
| Soft story target for boss | **Level 8–12** |
| Open-world grind comfort | Levels 1–15 easily in Parish |
| Levels 16–20 | Slower; dungeon clears + elites |

---

## 3. XP curve

XP to go from level `L` to `L+1`:

```
xpToNext(L) = floor(40 * L^1.65 + 20)
```

| Level | XP to next (approx) | Cumulative to reach (approx) |
|-------|---------------------|------------------------------|
| 1→2 | 60 | 60 |
| 2→3 | 105 | 165 |
| 3→4 | 160 | 325 |
| 4→5 | 220 | 545 |
| 5→6 | 290 | 835 |
| 6→7 | 365 | 1200 |
| 7→8 | 450 | 1650 |
| 8→9 | 540 | 2190 |
| 9→10 | 640 | 2830 |
| 10→11 | 740 | 3570 |
| 12→13 | ~980 | — |
| 15→16 | ~1450 | — |
| 19→20 | ~2200 | — |

Exact values implemented from formula in code; table is design intent.

### XP rewards (base)

| Kill | Base XP | Notes |
|------|---------|-------|
| `scuttler` | 12 | |
| `wretch` | 15 | |
| `crypt_guard` | 80 | |
| `bellwarden` | 500 | Once per kill (repeatable if farmed later) |
| Pack clear bonus | +10% of pack sum | When last member dies |

### Level difference modifier

```
mult = clamp(1 + 0.05 * (enemyLevel - playerLevel), 0.25, 1.25)
xpGain = floor(baseXP * mult)
```

Overworld packs use `enemyLevel` = midpoint of pack band (see overworld doc).  
Dungeon enemies:

| Zone | Enemy level |
|------|-------------|
| Bellcrypt R0–R4 | 5 |
| R5–R8 | 7 |
| R9–R10 | 9 |
| R11 boss | 12 |

---

## 4. What you gain per level

On level-up:

| Stat | Gain per level |
|------|----------------|
| Max HP | **+8** |
| Damage stat | **+1** |
| Armor | **+0.5** (floor per level: +0 L1, +1 L2, +1 L3, +2 L4…) → implement as `floor(level/2)` total armor from levels, recalculated |
| Move speed | **+0** (gear only) |

**Recalculate derived:**

```
levelHpBonus = (level - 1) * 8
levelDmgBonus = (level - 1) * 1
levelArmorBonus = floor(level / 2)
```

Full heal **optional on level-up: Yes — restore HP to max** (satisfying Diablo feel).

### Potion capacity milestones

| Level | Max potions |
|-------|-------------|
| 1–4 | 5 |
| 5–9 | 6 |
| 10–14 | 7 |
| 15–20 | 8 |

### Skill ranks (no new buttons — passive power)

| Level | Unlock |
|-------|--------|
| 1 | All skills available |
| 5 | Cinder Nova radius **+16** (96→112) |
| 10 | Grave Veil shield **+15** |
| 15 | Ash Step cooldown **−0.2s** |
| 20 | Rite Slash base damage **+4** |

Document in COMBAT as level-scaled modifiers.

---

## 5. HUD

| Element | Source |
|---------|--------|
| XP bar under HP | Code |
| Level number | Code |
| Level-up flash | `fx_levelup` Imagine + `sfx_levelup` |
| Floating “LEVEL UP” | Code text |

---

## 6. Save fields

```json
{
  "level": 1,
  "xp": 0,
  "xpToNext": 60
}
```

Persist always.

---

## 7. Death & XP

- **No XP loss on death**  
- Gold loss only (30%)  

---

## 8. Gear vs level (design intent)

| Power source | Share of “feel strong” |
|--------------|------------------------|
| Levels 1→10 | ~40% |
| Gear upgrades | ~50% |
| Skill rank thresholds | ~10% |

Boss at level 3 should be **brutal**; at 10 + rare gear **fair**; at 15+ **dominant**.

---

## 9. Anti-frustration

- Overworld always available from town  
- No level gate hard-lock on Bellcrypt mouth (can enter at 1 — suicide allowed)  
- Soft warning first enter if level &lt; 5: “The crypt runs deep. The Parish can harden you first.” (dismissible)  

---

## 10. Out of scope v1

- Paragon / infinite levels  
- Respec  
- Multiple classes  
- XP boosters / battle pass  
