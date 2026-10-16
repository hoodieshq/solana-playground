import type { ReactNode } from "react";
import { CircleHelp, FolderClosed, MessageSquare } from "lucide-react";

import { Button } from "@/shared/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";

export const DOCS_URL = "https://solana.com/docs";

export interface BaseStageBarProps {
  /** The project's name, shown while the assistant is hidden; null hides it */
  title: string | null;
  /**
   * The files column's toggle; null where the column sits in the
   * navigation's Sheet, whose own opener at the left edge carries the name
   */
  files: { open: boolean; onToggle: () => void } | null;
  /**
   * The assistant's toggle: the panel's on a wide window, the Sheet's below
   * it; null draws none
   */
  assistant: { open: boolean; onToggle: () => void } | null;
}

/** An icon button with its label as the tooltip, as the assistant's head draws them */
const BarButton = ({
  label,
  hint,
  pressed,
  expanded,
  onClick,
  children,
}: {
  label: string;
  hint: string;
  pressed?: boolean;
  expanded?: boolean;
  onClick: () => void;
  children: ReactNode;
}) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={label}
        aria-pressed={pressed}
        aria-expanded={expanded}
        onClick={onClick}
      >
        {children}
      </Button>
    </TooltipTrigger>
    <TooltipContent>{hint}</TooltipContent>
  </Tooltip>
);

/**
 * The 44 px bar over the files column and the stage (design.md, "Frame chrome
 * (5.25)"): the project's name while the assistant is hidden, then the files
 * and assistant toggles and the documentation. The assistant's toggle is
 * named apart from the head's "Collapse assistant", so each name stays one
 * button.
 */
const BaseStageBar = ({ title, files, assistant }: BaseStageBarProps) => {
  const filesLabel = files?.open
    ? "Collapse project panel"
    : "Expand project panel";
  const assistantLabel = assistant?.open
    ? "Hide the assistant"
    : "Expand assistant";
  return (
    <div
      data-slot="stage-bar"
      className="flex h-11 shrink-0 items-center gap-1 border-b border-border pr-1.5 pl-3"
    >
      <span
        className="min-w-0 flex-1 truncate text-sm font-medium text-foreground"
        title={title ?? undefined}
      >
        {title}
      </span>
      {files && (
        <BarButton
          label={filesLabel}
          hint={`${filesLabel} (⌘E)`}
          expanded={files.open}
          onClick={files.onToggle}
        >
          <FolderClosed aria-hidden="true" />
        </BarButton>
      )}
      {assistant && (
        <BarButton
          label={assistantLabel}
          hint={`${assistantLabel} (Ctrl+R)`}
          pressed={assistant.open}
          onClick={assistant.onToggle}
        >
          <MessageSquare aria-hidden="true" />
        </BarButton>
      )}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon-sm" asChild>
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
