import { PgLessonHints, RUNG_COUNT } from "./hints";
import type { LessonStep } from "./types";

const step: LessonStep = {
  id: "greet",
  objective: "Give hello a name argument",
  verifiedBy: "the interface shows hello(name)",
  verify: { kind: "idl", instruction: "hello", arg: "name" },
  target: "build",
  hints: [
    "Ask me a question that points at what I am missing.",
    "Name the concept and where to look.",
    "Propose the patch.",
  ],
};

const other: LessonStep = { ...step, id: "deploy" };

describe("PgLessonHints", () => {
  beforeEach(() => PgLessonHints.reset());

  it("starts every step at rung zero", () => {
    expect(PgLessonHints.rung(step.id)).toBe(0);
  });

  it("climbs one rung per ask once an attempt exists", () => {
    expect(PgLessonHints.nextPrompt(step, true)).toContain("Hint 1 of 3");
    expect(PgLessonHints.nextPrompt(step, true)).toContain("Hint 2 of 3");
    expect(PgLessonHints.nextPrompt(step, true)).toContain("Hint 3 of 3");
    expect(PgLessonHints.rung(step.id)).toBe(RUNG_COUNT);
  });

  it("carries the step's own text for the rung it is on", () => {
    expect(PgLessonHints.nextPrompt(step, true)).toContain(step.hints[0]);
    expect(PgLessonHints.nextPrompt(step, true)).toContain(step.hints[1]);
  });

  it("names the objective, so the assistant answers inside the step", () => {
    expect(PgLessonHints.nextPrompt(step, true)).toContain(step.objective);
  });

  it("caps at rung one until an attempt exists", () => {
    expect(PgLessonHints.nextPrompt(step, false)).toContain("Hint 1 of 3");
    expect(PgLessonHints.nextPrompt(step, false)).toBeNull();
    expect(PgLessonHints.rung(step.id)).toBe(1);
  });

  it("releases the cap once an attempt exists", () => {
    PgLessonHints.nextPrompt(step, false);
    expect(PgLessonHints.nextPrompt(step, true)).toContain("Hint 2 of 3");
  });

  it("returns null past the last rung rather than repeating one", () => {
    for (let i = 0; i < RUNG_COUNT; i++) PgLessonHints.nextPrompt(step, true);
    expect(PgLessonHints.nextPrompt(step, true)).toBeNull();
  });

  it("counts each step separately", () => {
    PgLessonHints.nextPrompt(step, true);
    PgLessonHints.nextPrompt(step, true);
    expect(PgLessonHints.rung(step.id)).toBe(2);
    expect(PgLessonHints.rung(other.id)).toBe(0);
  });

  describe("onDidChange", () => {
    it("calls the subscriber once immediately, from the current count", () => {
      const cb = jest.fn();
      PgLessonHints.onDidChange(cb);
      expect(cb).toHaveBeenCalledTimes(1);
    });

    it("notifies on every climbed rung", () => {
      const cb = jest.fn();
      PgLessonHints.onDidChange(cb);
      cb.mockClear();

      PgLessonHints.nextPrompt(step, true);
      expect(cb).toHaveBeenCalledTimes(1);

      PgLessonHints.nextPrompt(step, true);
      expect(cb).toHaveBeenCalledTimes(2);
    });

    it("notifies on reset", () => {
      const cb = jest.fn();
      PgLessonHints.onDidChange(cb);
      cb.mockClear();

      PgLessonHints.reset();
      expect(cb).toHaveBeenCalledTimes(1);
    });

    it("stops notifying once disposed", () => {
      const cb = jest.fn();
      const { dispose } = PgLessonHints.onDidChange(cb);
      cb.mockClear();

      dispose();
      PgLessonHints.nextPrompt(step, true);
      expect(cb).not.toHaveBeenCalled();
    });
  });
});
