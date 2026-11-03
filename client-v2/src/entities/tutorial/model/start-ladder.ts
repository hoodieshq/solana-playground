/**
 * The tutorials the start offers, in the order a new developer takes them:
 * one per level, all Anchor. Home and the Tutorials page list
 * only these; every other tutorial stays registered, so its link and New
 * project's list keep it. `line` is what the Start here banner says of a
 * lesson not yet started, as the tutorial-v2 prototype's lessons write it
 * (`lessons/<slug>.ts`, `line`); a definition has no such field.
 */
export const START_LADDER = [
  { name: "Hello Anchor", line: "Write, deploy and call your first program" },
  {
    name: "Lumberjack",
    line: "Keep a player's state on chain and refill energy over time",
  },
  { name: "Zero Copy", line: "Make accounts bigger than a program's memory" },
] as const;

/** The banner's line for a tutorial of the ladder, or undefined */
export const ladderLine = (name: string): string | undefined =>
  START_LADDER.find((l) => l.name === name)?.line;

/**
 * The registered tutorials of the ladder, in its order. One that is not
 * registered (a build without its files) is left out, not invented.
 */
export const startTutorials = <T extends { name: string }>(
  all: readonly T[]
): T[] => START_LADDER.flatMap((l) => all.filter((t) => t.name === l.name));

if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;

  describe("entities/tutorial/model/start-ladder", () => {
    const named = (...names: string[]) => names.map((name) => ({ name }));

    it("keeps only the ladder's tutorials, in its order", () => {
      expect(
        startTutorials(
          named("Zero Copy", "Hello Seahorse", "Lumberjack", "Hello Anchor")
        ).map((t) => t.name)
      ).toEqual(["Hello Anchor", "Lumberjack", "Zero Copy"]);
    });

    it("leaves out a ladder tutorial that is not registered", () => {
      expect(startTutorials(named("Hello Anchor")).map((t) => t.name)).toEqual([
        "Hello Anchor",
      ]);
    });

    it("names each lesson's line", () => {
      expect(ladderLine("Hello Anchor")).toBe(
        "Write, deploy and call your first program"
      );
      expect(ladderLine("Hello Seahorse")).toBeUndefined();
    });
  });
}
