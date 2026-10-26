// By module, not the utils barrel, which reads the build's globals on import
import type { TutorialMetadata } from "../../../utils/tutorial/types";

/** How far the user is through a tutorial, as its card shows it */
export type TutorialProgress =
  | { state: "new" }
  | { state: "started"; page: number; pages: number }
  | { state: "completed" };

/**
 * A tutorial's progress from whether its workspace exists and what it saved.
 * A started tutorial whose saved progress cannot be read (`meta` null) is
 * on page 1, where `PgTutorial.open` takes it too.
 */
export const progressOf = (
  started: boolean,
  meta: TutorialMetadata | null,
  pages: number
): TutorialProgress => {
  if (!started) return { state: "new" };
  if (meta?.completed) return { state: "completed" };
  return { state: "started", page: meta?.pageNumber ?? 1, pages };
};

if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;

  describe("entities/tutorial/model/progress", () => {
    it("is new when the tutorial is not started", () => {
      expect(progressOf(false, null, 5)).toEqual({ state: "new" });
    });

    it("is the saved page of the tutorial's pages once started", () => {
      expect(progressOf(true, { pageNumber: 2, completed: false }, 5)).toEqual({
        state: "started",
        page: 2,
        pages: 5,
      });
    });

    it("is completed once the tutorial says so", () => {
      expect(progressOf(true, { pageNumber: 5, completed: true }, 5)).toEqual({
        state: "completed",
      });
    });

    it("is started on page 1 when the saved progress cannot be read", () => {
      expect(progressOf(true, null, 5)).toEqual({
        state: "started",
        page: 1,
        pages: 5,
      });
    });
  });
}
