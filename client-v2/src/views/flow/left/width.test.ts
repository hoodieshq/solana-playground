import { clampLeftWidth, DEFAULT_LEFT_WIDTH, MIN_LEFT_WIDTH } from "./width";

describe("clampLeftWidth", () => {
  it("leaves a width between the bounds alone", () => {
    expect(clampLeftWidth(300, 1600)).toBe(300);
    expect(clampLeftWidth(DEFAULT_LEFT_WIDTH, 1600)).toBe(DEFAULT_LEFT_WIDTH);
  });

  it("holds the floor when dragged narrower", () => {
    expect(clampLeftWidth(40, 1600)).toBe(MIN_LEFT_WIDTH);
  });

  it("holds a ceiling proportional to the viewport", () => {
    expect(clampLeftWidth(9999, 1600)).toBe(480);
    expect(clampLeftWidth(9999, 1000)).toBe(300);
  });

  it("keeps the panel usable when the ceiling falls below the floor", () => {
    // 30% of 600px is 180px, under the floor -- a panel too narrow to use is
    // worse than a cramped editor
    expect(clampLeftWidth(300, 600)).toBe(MIN_LEFT_WIDTH);
    expect(clampLeftWidth(50, 600)).toBe(MIN_LEFT_WIDTH);
  });
});
