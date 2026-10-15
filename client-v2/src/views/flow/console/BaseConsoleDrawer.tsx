import type { FC, ReactNode } from "react";

import { Button } from "@/shared/ui/button";
import {
  ConsoleDrawer,
  ConsoleDrawerActions,
  ConsoleDrawerBar,
  ConsoleDrawerContent,
  ConsoleDrawerStatus,
} from "@/shared/ui/console-drawer";
import { StatusDot } from "@/shared/ui/status-dot";
import type { ConsoleStatus } from "./status";

/** The well's id: the shell's e2e and `aria-controls` find the body by it */
export const CONSOLE_BODY_ID = "flow-console-drawer-body";

interface BaseConsoleDrawerProps {
  open: boolean;
  /** The state the drawer asks for, which may be the one it is in */
  onOpenChange: (open: boolean) => void;
  onClear: () => void;
  status: ConsoleStatus;
  children?: ReactNode;
}

/**
 * The console under the stage, drawn from the design system's drawer. The
 * layout shell owns its height (folded, it is `BOTTOM_BAR_PX` tall: the
 * strip alone) and the shortcut, so the drawer's own hotkey is off and the
 * well fills whatever height the panel has. The bar's `h-bar` is the design
 * system's `--layout-bar` (1.75rem) and must equal `BOTTOM_BAR_PX` (28), or
 * the folded panel cuts the bar or leaves a gap under it.
 */
const BaseConsoleDrawer: FC<BaseConsoleDrawerProps> = ({
  open,
  onOpenChange,
  onClear,
  status,
  children,
}) => (
  <ConsoleDrawer
    open={open}
    onOpenChange={onOpenChange}
    hotkey={null}
    contentId={CONSOLE_BODY_ID}
    className="h-full rounded-b-md border border-t-0 border-border bg-surface"
  >
    <ConsoleDrawerBar triggerLabel="Console" className="shrink-0">
      <ConsoleDrawerStatus>
        <StatusDot variant={status.tone} />
        <span
          data-console-label
          className="font-semibold tracking-wide text-foreground"
        >
          Console
        </span>
        {status.text && (
          <span className={status.tone === "error" ? "text-error" : undefined}>
            {status.text}
          </span>
        )}
      </ConsoleDrawerStatus>
      <ConsoleDrawerActions>
        <span aria-hidden className="font-mono opacity-60">
          ⌘J
        </span>
        {open && (
          <Button type="button" variant="ghost" size="xs" onClick={onClear}>
            Clear
          </Button>
        )}
      </ConsoleDrawerActions>
    </ConsoleDrawerBar>
    {/* The terminal's own root has no height; stretch it to the well so
        xterm's fit sees a real size and counts the right rows. */}
    <ConsoleDrawerContent className="flex h-auto min-h-0 flex-1 flex-col overflow-hidden max-md:data-[state=open]:h-auto [&>div]:min-h-0 [&>div]:flex-1">
      {children}
    </ConsoleDrawerContent>
  </ConsoleDrawer>
);

export default BaseConsoleDrawer;
