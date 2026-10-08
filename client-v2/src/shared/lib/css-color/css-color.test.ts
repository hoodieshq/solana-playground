import { describe, expect, it } from "vitest";

import { isTransparent, resolveColor, toHex, TRANSPARENT } from "./css-color";

describe("toHex", () => {
  it.each([
    ["rgb(16, 16, 17)", "#101011"],
    ["rgb(16 16 17)", "#101011"],
    ["rgba(0, 0, 0, 0)", "#00000000"],
    ["rgba(153, 69, 255, 0.5)", "#9945ff80"],
    ["rgb(153 69 255 / 50%)", "#9945ff80"],
    ["color(srgb 0.6 0.270588 1)", "#9945ff"],
    ["color(srgb 0.6 0.270588 1 / 0.39)", "#9945ff63"],
  ])("%s -> %s", (computed, hex) => {
    expect(toHex(computed)).toBe(hex);
  });

  it.each(["", "var(--x)", "oklch(0.7 0.1 200)", "not a colour"])(
    "returns null for %j",
    (computed) => {
      expect(toHex(computed)).toBeNull();
    }
  );
});

describe("isTransparent", () => {
  it("knows the computed transparent black", () => {
    expect(isTransparent("rgba(0, 0, 0, 0)")).toBe(true);
    expect(isTransparent("rgb(0, 0, 0)")).toBe(false);
  });
});

describe("resolveColor", () => {
  it("falls back to transparent when the browser cannot compute the value", () => {
    // jsdom does not resolve custom properties, so the computed colour is
    // not one `toHex` reads: the case of a misspelt token in a real browser
    expect(resolveColor("var(--no-such-token)")).toBe(TRANSPARENT);
  });
});
