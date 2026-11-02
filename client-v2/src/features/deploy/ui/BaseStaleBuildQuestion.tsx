import { useEffect, useRef, type ReactNode } from "react";
import { History, TriangleAlert } from "lucide-react";

import { cn } from "@/shared/lib/utils";
import { StageEmptyMedia, StageEmptyTitle } from "@/shared/ui/stage-empty";
import { clockTime, timeAgo } from "../model/format";

/** Where the failed build stopped: its first diagnostic */
export interface StaleBuildFailure {
  /** Workspace path (`src/lib.rs`), `null` when the diagnostic has none */
  file: string | null;
  line: number | null;
  /** rustc's one line summary */
  message: string;
}

export interface BaseStaleBuildQuestionProps {
  /**
   * When the last successful build finished, epoch ms; `null` when the page
   * no longer knows (a reload), and the chip with the time is left out
   */
  lastGoodAt: number | null;
  /** Where the latest build failed, said under the title; `null` leaves it out */
  failure?: StaleBuildFailure | null;
  /**
   * The last good build is the one already deployed, so deploying it would
   * change nothing: the question only says so, and offers the error
   */
  goodBuildDeployed?: boolean;
  /** Esc: cancels the deploy, as `onAnswer(false)` */
  onCancel: () => void;
  /**
   * `stage` before the first deploy, where the question is the whole stage,
   * centred, its title at the stage title's size; `inline` under a deploy
   * history, a card read from the left with the report
   */
  size?: "stage" | "inline";
  /** The clock the times are measured against, for stable tests and the board */
  now?: number;
  /**
   * The answers, drawn inside the card on a desk so the question and its
   * buttons read as one thing; a phone keeps them in the pinned foot instead
   */
  actions?: ReactNode;
}

const TITLE_ID = "stale-build-title";

/** Where the build stopped, "lib.rs:14", or `null` when the diagnostic has no file */
const failurePlace = (f: StaleBuildFailure) => {
  const name = f.file?.split("/").at(-1);
  if (!name) return null;
  return f.line === null ? name : `${name}:${f.line}`;
};

/** The whole reason, for the title when one line cuts it */
const failureTitle = (f: StaleBuildFailure) => {
  const place = failurePlace(f);
  const message = f.message.replaceAll("`", "");
  return place ? `Failed at ${place}: ${message}` : `Failed: ${message}`;
};

