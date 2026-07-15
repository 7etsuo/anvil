/**
 * Zod schemas for content JSON — agent-facing validation with clear paths.
 * Folder convention under contentRoot drives which schema applies.
 */
import { z } from "zod";
import { EntityId } from "./gameDescriptor.js";

export const StatsPartialSchema = z
  .object({
    maxHp: z.number().optional(),
    damage: z.number().optional(),
    armor: z.number().optional(),
    speed: z.number().optional(),
    critChance: z.number().min(0).max(1).optional(),
    critMult: z.number().min(1).optional(),
  })
  .passthrough();

export const EquipSlotSchema = z.enum([
  "weapon",
  "offhand",
  "head",
  "chest",
  "hands",
  "feet",
  "ring",
  "amulet",
  "trinket",
]);

export const ItemDefSchema = z.object({
  id: EntityId,
  name: z.string().min(1),
  rarity: z
    .enum(["common", "magic", "rare", "unique", "set"])
    .optional(),
  maxStack: z.number().int().min(1).optional(),
  slot: EquipSlotSchema.optional(),
  stats: StatsPartialSchema.optional(),
  icon: z.string().optional(),
  flavor: z.string().optional(),
  data: z.record(z.unknown()).optional(),
});

export const LootEntrySchema = z.object({
  item: z.string().min(1),
  weight: z.number().positive(),
  min: z.number().int().min(0).optional(),
  max: z.number().int().min(0).optional(),
});

export const LootTableSchema = z
  .object({
    id: EntityId,
    entries: z.array(LootEntrySchema).min(1),
  })
  .superRefine((t, ctx) => {
    for (let i = 0; i < t.entries.length; i++) {
      const e = t.entries[i]!;
      if (e.max !== undefined && e.min !== undefined && e.max < e.min) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "max must be >= min",
          path: ["entries", i, "max"],
        });
      }
    }
  });

export const QuestStepSchema = z.object({
  id: EntityId,
  description: z.string().min(1),
  completeFlag: z.string().optional(),
  countKey: z.string().optional(),
  countTarget: z.number().int().positive().optional(),
});

export const QuestDefSchema = z.object({
  id: EntityId,
  title: z.string().min(1),
  description: z.string().optional(),
  steps: z.array(QuestStepSchema).min(1),
  autoStart: z.boolean().optional(),
  rewards: z
    .object({
      xp: z.number().optional(),
      gold: z.number().optional(),
      items: z.array(z.string()).optional(),
    })
    .optional(),
});

export const AudioJsonSchema = z.object({
  cues: z.record(z.string()).optional(),
});

/** Topdown / ARPG actor content */
export const ActorDefSchema = z.object({
  id: EntityId,
  name: z.string().optional(),
  hp: z.number().positive(),
  speed: z.number().nonnegative(),
  ai: z
    .enum(["none", "chase_melee", "keep_distance_ranged"])
    .optional(),
  team: z.enum(["player", "enemy", "neutral"]).optional(),
  radius: z.number().positive().optional(),
  contactDamage: z.number().optional(),
  meleeRange: z.number().optional(),
  preferredRange: z.number().optional(),
  preferredRangeBand: z.number().optional(),
  projectileDamage: z.number().optional(),
  projectileSpeed: z.number().optional(),
  projectileCooldownMs: z.number().optional(),
  projectileLifetimeMs: z.number().optional(),
  animations: z.record(z.array(z.string())).optional(),
  skills: z.array(z.string()).optional(),
});

export const MapWallSchema = z.object({
  x: z.number(),
  y: z.number(),
  w: z.number().positive(),
  h: z.number().positive(),
});

export const MapSpawnSchema = z.object({
  actor: z.string().min(1),
  x: z.number(),
  y: z.number(),
  team: z.enum(["player", "enemy", "neutral"]).optional(),
});

