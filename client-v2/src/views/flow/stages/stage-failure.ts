import {
  markFailureShown,
  unavailableHere,
} from "@/shared/lib/report-button-failure";

/**
 * The catch of a Build or Deploy stage's own run: marks the failure shown,
 * then rethrows it for the button's `reportButtonFailure`, which then only
 * logs it.
 *
 * Every failed `build` or `deploy` command settles the flow as failed, and
 * the stage on screen says so in place (Build's failed surface, Deploy's
 * Callout). A toast would tell the same failure twice, against Spec 08's "one
 * cause shows one message". A run that could not start here
 * (`markUnavailableHere`) never reached the stage, so its toast stays.
 */
export const toldByStage = (error: unknown): never => {
  if (unavailableHere(error) === null) markFailureShown(error);
  throw error;
};

if (import.meta.vitest) {
  const { describe, it, expect, vi, beforeAll, afterEach } = import.meta.vitest;

  describe("views/flow/stages/stage-failure", () => {
    let failures: typeof import("@/shared/lib/report-button-failure");
    let view: typeof import("@/utils/view").PgView;

    beforeAll(async () => {
      failures = await import("@/shared/lib/report-button-failure");
      view = (await import("@/utils/view")).PgView;
    });

    afterEach(() => vi.restoreAllMocks());

    const settle = (error: unknown, action: string) => {
      const toast = vi.spyOn(view, "setToast").mockImplementation(() => "");
      try {
        toldByStage(error);
      } catch (thrown) {
        expect(thrown).toBe(error);
        failures.reportButtonFailure(action)(thrown);
      }
      return toast;
    };

    it("a run the stage shows failed is not toasted as well", () => {
      expect(
        settle(new Error("build server down"), "build")
      ).not.toHaveBeenCalled();
    });

    it("a run that could not start here is still toasted", () => {
      const error = new Error("no terminal");
      failures.markUnavailableHere(error, "open a project to use the terminal");
      expect(settle(error, "build")).toHaveBeenCalledOnce();
    });
  });
}
