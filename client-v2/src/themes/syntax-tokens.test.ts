import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Code reads these tokens on both grounds, so a value tuned for one theme and
 * shared with the other comes out unreadable: the dark values once left
 * Light's plain code at 1.27:1 on white.
 */
const TOKENS = fs.readFileSync(
  path.join(__dirname, "../app/styles/playground-tokens.css"),
  "utf8"
);

const SYNTAX = [
  "--syntax-keyword",
  "--syntax-type",
  "--syntax-function",
  "--syntax-string",
  "--syntax-number",
  "--syntax-comment",
  "--syntax-plain",
];

/** The body of every block with this selector, in file order */
const blocks = (selector: string) =>
  TOKENS.split(/\n(?=\S)/)
    .filter((part) => part.startsWith(`${selector} {`))
    .map((part) => part.slice(0, part.indexOf("\n}")));

const value = (block: string, token: string) =>
  block.match(new RegExp(`${token}:\\s*(#[0-9a-f]{6})`, "i"))?.[1];

const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5]
    .map((at) => parseInt(hex.slice(at, at + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrast = (a: string, b: string) => {
  const [dark, light] = [luminance(a), luminance(b)].sort((x, y) => x - y);
  return (light + 0.05) / (dark + 0.05);
};

describe("syntax tokens", () => {
  const [light, shared] = blocks(":root");
  const [dark] = blocks(".dark");

  it.each(SYNTAX)("%s has a value of its own in each theme", (token) => {
    expect(value(light, token)).toBeDefined();
    expect(value(dark, token)).toBeDefined();
    expect(value(shared, token)).toBeUndefined();
  });

  describe.each([
    "--surface-base",
    "--surface-panel",
    "--surface",
    "--surface-raised",
  ])("on Light's %s", (ground) => {
    it.each(SYNTAX)("%s reaches 4.5:1", (token) => {
      const ratio = contrast(value(light, token)!, value(light, ground)!);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });
  });
});
