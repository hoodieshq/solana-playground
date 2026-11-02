import { createTracker } from "@/shared/lib/telemetry";

/** How the feed moved to a step's divider: a bar segment, its narrow menu, or ⌥↑ / ⌥↓ */
export type StepJumpVia = "bar" | "menu" | "key";

type TutorialEvents = {
  /**
   * The loader dropped a tutorial definition that failed its check, so the
   * catalog does not list it. Fires once per definition per page load.
   */
  tutorial_definition_rejected: { tutorial: string; errors: number };
  /**
   * The engine's `start` action: the intro card's Start, or, once the
   * composer lands (task 3.6), a start word. Fires once per start; Start
   * over then Start fires it again. `tutorial` is the slug.
   */
  tutorial_started: { tutorial: string };
  /**
   * The finish card of a conversation tutorial showed, after the last step's
   * win. `seconds` is the time from Start.
   */
  tutorial_finished: { tutorial: string; seconds: number };
  /**
   * A step's goal passed on a real result. `via` is how: `chat` (an act
   * card), `client` (a client run) or `call_panel`. `step` is 1-based;
   * `seconds` is whole seconds from entering the step to its pass, time away
   * from the tab included. A passed step stays passed, so this fires once
   * per step until Start over.
   */
  tutorial_step_passed: {
    tutorial: string;
    step: number;
    via: "chat" | "client" | "call_panel";
    seconds: number;
  };
  /**
   * The feed moved to a step's divider: a step bar segment, an item of the
   * bar's narrow menu, or ⌥↑ / ⌥↓. `step` is the divider's step and `from`
   * the live step, both 1-based. Not sent for the back pill, which sends
   * `tutorial_step_back`.
   */
  tutorial_step_jumped: {
    tutorial: string;
    step: number;
    from: number;
    via: StepJumpVia;
  };
  /**
   * The back pill took the learner back to the live card, after a jump to
   * another step or a scroll away from the card. `step` is the live step, or
   * 0 before Start.
   */
  tutorial_step_back: { tutorial: string; step: number };
};

/**
 * Also the tracker of the conversation engine
 * (`features/tutorial-conversation`) and of its feed
 * (`widgets/tutorial-conversation`): the spec names their events
 * `tutorial_*`, and the prefix is this slice's.
 */
export const tutorialTelemetry = createTracker<TutorialEvents>();
