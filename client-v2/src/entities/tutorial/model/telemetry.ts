import { createTracker } from "@/shared/lib/telemetry";

type TutorialEvents = {
  /**
   * The loader dropped a tutorial definition that failed its check, so the
   * catalog does not list it. Fires once per definition per page load.
   */
  tutorial_definition_rejected: { tutorial: string; errors: number };
};

export const tutorialTelemetry = createTracker<TutorialEvents>();
