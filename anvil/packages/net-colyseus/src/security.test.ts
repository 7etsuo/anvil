import { describe, expect, it } from "vitest";
import {
  defaultAuthValidator,
  rateLimitAllow,
  validateInputMessage,
} from "./security.js";

describe("security", () => {
  it("rejects non-objects and strips unknown actions", () => {
    expect(validateInputMessage(null).ok).toBe(false);
    const v = validateInputMessage({
      actions: ["move_right", "hack_godmode", "move_up"],
      seq: 3,
    });
    expect(v.ok).toBe(true);
    if (v.ok) {
      expect(v.value.actions).toEqual(["move_right", "move_up"]);
      expect(v.value.seq).toBe(3);
    }
  });

  it("rate limits", () => {
    const s = { windowStartMs: 1000, count: 0 };
    expect(rateLimitAllow(s, 1000, 2, 1000)).toBe(true);
    expect(rateLimitAllow(s, 1001, 2, 1000)).toBe(true);
    expect(rateLimitAllow(s, 1002, 2, 1000)).toBe(false);
    expect(rateLimitAllow(s, 2001, 2, 1000)).toBe(true);
  });

  it("auth default checks token if provided", async () => {
    const ok = await defaultAuthValidator({ name: "A" });
    expect(ok.ok).toBe(true);
    const bad = await defaultAuthValidator({ name: "A", token: "short" });
    expect(bad.ok).toBe(false);
  });
});
