import { useRef, useState } from "react";
import type { ReactElement } from "react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";

const OVERFLOW = "[data-overflow]";

/** Whether the text marked `data-overflow`, `trigger` or inside it, is cut short */
const isCut = (trigger: HTMLElement | null) => {
  const text = trigger?.matches(OVERFLOW)
    ? trigger
    : trigger?.querySelector<HTMLElement>(OVERFLOW);
  return !!text && text.scrollWidth > text.clientWidth;
};

/**
 * Shows `label` whole in a tooltip over `children`, the trigger, but only
 * while its `data-overflow` text (the trigger itself, or inside it) is cut: a name that fits has
 * nothing more to say. Measured as the tooltip asks to open, so a resize in
 * between is no stale answer.
 */
export function OverflowTooltip({
  label,
  children,
}: {
  label: string;
  children: ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  return (
    <Tooltip
      open={open}
      onOpenChange={(next) => setOpen(next && isCut(trigger.current))}
    >
      <TooltipTrigger ref={trigger} asChild>
        {children}
      </TooltipTrigger>
      {/* A model id has no spaces to wrap at */}
      <TooltipContent className="break-all">{label}</TooltipContent>
    </Tooltip>
  );
}
