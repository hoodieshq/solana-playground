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

/** A stage's chunk did not arrive, as opposed to the stage's own code failing */
class StageLoadError extends Error {
  constructor(cause: unknown) {
    super("A stage failed to load", { cause });
  }
}

/** How webpack rejects an `import()` whose script or stylesheet did not arrive */
const isChunkLoadFailure = (error: unknown) =>
  error instanceof Error &&
  (error.name === "ChunkLoadError" ||
    (error as { code?: unknown }).code === "CSS_CHUNK_LOAD_FAILED");

/** Who asked for another load: what it says and reports depends on that */
type Retry = "user" | "network" | "reopen";

type StageLoadFailedProps = {
  stage: LazyStageName;
  /** Try again was pressed on this visit to the stage, and failed too */
  retried: boolean;
  /** The load failed offline, whether or not the panel was up to see it */
  failedOffline: boolean;
  onRetry: (why: Exclude<Retry, "reopen">) => void;
  /** What Reload page does; the page's own reload unless a test passes one */
  reload?: () => void;
};

/**
 * A stage whose code did not load, in the stage's own panel so the tabs and
 * the editor stay up. No connection is the usual cause, and it ends by itself,
 * so the stage retries when the network returns and not before. Try again stays
 * while offline because `navigator.onLine` can be wrong. With a network the file
 * may be gone, as a new release removes the old hashed ones, and only a reload
 * recovers from that. Saved code lives in IndexedDB, so a reload keeps it, but
 * offline it would lose the app itself: there is no service worker.
 */
export const StageLoadFailed = ({
  stage,
  retried,
  failedOffline,
  onRetry,
  reload = () => window.location.reload(),
}: StageLoadFailedProps) => {
  const online = useOnline();
  const wasOffline = useRef(failedOffline || !online);
  useEffect(() => {
    if (online && wasOffline.current) onRetry("network");
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
          <BrandButton onClick={() => onRetry("user")}>Try again</BrandButton>
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
  failedOffline: () => boolean;
  /** Makes the next render of a failed stage load it again */
  reset: (why: Retry) => void;
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
    if (this.state.error instanceof StageLoadError) this.props.reset("reopen");
  }

  retry = (why: Retry) => {
    this.props.reset(why);
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
        failedOffline={this.props.failedOffline()}
        onRetry={this.retry}
      />
    );
  }
}

/**
 * `React.lazy` for a stage, which keeps a chunk that did not arrive from taking
 * down the app. `lazy` remembers a rejection forever, so a retry needs a new one.
 * That happens only once the failure has been committed: replacing it where the
 * import fails would hand React's synchronous re-render of the error a fresh
 * `lazy`, and so a new import, without end. `spent` keeps an attempt that has not
 * failed, as `Suspense` unmounts the boundary while it hides it during a retry.
 *
 * With a network, a chunk that does not arrive is ours to know about, once per
 * page load. The retry a returning network starts often fails too, before the
 * route is up, and says nothing about the release.
 *
 * @param load the stage's dynamic import
 * @param stage the stage, which names it in the failed state
 * @returns the stage, to render inside a `Suspense`
 */
export const lazyStage = (
  load: () => Promise<{ default: ComponentType }>,
  stage: LazyStageName
): FC => {
  let spent = false;
  let retried = false;
  let failedOffline = false;
  let networkRetry = false;
  let reported = false;

  const attempt = () =>
    lazy(() =>
      load().catch((error: unknown) => {
        if (!isChunkLoadFailure(error)) throw error;
        spent = true;
        failedOffline = !navigator.onLine;
        const context = { stage };
        if (failedOffline || networkRetry || reported) {
          log.warn("A stage's code did not load", { context });
        } else {
          reported = true;
          log.error(error, { report: true, context });
        }
        throw new StageLoadError(error);
      })
    );
  let Panel = attempt();
  const Current = () => <Panel />;

  const LazyStage: FC = () => (
    <StageLoadBoundary
      stage={stage}
      retried={() => retried}
      failedOffline={() => failedOffline}
      reset={(why) => {
        if (!spent) return;
        spent = false;
        retried = why === "user";
        networkRetry = why === "network";
        Panel = attempt();
      }}
    >
      <Current />
    </StageLoadBoundary>
  );
  return LazyStage;
};
