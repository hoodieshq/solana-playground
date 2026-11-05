import type { ComponentType, FC, ReactNode } from "react";
import { Component, lazy, useEffect, useRef } from "react";

import { useOnline } from "@/shared/lib/hooks/use-online";
import { createLogger } from "@/shared/lib/logger";
import { BrandButton } from "@/shared/ui/brand-button";
import { Button } from "@/shared/ui/button";
import {
  StageEmpty,
  StageEmptyActions,
  StageEmptyDescription,
  StageEmptyTitle,
} from "@/shared/ui/stage-empty";

import type { Stage } from "../state/stage";
import { STAGE_LABEL } from "../state/stage-label";
import { STAGE_BODY, STAGE_FOOT, STAGE_FRAME } from "./stage-layout";

const log = createLogger("flow:stage-load");

/** The stages that load on demand. `Write` is in the first bundle */
type LazyStageName = Exclude<Stage, "write">;

/** The import behind a stage failed, as opposed to the stage's own render */
class StageLoadError extends Error {
  constructor(cause: unknown) {
    super("A stage failed to load", { cause });
  }
}

type StageLoadFailedProps = {
  stage: LazyStageName;
  /** A try after the first has failed too */
  retried: boolean;
  onRetry: () => void;
  /** What Reload page does; the page's own reload unless a test passes one */
  reload?: () => void;
};

/**
 * A stage whose code did not load, in the stage's own panel so the tabs and
 * the editor stay up. No connection is the usual cause, and it ends by itself,
 * so the stage retries when the network returns (Spec 08 NET-01 pauses retries
 * until then). Try again stays while offline because `navigator.onLine` can be
 * wrong. With a network the file may be gone, as a new release removes the old
 * hashed ones, and only a reload recovers from that. Code lives in IndexedDB,
 * so a reload loses nothing, but offline it would lose the app itself.
 */
export const StageLoadFailed = ({
  stage,
  retried,
  onRetry,
  reload = () => window.location.reload(),
}: StageLoadFailedProps) => {
  const online = useOnline();
  const wasOffline = useRef(!online);
  useEffect(() => {
    if (online && wasOffline.current) onRetry();
    wasOffline.current = !online;
  }, [online, onRetry]);

  const label = STAGE_LABEL[stage];
  return (
    <div className={STAGE_FRAME}>
      <StageEmpty className={STAGE_BODY}>
        <StageEmptyTitle>
          {online ? `${label} couldn't load` : `${label} needs a connection`}
        </StageEmptyTitle>
        <StageEmptyDescription role="alert">
          {!online
            ? "It hasn't loaded yet. Your code is unchanged."
            : retried
            ? "Reload the page to get the latest version. Your code is unchanged."
            : "Check your connection and try again. Your code is unchanged."}
        </StageEmptyDescription>
        <StageEmptyActions className={STAGE_FOOT}>
          <BrandButton onClick={onRetry}>Try again</BrandButton>
          {online && (
            <Button variant="outline" onClick={reload}>
              Reload page
            </Button>
          )}
        </StageEmptyActions>
      </StageEmpty>
    </div>
  );
};

type BoundaryProps = {
  stage: LazyStageName;
  retried: () => boolean;
  /** Makes the next render of a failed stage load it again */
  reset: () => void;
  children: ReactNode;
};

/**
 * Shows a failed load in place. Any other error goes on to the app's boundary:
 * a stage that loaded and then threw is a bug, not a missing connection.
 */
class StageLoadBoundary extends Component<BoundaryProps, { error?: Error }> {
  state: { error?: Error } = {};

  static getDerivedStateFromError = (error: Error) => ({ error });

  /**
   * Leaving a failed stage: opening it again tries again. `Suspense` calls this
   * too when it hides the boundary during a retry, so `reset` keeps an attempt
   * that has not failed.
   */
  componentWillUnmount() {
    if (this.state.error instanceof StageLoadError) this.props.reset();
  }

  retry = () => {
    this.props.reset();
    this.setState({ error: undefined });
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    if (!(error instanceof StageLoadError)) throw error;
    return (
      <StageLoadFailed
        stage={this.props.stage}
        retried={this.props.retried()}
        onRetry={this.retry}
      />
    );
  }
}

/**
 * `React.lazy` for a stage, which keeps a failed import from taking down the
 * app. `lazy` remembers a rejection forever, so a retry needs a new one. That
 * happens only once the failure has been committed: replacing it where the
 * import fails would hand React's own re-render of the error a fresh `lazy`,
 * and so a new import, without end.
 *
 * @param load the stage's dynamic import
 * @param stage the stage, which names it in the failed state
 * @returns the stage, to render inside a `Suspense`
 */
export const lazyStage = (
  load: () => Promise<{ default: ComponentType }>,
  stage: LazyStageName
): FC => {
  let failures = 0;
  let spent = false;
  const attempt = () =>
    lazy(() =>
      load().catch((error: unknown) => {
        failures++;
        spent = true;
        // Expected offline. With a network, a chunk is missing: that is ours
        if (navigator.onLine) log.error(error, { report: true });
        throw new StageLoadError(error);
      })
    );
  let Panel = attempt();
  const Current = () => <Panel />;

  const LazyStage: FC = () => (
    <StageLoadBoundary
      stage={stage}
      retried={() => failures > 1}
      reset={() => {
        if (!spent) return;
        spent = false;
        Panel = attempt();
      }}
    >
      <Current />
    </StageLoadBoundary>
  );
  return LazyStage;
};