/** rustc quotes names in backticks; they read as code, the rest as prose */
const withCode = (message: string) =>
  message.split(/(`[^`]+`)/).map((part, i) =>
    part.startsWith("`") && part.endsWith("`") ? (
      <code key={i} className={INLINE_CODE}>
        {part.slice(1, -1)}
      </code>
    ) : (
      part
    )
  );

const INLINE_CODE =
  "rounded bg-surface-raised px-1 py-px font-mono text-[0.9em] text-foreground";

/** "Last good build · 9:10 AM · 12 min ago" */
const chipText = (at: number, now: number) =>
  ["Last good build", clockTime(at, now), timeAgo(at, now)]
    .filter(Boolean)
    .join(" · ");

/**
 * The words of the question asked in the Deploy stage when Deploy is pressed
 * after a failed build (Spec 03, DEP-08). Its two buttons are
 * `BaseStaleBuildActions`, which sit in the stage's foot: on a phone the foot
 * is pinned, and only the buttons may be, so these words scroll with the
 * stage and never cover the deploy result.
 *
 * Only the triangle carries the warning colour, inside a neutral tile before
 * the first deploy. Right under the title the reason says where the latest
 * build failed, in prose with the place as code, on one line (the full
 * reason in its title when a long one is cut); then the question, and a grey chip naming the build that would go
 * out. On open, focus moves to the title, so
 * a second Enter cannot deploy, and under a history the card scrolls into
 * view; Esc cancels.
 */
const BaseStaleBuildQuestion = ({
  lastGoodAt,
  failure = null,
  goodBuildDeployed = false,
  onCancel,
  size = "inline",
  now = Date.now(),
  actions,
}: BaseStaleBuildQuestionProps) => {
  const root = useRef<HTMLDivElement>(null);
  const title = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (size === "inline") {
      const reduce = window.matchMedia?.(
        "(prefers-reduced-motion: reduce)"
      ).matches;
      root.current?.scrollIntoView?.({
        block: "nearest",
        behavior: reduce ? "auto" : "smooth",
      });
    }
    title.current?.focus({ preventScroll: true });
  }, [size]);

  // The latest `onCancel` without re-adding the listener on every render
  const cancel = useRef(onCancel);
  cancel.current = onCancel;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !e.defaultPrevented) cancel.current();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const stage = size === "stage";
  const sentence = goodBuildDeployed
    ? "The deployed program is already that build."
    : "Deploy the last good build? It won't have your latest changes.";
  const ago = lastGoodAt === null ? null : timeAgo(lastGoodAt, now);
  const note = goodBuildDeployed
    ? "The deployed program is already that build."
    : `${ago ? `Built ${ago}. ` : ""}It won't have your latest changes.`;
  const icon = (
    <TriangleAlert
      aria-hidden="true"
      className={cn("text-warning", stage ? "size-5" : "size-4 shrink-0")}
    />
  );

  const reason = failure && (
    <span
      title={failureTitle(failure)}
      className="block md:truncate max-md:line-clamp-2"
    >
      {failurePlace(failure) ? (
        <>
          Failed at <code className={INLINE_CODE}>{failurePlace(failure)}</code>
          :{" "}
        </>
      ) : (
        "Failed: "
      )}
      {withCode(failure.message)}.
    </span>
  );

  if (stage) {
    return (
      <div
        ref={root}
        role="alert"
        aria-labelledby={TITLE_ID}
        className="flex w-full max-w-xl flex-col items-center gap-3 text-center"
      >
        <StageEmptyMedia>{icon}</StageEmptyMedia>
        <StageEmptyTitle
          ref={title}
          id={TITLE_ID}
          tabIndex={-1}
          className="outline-none"
        >
          The last build failed
        </StageEmptyTitle>
        {/* One paragraph, the reason then the question, a line each: two grey
            paragraphs under the title read as two separate notes */}
        <p className="m-0 max-w-full text-body font-read text-muted-foreground">
          {reason}
          <span className="block">{sentence}</span>
        </p>
        {lastGoodAt !== null && (
          <span className="mt-1 inline-flex max-w-full items-center gap-1.5 rounded-md bg-surface-raised px-2.5 py-1 text-caption text-muted-foreground tabular-nums md:h-7 md:py-0">
            <History aria-hidden="true" className="size-3.5 shrink-0" />
            <span className="md:truncate">{chipText(lastGoodAt, now)}</span>
          </span>
        )}
      </div>
    );
  }

  /* Under a history the card is a decision among reports, so it keeps three
     steps of type: the title, the reason in caption grey, the answers; one
     caption note under them says what the older build lacks. The time is on
     the button already, so no chip repeats it. A thin amber edge marks the one
     card that waits on you */
  return (
    <div
      ref={root}
      role="alert"
      aria-labelledby={TITLE_ID}
      className="flex w-full scroll-mb-40 flex-col items-start gap-1.5 rounded-xl border border-warning/30 bg-surface-panel p-4 text-left"
    >
      <div className="flex items-center gap-2">
        {icon}
        <h3
          ref={title}
          id={TITLE_ID}
          tabIndex={-1}
          className="m-0 text-[0.9375rem] font-act text-foreground outline-none"
        >
          The last build failed
        </h3>
      </div>
      {failure && (
        <p className="m-0 max-w-full text-caption text-muted-foreground">
          {reason}
        </p>
      )}
      {actions && (
        <div className="mt-2 flex flex-wrap gap-2 max-md:hidden">{actions}</div>
      )}
      <p className="m-0 mt-1 text-caption text-subtle">{note}</p>
    </div>
  );
};

export default BaseStaleBuildQuestion;
