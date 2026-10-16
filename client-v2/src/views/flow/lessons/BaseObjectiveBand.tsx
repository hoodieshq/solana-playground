import type { FC } from "react";
import { ChevronDown } from "lucide-react";

import { BrandButton } from "@/shared/ui/brand-button";
import { Button } from "@/shared/ui/button";
import { Callout } from "@/shared/ui/callout";
import {
  ObjectiveBand,
  ObjectiveMeter,
  ObjectiveNav,
  ObjectiveText,
} from "@/shared/ui/objective-band";

export type BandAction = { label: string; onClick: () => void };

export type BaseObjectiveBandProps = {
  /** `label` is the wide eyebrow, `short` the phone's "1/4", `progress` 0..1 */
  position: { label: string; short: string; progress: number };
  objective: string;
  /** The verifiedBy line */
  criterion: string;
  back: { enabled: boolean; onClick: () => void };
  next: { enabled: boolean; onClick: () => void };
  read: (BandAction & { unread: boolean }) | null;
  /** `null` on the finished band */
  stuck: BandAction | null;
  prove: BandAction | null;
  /** Only on the finished band */
  gallery: BandAction | null;
  readiness: {
    lead: string;
    items: { key: string; text: string; onClick: (() => void) | null }[];
  } | null;
  /** The phone's one-row band */
  compact: boolean;
  /** The compact row's chevron */
  onOpenSteps?: () => void;
};

/**
 * One ask above the editor, drawn from props alone. The actions are a
 * sibling row of the design system's parts rather than `ObjectiveActions`,
 * which hides below `md`: a phone still needs to prove a step.
 */
export const BaseObjectiveBand: FC<BaseObjectiveBandProps> = ({
  position,
  objective,
  criterion,
  back,
  next,
  read,
  stuck,
  prove,
  gallery,
  readiness,
  compact,
  onOpenSteps,
}) => {
  const nav = (
    <ObjectiveNav
      onBack={back.onClick}
      onNext={next.onClick}
      canBack={back.enabled}
      canNext={next.enabled}
    />
  );

  return (
    <div className="flex flex-col">
      <ObjectiveBand className="flex-wrap">
        {compact ? (
          <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
            {position.short}
          </span>
        ) : (
          <span className="shrink-0 text-xs tracking-wider text-muted-foreground uppercase">
            {position.label}
          </span>
        )}
        <ObjectiveMeter value={position.progress} />
        <ObjectiveText>{objective}</ObjectiveText>
        {!compact && (
          <span className="hidden shrink-0 text-xs text-muted-foreground md:inline">
            {criterion}
          </span>
        )}
        {compact ? (
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="Show the steps"
            onClick={onOpenSteps}
          >
            <ChevronDown />
          </Button>
        ) : (
          nav
        )}
        <div
          data-slot="objective-actions-row"
          className="flex w-full flex-wrap items-center gap-2"
        >
          {compact && nav}
          {read && (
            <Button
              variant="ghost"
              size="sm"
              data-unread={read.unread ? "" : undefined}
              onClick={read.onClick}
            >
              {read.unread && (
                <span
                  aria-hidden
                  className="size-1.5 rounded-full bg-primary"
                />
              )}
              {read.label}
            </Button>
          )}
          {stuck && (
            <BrandButton size="sm" onClick={stuck.onClick}>
              {stuck.label}
            </BrandButton>
          )}
          {prove && (
            <Button variant="outline" size="sm" onClick={prove.onClick}>
              {prove.label}
            </Button>
          )}
          {gallery && (
            <Button variant="ghost" size="sm" onClick={gallery.onClick}>
              {gallery.label}
            </Button>
          )}
        </div>
      </ObjectiveBand>
      {/* `aria-live` because the list shrinks as the learner fixes things,
          and a change nobody is looking at is a change nobody hears */}
      <div aria-live="polite">
        {readiness && (
          <Callout className="rounded-none border-x-0 py-2">
            <span>{readiness.lead}</span>
            <div className="flex flex-wrap items-baseline gap-x-2.5">
              {readiness.items.map((item) =>
                item.onClick ? (
                  <Button
                    key={item.key}
                    variant="link"
                    size="xs"
                    className="h-auto px-0"
                    onClick={item.onClick}
                  >
                    {item.text}
                  </Button>
                ) : (
                  // Nothing to click: a build already running is a thing to
                  // wait for, so it stays quiet text rather than a dead control
                  <span key={item.key} className="text-muted-foreground">
                    {item.text}
                  </span>
                )
              )}
            </div>
          </Callout>
        )}
      </div>
    </div>
  );
};
