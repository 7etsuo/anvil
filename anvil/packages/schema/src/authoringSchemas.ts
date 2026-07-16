import { z } from "zod";
import { EntityId } from "./gameDescriptor.js";

const JsonRecordSchema = z.record(z.unknown());

export const TraitDefSchema = z.object({
  id: EntityId,
  requires: z.array(EntityId).default([]),
  conflicts: z.array(EntityId).default([]),
  components: JsonRecordSchema.default({}),
});

export const PrefabDefSchema = z.object({
  id: EntityId,
  parent: EntityId.optional(),
  traits: z.array(EntityId).default([]),
  components: JsonRecordSchema.default({}),
});

export const ValueRefSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
  z.object({ path: z.string().min(1) }),
]);

export type Condition =
  | { op: "always" }
  | { op: "all"; conditions: Condition[] }
  | { op: "any"; conditions: Condition[] }
  | { op: "not"; condition: Condition }
  | { op: "flag"; key: string; eq: boolean }
  | { op: "compare"; left: z.infer<typeof ValueRefSchema>; cmp: "eq" | "neq" | "gt" | "gte" | "lt" | "lte"; right: z.infer<typeof ValueRefSchema> }
  | { op: "event"; name: string }
  | { op: "area"; id: string; entity?: string }
  | { op: "has_item"; item: string; count: number }
  | { op: "quest"; id: string; status: "inactive" | "active" | "complete" };

export const ConditionSchema: z.ZodType<Condition, z.ZodTypeDef, unknown> = z.lazy(() =>
  z.discriminatedUnion("op", [
    z.object({ op: z.literal("always") }),
    z.object({ op: z.literal("all"), conditions: z.array(ConditionSchema).min(1) }),
    z.object({ op: z.literal("any"), conditions: z.array(ConditionSchema).min(1) }),
    z.object({ op: z.literal("not"), condition: ConditionSchema }),
    z.object({ op: z.literal("flag"), key: EntityId, eq: z.boolean().default(true) }),
    z.object({
      op: z.literal("compare"),
      left: ValueRefSchema,
      cmp: z.enum(["eq", "neq", "gt", "gte", "lt", "lte"]),
      right: ValueRefSchema,
    }),
    z.object({ op: z.literal("event"), name: EntityId }),
    z.object({ op: z.literal("area"), id: EntityId, entity: EntityId.optional() }),
    z.object({ op: z.literal("has_item"), item: EntityId, count: z.number().int().positive().default(1) }),
    z.object({ op: z.literal("quest"), id: EntityId, status: z.enum(["inactive", "active", "complete"]) }),
  ]),
);

export const EffectSchema = z.discriminatedUnion("op", [
  z.object({ op: z.literal("set_flag"), key: EntityId, value: z.boolean() }),
  z.object({ op: z.literal("add_counter"), key: EntityId, amount: z.number() }),
  z.object({ op: z.literal("emit"), event: EntityId, data: JsonRecordSchema.optional() }),
  z.object({ op: z.literal("spawn"), prefab: EntityId, id: EntityId.optional(), at: z.object({ x: z.number(), y: z.number() }).optional() }),
  z.object({ op: z.literal("despawn"), entity: EntityId }),
  z.object({ op: z.literal("grant_item"), item: EntityId, count: z.number().int().positive().default(1) }),
  z.object({ op: z.literal("remove_item"), item: EntityId, count: z.number().int().positive().default(1) }),
  z.object({ op: z.literal("start_quest"), quest: EntityId }),
  z.object({ op: z.literal("advance_quest"), quest: EntityId, step: EntityId.optional() }),
  z.object({ op: z.literal("scene"), scene: EntityId }),
  z.object({ op: z.literal("damage"), target: EntityId, amount: z.number().positive(), damageType: EntityId.optional() }),
  z.object({ op: z.literal("heal"), target: EntityId, amount: z.number().positive() }),
  z.object({ op: z.literal("play_audio"), cue: EntityId }),
]);

export const TriggerDefSchema = z.object({
  id: EntityId,
  when: ConditionSchema,
  then: z.array(EffectSchema).min(1),
  else: z.array(EffectSchema).optional(),
  once: z.boolean().default(false),
  cooldownMs: z.number().nonnegative().default(0),
});

export const StateTransitionSchema = z.object({
  to: EntityId,
  when: ConditionSchema,
  effects: z.array(EffectSchema).default([]),
});

export const StateDefSchema = z.object({
  id: EntityId,
  enter: z.array(EffectSchema).default([]),
  exit: z.array(EffectSchema).default([]),
  transitions: z.array(StateTransitionSchema).default([]),
});

export const StateMachineDefSchema = z
  .object({
    id: EntityId,
    initial: EntityId,
    states: z.array(StateDefSchema).min(1),
  })
  .superRefine((machine, ctx) => {
    const ids = new Set(machine.states.map((state) => state.id));
    if (!ids.has(machine.initial)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["initial"], message: `Unknown initial state: ${machine.initial}` });
    }
    machine.states.forEach((state, stateIndex) => {
      state.transitions.forEach((transition, transitionIndex) => {
        if (!ids.has(transition.to)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["states", stateIndex, "transitions", transitionIndex, "to"],
            message: `Unknown transition state: ${transition.to}`,
          });
        }
      });
    });
  });

export type TraitDef = z.infer<typeof TraitDefSchema>;
export type PrefabDef = z.infer<typeof PrefabDefSchema>;
export type Effect = z.infer<typeof EffectSchema>;
export type TriggerDef = z.infer<typeof TriggerDefSchema>;
export type StateMachineDef = z.infer<typeof StateMachineDefSchema>;
