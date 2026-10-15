import { useState } from "react";
import type { KeyboardEvent } from "react";
import {
  EllipsisVertical,
  FoldHorizontal,
  PanelLeftClose,
  UnfoldHorizontal,
} from "lucide-react";

import { Button } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";

export interface BaseAssistantHeadProps {
  /** The open project's name */
  title: string;
  /** Opens Sources and tools in place of the conversation */
  onSources(): void;
  /** Opens Connect a model */
  onConnect(): void;
  /** The panel is widened to its maximum */
  wide: boolean;
  /** Widens the panel, or narrows it back when `wide` */
  onWiden(): void;
  /** Folds the panel, or closes the Sheet */
  onHide(): void;
  /** Widen is offered: not in the Sheet, which has no width to change */
  canWiden: boolean;
}

/**
 * The assistant's head: the project's name, then More, Widen and Hide.
 *
 * More's items take S and K while it is open. The shortcuts are shown with
 * `DropdownMenuShortcut`, which only draws them, and the menu's typeahead
 * would take S but never K ("Connect…"), so the keys are read here.
 */
export function BaseAssistantHead({
  title,
  onSources,
  onConnect,
  wide,
  onWiden,
  onHide,
  canWiden,
}: BaseAssistantHeadProps) {
  const [moreOpen, setMoreOpen] = useState(false);

  const pick = (action: () => void) => {
    setMoreOpen(false);
    action();
  };

  /** S and K with no modifier; anything else stays the menu's */
  const onMenuKey = (event: KeyboardEvent) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const shortcuts: Record<string, () => void> = {
      s: onSources,
      k: onConnect,
    };
    const action = shortcuts[event.key.toLowerCase()];
    if (!action) return;
    // Keeps the menu's own typeahead from also acting on the key
    event.preventDefault();
    pick(action);
  };

  const widenLabel = wide ? "Narrow the assistant" : "Widen the assistant";

  return (
    <div className="flex shrink-0 items-center gap-1 border-b border-border py-1.5 pr-1.5 pl-3">
      <h2
        className="min-w-0 flex-1 truncate text-sm font-medium text-foreground"
        title={title}
      >
        {title}
      </h2>
      <DropdownMenu open={moreOpen} onOpenChange={setMoreOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label="More">
            <EllipsisVertical aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-auto min-w-48"
          onKeyDown={onMenuKey}
        >
          <DropdownMenuItem onSelect={() => pick(onSources)}>
            Sources and tools
            <DropdownMenuShortcut>S</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => pick(onConnect)}>
            Connect a model…
            <DropdownMenuShortcut>K</DropdownMenuShortcut>
          </DropdownMenuItem>
          {/* A disabled item takes no pointer events, so the tooltip hangs
              on a wrapper. Clearing waits on the cross-device clear
              (HOO-1741): clearing only what is shown would come back from
              another device. */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <DropdownMenuItem disabled>Clear conversation</DropdownMenuItem>
              </div>
            </TooltipTrigger>
            <TooltipContent side="left">Coming soon</TooltipContent>
          </Tooltip>
        </DropdownMenuContent>
      </DropdownMenu>
      {canWiden && (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={widenLabel}
          title={widenLabel}
          onClick={onWiden}
        >
          {wide ? (
            <FoldHorizontal aria-hidden="true" />
          ) : (
            <UnfoldHorizontal aria-hidden="true" />
          )}
        </Button>
      )}
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Collapse assistant"
        title="Collapse assistant"
        onClick={onHide}
      >
        <PanelLeftClose aria-hidden="true" />
      </Button>
    </div>
  );
}
