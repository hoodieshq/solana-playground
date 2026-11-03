import type { Text, Win } from "@/entities/tutorial";
import { Button } from "@/shared/ui/button";
import { Prose, READ } from "./Prose";

/**
 * Plain stand-ins for the turns other tickets draw, so a tutorial can still be
 * walked from the feed: the win and finish cards are 3.4's (HOO-2352). Each
 * draws only enough to move the lesson on.
 */

export interface WinStandInProps {
  win: Win;
  /** 1-based */
  index: number;
  /** The next step's title, unless this is the last step */
  next: string | null;
  /** Next was pressed, or the finish followed */
  done: boolean;
  onNext: () => void;
}

// TODO(tutorial-flow-v2 3.4): HOO-2352's win card replaces this: the drawn
// check, Enter for Next, "Open Call" / "Write it in client.ts"
export const WinStandIn = ({
  win,
  index,
  next,
  done,
  onNext,
}: WinStandInProps) => (
  <section
    aria-label={`Step ${index} done`}
    className="flex flex-col gap-2 rounded-panel border border-border bg-surface-panel p-4"
  >
    <p className="text-[0.75rem] text-success">Step {index} done</p>
    <p className="font-heading text-title text-foreground">
      <Prose text={win.headline} />
    </p>
    {!done && (
      <>
        <p className={READ}>
          <Prose text={win.line} />
        </p>
        {next && (
          <div>
            <Button onClick={onNext}>Next: {next}</Button>
          </div>
        )}
      </>
    )}
  </section>
);

// TODO(tutorial-flow-v2 3.4): HOO-2352's finish card replaces this: the
// receipt, "What you learned", the meta line and "Next: <tutorial>"
export const FinishStandIn = ({
  headline,
  line,
}: {
  headline: Text;
  line: Text;
}) => (
  <section
    aria-label="Finished"
    className="flex flex-col gap-2 rounded-card border border-border bg-surface-panel p-5"
  >
    <p className="font-heading text-title text-foreground">
      <Prose text={headline} />
    </p>
    <p className={READ}>
      <Prose text={line} />
    </p>
  </section>
);
