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

  it("accepts arpg genre and schemaVersion 2", () => {
    const r = GameYamlSchema.parse({
      id: "gravewake",
      title: "Gravewake",
      genre: "arpg",
      modules: ["genre-arpg"],
      entryScene: "main",
      schemaVersion: 2,
      intent: "game.spec.yaml",
    });
    expect(r.genre).toBe("arpg");
    expect(r.schemaVersion).toBe(2);
  });
});

describe("normalizeModules", () => {
  it("auto-appends genre-card", () => {
    expect(normalizeModules("card", [])).toEqual(["genre-card"]);
  });

  it("auto-appends genre-arpg", () => {
    expect(normalizeModules("arpg", [])).toEqual(["genre-arpg"]);
  });
});
