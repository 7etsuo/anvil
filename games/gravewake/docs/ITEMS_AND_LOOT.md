# Gravewake — original items and loot plan (historical)

> **Historical design archive — not a current runtime contract.** This file
> preserves the original vertical-slice intent. Do not use its controls,
> filenames, IDs, scope, balance numbers, scene plan, or asset status to change
> the active game. Start with [`../README.md`](../README.md),
> [`INDEX.md`](./INDEX.md), [`SYSTEMS.md`](./SYSTEMS.md), current `content/`, and
> current source.

All item IDs, stats, icons, and drop sources for v1.

---

## 1. Slots & rules

| Slot | Count | Notes |
|------|-------|-------|
| Weapon | 1 | Provides `damageStat` |
| Armor | 1 | Provides `maxHp` and/or `armor` |
| Potion | stack 0–5 | `item_potion_health` |
| Bag | 16 slots | Weapons/armor/junk |
| Key | special | `item_crypt_key` — not sellable, shows in bag |

**Equip:** replace swaps old to bag if space; else block.  
**Sell:** vendor only; key unsellable.  
**Compare:** tooltip shows Δ vs equipped.

### Rarity

| Rarity | Color (code) | Affix rolls |
|--------|--------------|------------|
| common | grey | 0 |
| magic | blue | 1 |
| rare | yellow | 2 |

Affixes from §4. Base item defines slot + base stats; affixes add.

---

## 2. Full item catalog

### 2.1 Weapons (icon each Required)

| ID | Name | Rarity base | damageStat | speed note | Icon |
|----|------|-------------|------------|------------|------|
| `weapon_ash_splinter` | Ash Splinter | common | +4 | starter | `items/item_weapon_01.png` |
| `weapon_warden_blade` | Warden Blade | common | +8 | | `items/item_weapon_02.png` |
| `weapon_bone_sabre` | Bone Sabre | magic | +11 | | `items/item_weapon_03.png` |
| `weapon_sexton_cleaver` | Sexton Cleaver | rare | +15 | | `items/item_weapon_04.png` |
| `weapon_bell_tongue` | Bell-Tongue Fang | rare | +18 | boss exclusive table | `items/item_weapon_05.png` |

**Start equipped:** `weapon_ash_splinter`.

### 2.2 Armor

| ID | Name | Rarity base | maxHp | armor | Icon |
|----|------|-------------|-------|-------|------|
| `armor_tattered_wraps` | Tattered Wraps | common | +15 | 1 | `items/item_armor_01.png` |
| `armor_grave_leathers` | Grave Leathers | common | +25 | 3 | `items/item_armor_02.png` |
| `armor_ossuary_mail` | Ossuary Mail | magic | +35 | 5 | `items/item_armor_03.png` |
| `armor_lychgate_plate` | Lychgate Plate | rare | +45 | 8 | `items/item_armor_04.png` |
| `armor_bellwarden_pall` | Bellwarden’s Pall | rare | +55 | 10 | `items/item_armor_05.png` |

**Start equipped:** `armor_tattered_wraps`.

### 2.3 Consumables & special

| ID | Name | Effect | Icon | Sell |
|----|------|--------|------|------|
| `item_potion_health` | Ashbalm Vial | +40 HP | `items/item_potion_health.png` | 10g buy / 3g sell |
| `item_crypt_key` | Crypt Key | Opens boss door | `items/item_crypt_key.png` | no |
| `item_gold` | Gold (UI) | currency | `items/item_gold.png` | n/a |

### 2.4 Affixes (rolled on magic/rare)

| Affix ID | Text | Effect | Weight |
|----------|------|--------|--------|
| `aff_dmg_s` | of Embers | +2 damageStat | 20 |
| `aff_dmg_m` | of Cinders | +4 damageStat | 12 |
| `aff_hp_s` | of the Vault | +10 max HP | 20 |
| `aff_hp_m` | of the Catacomb | +20 max HP | 12 |
| `aff_armor` | of Bone | +2 armor | 15 |
| `aff_speed` | of the Wraith | +12 move speed | 10 |
| `aff_nova` | Ash-Touched | +15% Cinder Nova damage | 8 |
| `aff_veil` | Veiled | +10 Grave Veil shield | 8 |

Rare rolls 2 distinct affixes. Magic rolls 1. Common base items can drop as magic/rare versions of same base ID with affixes (instance rolled).

**Item instance:** `{ baseId, rarity, affixes[], uuid }`

---

## 3. Drop tables

Weights are relative. Gold is separate roll.

### `table_trash` (scuttler, wretch)
| Result | Weight |
|--------|--------|
| nothing (no item) | 55 |
| gold 3–8 | (always roll gold 70% chance 2–6) |
| potion +1 (if stack <5) | 12 |
| common weapon/armor equal | 18 |
| magic weapon/armor | 5 |

### `table_elite` (crypt_guard)
| Result | Weight |
|--------|--------|
| **Crypt Key** if missing | guarantee separate |
| gold 20–40 | always |
| magic item | 40 |
| rare item | 25 |
| potion +1 | 20 |
| common item | 15 |

### `table_boss` (bellwarden)
| Result | Weight |
|--------|--------|
| gold 80–120 | always |
| rare item ×1 guarantee | — |
| second item rare or `weapon_bell_tongue` / `armor_bellwarden_pall` 30% | |
| potion refill +2 | always |

### `chest_side`
| Result | Weight |
|--------|--------|
| gold 15–30 | always |
| magic item | 50 |
| rare item | 15 |
| potion +1 | 35 |

### `barrel_break`
| Result | Weight |
|--------|--------|
| gold 1–3 | 80 |
| nothing | 20 |

### `chest_overworld` / `table_elite_open`
Same as `chest_side` / elite **without** Crypt Key. Used in Cinder Parish.

### Ground gold piles
Spawn when gold drop ≥10 as pile sprite; else auto-add.

### Level and loot (soft)
No hard item level req to equip in v1.  
Magic/rare weights can stay flat; higher zones already use elite tables more often.

---

## 4. Vendor — Sister Marrow

| Offer | Price | Stock |
|-------|-------|-------|
| Ashbalm Vial (potion) | 10g | infinite |
| Warden Blade | 40g | infinite |
| Grave Leathers | 35g | infinite |

**Sell rates:** 30% of notional value (common 15g, magic 35g, rare 60g baseline).  
**Buyback:** none.

---

## 5. Pickup flow

1. Enemy death → roll table → spawn loot bag and/or gold pile at corpse  
2. Player touch → auto loot to bag/gold; if bag full, leave bag on ground  
3. Chest → same  
4. Key → chat log “Crypt Key obtained.”  

---

## 6. Icons Required list (summary)

- weapon_01 … weapon_05  
- armor_01 … armor_05  
- potion_health, gold, crypt_key  
- world: loot_bag, gold_pile  

All in checklist.
