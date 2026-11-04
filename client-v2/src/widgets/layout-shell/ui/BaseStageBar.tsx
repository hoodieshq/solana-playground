import { CircleHelp, MessageSquare } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { Separator } from "@/shared/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";

export const DOCS_URL = "https://solana.com/docs";

/** A panel's toggle, here or in the editor head: whether it shows, and the click */
export interface BarToggle {
  open: boolean;
  onToggle: () => void;
}

export interface BaseStageBarProps {
  /** The project's name, shown while the assistant is hidden; null hides it */
  title: string | null;
  /**
   * The assistant's toggle: the panel's on a wide window, the Sheet's below;
   * null draws none, as over a page, which covers the assistant
   */
  assistant: BarToggle | null;
  /**
   * The key the assistant's hint names, Ctrl+R unless given; null names
   * none, as under Home, where the shell's keys do nothing
   */
  assistantKey?: string | null;
}

/**
 * The prototype's head control: 30 px tall, radius 8, muted until hovered
 * or while its column shows, when it takes the accent fill
 */
const BAR_CONTROL =
  "h-7.5 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground aria-expanded:bg-accent aria-expanded:text-foreground dark:hover:bg-accent";

/** An icon button with its label as the tooltip, as the assistant's head draws them */
const BarButton = ({
  label,
  hint,
  expanded,
  onClick,
  children,
}: {
  label: string;
  hint: string;
  expanded?: boolean;
  onClick: () => void;
  children: ReactNode;
}) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button
        variant="ghost"
        size="icon-sm"
        className={cn(BAR_CONTROL, "size-7.5")}
        aria-label={label}
        aria-expanded={expanded}
        onClick={onClick}
      >
        {children}
      </Button>
    </TooltipTrigger>
    <TooltipContent>{hint}</TooltipContent>
  </Tooltip>
);

/** The assistant's toggle, named by what a click does */
const AssistantToggle = ({
  assistant,
  assistantKey,
}: {
  assistant: BarToggle;
  assistantKey: string | null;
}) => {
  const label = assistant.open ? "Hide the assistant" : "Expand assistant";
  return (
    <BarButton
      label={label}
      hint={assistantKey === null ? label : `${label} (${assistantKey})`}
      // Whether the pane is open: the ghost button draws `aria-expanded`
      // filled, the prototype's look for a shown assistant. Not `aria-pressed`, which is for a toggle whose
      // label stays the same, and this label changes with each click
      expanded={assistant.open}
      onClick={assistant.onToggle}
    >
      <MessageSquare aria-hidden="true" />
    </BarButton>
  );
};

/**
 * The 44 px bar over the files column and the stage (design.md, "Frame chrome
 * (5.25)"): the project's name while the assistant is hidden, then the
 * assistant's toggle and the documentation. The files toggle lives in the
 * editor head (`BaseEditorHead`), beside the terminal's. The assistant's
 * toggle is named apart from the assistant's own "Collapse assistant", so
 * each name stays one button.
 */
const BaseStageBar = ({
  title,
  assistant,
  assistantKey = "Ctrl+R",
}: BaseStageBarProps) => {
  return (
    <div
      data-slot="stage-bar"
      className="flex h-11 shrink-0 items-center gap-1 border-b border-border pr-1.5 pl-3"
    >
      <span
        className="min-w-0 flex-1 truncate text-sm font-medium text-muted-foreground"
        title={title ?? undefined}
      >
        {title}
      </span>
      {assistant && (
        <AssistantToggle assistant={assistant} assistantKey={assistantKey} />
      )}
      <Separator
        orientation="vertical"
        className="mx-1 data-vertical:h-4 data-vertical:self-center"
      />
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            className={cn(BAR_CONTROL, "size-7.5")}
            asChild
          >
            <a
              href={DOCS_URL}
              target="_blank"
              rel="noreferrer"
              aria-label="Documentation"
            >
              <CircleHelp aria-hidden="true" />
            </a>
          </Button>
        </TooltipTrigger>
        <TooltipContent>Solana documentation</TooltipContent>
      </Tooltip>
    </div>
  );
};

export default BaseStageBar;
