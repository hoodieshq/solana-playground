// Kept out of `present.ts`: `e2e/` imports that module, and Playwright compiles it as CommonJS, where `import.meta` is a syntax error.

import { present } from "./present";

describe("present", () => {
  it("returns a value that is there", () => {
    const box = { x: 1 };
    expect(present("the box")(box)).toBe(box);
  });

  it("keeps falsy values that are there", () => {
    expect(present("zero")(0)).toBe(0);
    expect(present("the empty string")("")).toBe("");
    expect(present("false")(false)).toBe(false);
  });

  it.each([
    // eslint-disable-next-line unicorn/no-null -- Playwright's boundingBox() and the DOM return null, which is what this guards
    ["null", null],
    ["undefined", undefined],
  ])("throws naming what was missing when the value is %s", (_, value) => {
    expect(() => present("the panel's bounding box")(value)).toThrow(
      `Expected the panel's bounding box, got ${String(value)}`
    );
  });
});
