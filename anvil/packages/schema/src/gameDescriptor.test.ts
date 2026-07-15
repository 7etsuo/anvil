import { describe, expect, it } from "vitest";
import { GameYamlSchema, normalizeModules } from "./gameDescriptor.js";

describe("GameYamlSchema", () => {
  it("parses hello-empty shape", () => {
    const r = GameYamlSchema.parse({
      id: "hello-empty",
      title: "Hello Empty",
      genre: "none",
      modules: [],
      entryScene: "main",
    });
    expect(r.contentRoot).toBe("content");
    expect(r.assetsRoot).toBe("assets");
    expect(r.schemaVersion).toBe(1);
  });

  it("rejects path traversal asset ids in EntityId style", () => {
    expect(() =>
      GameYamlSchema.parse({
        id: "Bad_ID",
        title: "x",
        genre: "none",
        entryScene: "main",
      }),
    ).toThrow();
  });
});

describe("normalizeModules", () => {
  it("auto-appends genre-card", () => {
    expect(normalizeModules("card", [])).toEqual(["genre-card"]);
  });
});
