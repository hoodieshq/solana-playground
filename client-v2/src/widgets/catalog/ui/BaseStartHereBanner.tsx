import { ArrowRight, Check } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { reportButtonFailure } from "@/shared/lib/report-button-failure";
import { cn } from "@/shared/lib/utils";
import { BrandButton } from "@/shared/ui/brand-button";
import type { Banner } from "../model/banner";
import { IsoVoxels } from "./art/IsoVoxels";
import type { CardOpen } from "./BaseCatalogGrid";

export interface BaseStartHereBannerProps {
  banner: Banner;
  /** The banner's Open, while it runs or once it failed; none otherwise */
  open?: CardOpen;
  /** An Open runs: the banner waits for it */
  busy: boolean;
  /** Open the tutorial; a failure comes back as `open`, so this never rejects for one */
  onOpen: () => Promise<void>;
}

/** The banner's width, in px, from which the sculpture stands beside the words */
const WIDE_MIN = 640;

/**
 * The tutorial a new developer begins with, as the tutorial-v2 prototype
 * draws it (`ui/StartHereBanner.tsx`): the words on the left, the brand mark
 * as a voxel sculpture beside them, or hung from the top right corner under
 * 640 px. Fresh it invites a start, started it names the next step with a
 * meter, completed it says so and offers Open again.
 */
const BaseStartHereBanner = ({
  banner: b,
  open,
  busy,
  onOpen,
}: BaseStartHereBannerProps) => {
  const titleId = useId();
  const box = useRef<HTMLElement>(null);
  const [wide, setWide] = useState(true);
  useEffect(() => {
    const el = box.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([e]) =>
      setWide(e.contentRect.width >= WIDE_MIN)
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const press = () => onOpen().catch(reportButtonFailure(`open ${b.title}`));

  return (
    <section
      ref={box}
      aria-labelledby={titleId}
      // A soft light of the brand's purple from the corner the sculpture sits in
      style={{
        background:
          "radial-gradient(120% 140% at 100% 0%, color-mix(in srgb, var(--brand-purple) 14%, transparent), transparent 62%), var(--surface-panel)",
      }}
      className="relative isolate overflow-hidden rounded-card border border-border"
    >
      <IsoVoxels corner={!wide} />
      <div className="relative p-7 max-md:p-5">
        {/* The words keep to where the sculpture has faded out */}
        <div className="max-w-[19rem] min-w-0">
          <p
            className={cn(
              "flex items-center gap-1.5 text-[0.8125rem]",
              b.state === "fresh"
                ? "text-brand-periwinkle"
                : "text-muted-foreground"
            )}
          >
            {b.state === "completed" ? (
              <span
                aria-hidden="true"
                className="flex size-4 items-center justify-center rounded-full bg-brand-green/15 text-brand-green"
              >
                <Check strokeWidth={2.5} className="size-2.5" />
              </span>
            ) : null}
            {b.label}
          </p>
          <h2
            id={titleId}
            className="mt-1.5 font-heading text-[1.5rem] font-normal tracking-[-0.015em] text-foreground"
          >
            {b.title}
          </h2>
          <p className="mt-2 max-w-[44ch] text-[0.9375rem] leading-[1.35] text-balance text-foreground/78">
            {b.line}
          </p>
          {b.meter ? (
            <div className="mt-3 flex max-w-xs items-center gap-3">
              <span
                aria-hidden="true"
                className="h-[3px] flex-1 overflow-hidden rounded-[2px] bg-border"
              >
                <span
                  className="block h-full bg-[linear-gradient(90deg,var(--brand-purple),var(--brand-green))]"
                  style={{ width: `${(b.meter.done / b.meter.of) * 100}%` }}
                />
              </span>
              <span className="text-[0.75rem] leading-4 font-[380] text-muted-foreground/80 tabular-nums">
                {`${b.meter.done} of ${b.meter.of}`}
              </span>
            </div>
          ) : null}
          {b.meta ? (
            <p className="mt-3 text-[0.75rem] leading-4 font-[380] text-muted-foreground/80 tabular-nums">
              {b.meta}
            </p>
          ) : null}
          <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2">
            {b.action === "Open again" ? (
              // The quiet action: words and an arrow, no box
              <button
                type="button"
                disabled={busy}
                onClick={press}
                className="group/quiet -mx-2 flex h-10 shrink-0 items-center gap-1 rounded-control px-2 text-[0.8125rem] leading-5 whitespace-nowrap text-muted-foreground outline-none transition-colors duration-150 hover:text-foreground focus-visible:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:transition-none"
              >
                Open again
                <ArrowRight
                  strokeWidth={1.75}
                  aria-hidden="true"
                  className="size-3.5 transition-transform duration-150 group-hover/quiet:translate-x-0.5 motion-reduce:transition-none"
                />
              </button>
            ) : (
              <BrandButton
                disabled={busy}
                onClick={press}
                className="px-5 max-md:h-12 max-md:w-full"
              >
                {b.action}
              </BrandButton>
            )}
          </div>
          {open?.state === "running" && open.text ? (
            <p className="mt-2 text-caption text-muted-foreground">
              {open.text}
            </p>
          ) : null}
          {open?.state === "failed" ? (
            <p role="alert" className="mt-2 text-caption text-error">
              {open.message}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
};

export default BaseStartHereBanner;
