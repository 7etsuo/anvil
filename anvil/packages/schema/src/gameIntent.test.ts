import { describe, expect, it } from "vitest";
import { GameIntentSchema } from "./gameIntent.js";

describe("GameIntentSchema", () => {
  it("parses a compact agent intent contract with defaults", () => {
    const intent = GameIntentSchema.parse({
      schemaVersion: 2,
      summary: "A deterministic test game.",
      requirements: [
        {
          id: "lifecycle.start",
          category: "lifecycle",
          description: "The game starts.",
        },
      ],
    });
    expect(intent.quality).toBe("playable");
    expect(intent.players).toEqual({ min: 1, max: 1 });
    expect(intent.requirements[0]?.weight).toBe(5);
  });

  it("rejects duplicate requirement ids and inverted player bounds", () => {
    const result = GameIntentSchema.safeParse({
      schemaVersion: 2,
      summary: "Broken intent.",
      players: { min: 2, max: 1 },
      requirements: [
        { id: "same", category: "rules", description: "One" },
        { id: "same", category: "rules", description: "Two" },
      ],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.message)).toEqual(
        expect.arrayContaining([
          "players.max must be >= players.min",
          "Duplicate requirement id: same",
        ]),
      );
    }
  });
});
