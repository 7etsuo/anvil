import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { AssetServer } from "./AssetServer.js";

describe("AssetServer", () => {
  it("returns texture for existing png and greybox for missing", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "anvil-assets-"));
    fs.mkdirSync(path.join(dir, "assets"));
    // minimal invalid png bytes still "exists"
    fs.writeFileSync(path.join(dir, "assets", "icon.png"), Buffer.from([1, 2, 3]));
    const a = new AssetServer(dir, "assets", false);
    const ok = a.getTexture("icon.png");
    expect(ok.kind).toBe("texture");
    const miss = a.getTexture("nope.png");
    expect(miss.kind).toBe("greybox");
    expect(a.missing()).toContain("nope.png");
  });

  it("rejects path traversal", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "anvil-assets-"));
    fs.mkdirSync(path.join(dir, "assets"));
    const a = new AssetServer(dir, "assets", false);
    expect(() => a.resolve("../secret.png")).toThrow();
  });
});
