import type { TutorialData } from "@/utils";

/**
 * The word over a tutorial card's name. In a level's group the level is the
 * heading, so it names the framework alone; in a flat list it names the level
 * and the framework. A missing part drops with its separator.
 */
export const tutorialEyebrow = (
  t: Pick<TutorialData, "level" | "framework">,
  grouped: boolean
): string =>
  (grouped ? [t.framework] : [t.level, t.framework])
    .filter(Boolean)
    .join(" · ");

if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;

  describe("widgets/catalog/lib/tutorial-eyebrow", () => {
    const anchor = { level: "Beginner" as const, framework: "Anchor" as const };

    it("names the framework alone in a level's group", () => {
      expect(tutorialEyebrow(anchor, true)).toBe("Anchor");
    });

    it("names the level and the framework in a flat list", () => {
      expect(tutorialEyebrow(anchor, false)).toBe("Beginner · Anchor");
    });

    it("drops a missing framework with its separator", () => {
      const native = { level: "Beginner" as const, framework: undefined };
      expect(tutorialEyebrow(native, false)).toBe("Beginner");
      expect(tutorialEyebrow(native, true)).toBe("");
    });
  });
}
