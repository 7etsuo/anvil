import { z } from "zod";
import { EntityId } from "./gameDescriptor.js";

export const RequirementCategorySchema = z.enum([
  "lifecycle",
  "input",
  "spatial",
  "rules",
  "state",
  "win_loss",
  "restart",
  "feedback",
  "content",
  "presentation",
  "accessibility",
]);

export const RequirementPrioritySchema = z.enum(["must", "should", "could"]);
export const QualityProfileSchema = z.enum(["smoke", "playable", "excellent"]);

export const GameRequirementSchema = z.object({
  id: EntityId,
  category: RequirementCategorySchema,
  priority: RequirementPrioritySchema.default("must"),
  description: z.string().min(1),
  weight: z.number().int().min(1).max(10).default(5),
  verify: z.array(EntityId).default([]),
});

export const GameIntentSchema = z
  .object({
    schemaVersion: z.literal(2),
    summary: z.string().min(1),
    quality: QualityProfileSchema.default("playable"),
    players: z.object({ min: z.number().int().min(1).default(1), max: z.number().int().min(1).default(1) }).default({ min: 1, max: 1 }),
    platforms: z.array(z.enum(["web", "desktop", "mobile"])).min(1).default(["web"]),
    requirements: z.array(GameRequirementSchema).min(1),
  })
  .superRefine((intent, ctx) => {
    if (intent.players.max < intent.players.min) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["players", "max"],
        message: "players.max must be >= players.min",
      });
    }
    const seen = new Set<string>();
    intent.requirements.forEach((requirement, index) => {
      if (seen.has(requirement.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["requirements", index, "id"],
          message: `Duplicate requirement id: ${requirement.id}`,
        });
      }
      seen.add(requirement.id);
    });
  });

export type GameIntent = z.infer<typeof GameIntentSchema>;
export type GameRequirement = z.infer<typeof GameRequirementSchema>;
export type QualityProfile = z.infer<typeof QualityProfileSchema>;