export const MapDefSchema = z.object({
  id: EntityId,
  width: z.number().positive(),
  height: z.number().positive(),
  walls: z.array(MapWallSchema).default([]),
  spawns: z.array(MapSpawnSchema).default([]),
  background: z.string().optional(),
});

export const AreaMapDefSchema = MapDefSchema.extend({
  portals: z
    .array(
      z.object({
        x: z.number(),
        y: z.number(),
        w: z.number().positive(),
        h: z.number().positive(),
        to: z.string(),
        spawnX: z.number(),
        spawnY: z.number(),
        requireClear: z.boolean().optional(),
      }),
    )
    .optional(),
  exits: z
    .array(
      z.object({
        edge: z.enum(["north", "south", "east", "west"]),
        to: z.string(),
        spawnX: z.number(),
        spawnY: z.number(),
        requireClear: z.boolean().optional(),
        label: z.string().optional(),
      }),
    )
    .optional(),
});

export const CardDefSchema = z.object({
  id: EntityId,
  name: z.string().min(1),
  cost: z.number().int().min(0),
  effects: z.array(z.record(z.unknown())).default([]),
  description: z.string().optional(),
});

export const EnemyCardSchema = z.object({
  id: EntityId,
  name: z.string().optional(),
  hp: z.number().positive(),
  intents: z.array(z.record(z.unknown())).optional(),
});

/** Map relative content path → schema */
export function schemaForContentPath(
  relPath: string,
): z.ZodTypeAny | null {
  const p = relPath.replace(/\\/g, "/").toLowerCase();
  if (p === "audio.json" || p.endsWith("/audio.json")) return AudioJsonSchema;
  if (p.includes("/items/") || p.startsWith("items/")) return ItemDefSchema;
  if (p.includes("/loot/") || p.startsWith("loot/")) return LootTableSchema;
  if (p.includes("/quests/") || p.startsWith("quests/")) return QuestDefSchema;
  if (p.includes("/actors/") || p.startsWith("actors/")) return ActorDefSchema;
  if (p.includes("/maps/") || p.startsWith("maps/")) return MapDefSchema;
  if (p.includes("/areas/") || p.startsWith("areas/")) return AreaMapDefSchema;
  if (p.includes("/cards/") || p.startsWith("cards/")) return CardDefSchema;
  if (p.includes("/enemies/") || p.startsWith("enemies/")) {
    // shmup enemy or card enemy — loose: require id + hp-ish
    return z.union([
      EnemyCardSchema,
      ActorDefSchema.partial({ speed: true }).extend({
        id: EntityId,
        hp: z.number().positive(),
      }),
    ]);
  }
  if (p.includes("/levels/") || p.startsWith("levels/")) {
    return z.object({ id: EntityId }).passthrough();
  }
  if (p.includes("/scripts/") || p.startsWith("scripts/")) {
    return z
      .object({
        id: EntityId.optional(),
        start: z.string(),
        nodes: z.array(z.record(z.unknown())).min(1),
      })
      .passthrough();
  }
  if (p.includes("/waves/") || p.startsWith("waves/")) {
    return z
      .object({
        id: EntityId,
        t: z.number(),
        spawns: z.array(z.record(z.unknown())),
      })
      .passthrough();
  }
  if (p.includes("/stages/") || p.startsWith("stages/")) {
    return z.object({ id: EntityId }).passthrough();
  }
  // progression.json etc.
  if (p.endsWith("progression.json")) {
    return z
      .object({
        xpPerKill: z.record(z.number()).optional(),
        xpToLevel: z.array(z.number()).optional(),
        meleeDamage: z.number().optional(),
        meleeRange: z.number().optional(),
        startGold: z.number().optional(),
        potionHeal: z.number().optional(),
      })
      .passthrough();
  }
  return null;
}

export type ItemDef = z.infer<typeof ItemDefSchema>;
export type LootTable = z.infer<typeof LootTableSchema>;
export type QuestDefContent = z.infer<typeof QuestDefSchema>;
