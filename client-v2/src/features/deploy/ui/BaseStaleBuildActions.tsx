import { Button } from "@/shared/ui/button";
import { clockTime } from "../model/format";

export interface BaseStaleBuildActionsProps {
  /** When the last successful build finished, epoch ms; `null` when unknown */
  lastGoodAt: number | null;
  /** The last good build is already deployed: only the error is offered */
  goodBuildDeployed?: boolean;
  /** `true` deploys the last successful build */
  onAnswer: (deploy: boolean) => void;
  /** Cancels the deploy and opens the failed build, where the error is */
  onShowError: () => void;
  /** The clock the time is read against, for stable tests and the board */
  now?: number;
}

/**
 * The failed build question's two answers, rendered inside the stage's
 * `StageEmptyActions` in place of the Deploy pill. "Show the error" is first
 * in the DOM: on a desk it is the left button, and on a phone the foot's
 * reversed column puts it at the bottom, in the pill's slot, so a second tap
 * never deploys old code. Both are 40 px on a desk, the pill's height; the
 * foot makes them 48 px on a phone. Neither is red nor the brand pill: going
 * back to an older build is not destructive, and it is not the hero either.
 */
const BaseStaleBuildActions = ({
  lastGoodAt,
  goodBuildDeployed = false,
  onAnswer,
  onShowError,
  now,
}: BaseStaleBuildActionsProps) => (
  <>
    <Button className="h-10 px-4 text-control" onClick={onShowError}>
      Show the error
    </Button>
    {!goodBuildDeployed && (
      <Button
        variant="outline"
        className="h-10 px-4 text-control"
        onClick={() => onAnswer(true)}
      >
        {lastGoodAt === null
          ? "Deploy last good build"
          : `Deploy build from ${clockTime(lastGoodAt, now)}`}
      </Button>
    )}
  </>
);

export default BaseStaleBuildActions;
