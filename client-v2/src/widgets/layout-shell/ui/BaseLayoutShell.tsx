import { cn } from "cn";
import { useEffect, useRef } from "react";
import type { CSSProperties, ReactNode } from "react";
import { usePanelRef } from "react-resizable-panels";

import type { Viewport } from "@/shared/lib/hooks/use-viewport";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/shared/ui/resizable";
import { Sheet, SheetContent, SheetTitle } from "@/shared/ui/sheet";
import {
  Sidebar,
  SidebarInset,
  SidebarProvider,
  useSidebar,
} from "@/shared/ui/sidebar";
import { GAP } from "@/views/flow/tokens";
import type {
  HorizontalLayout,
  PanelLayout,
  VerticalLayout,
} from "../model/layout-state";

/** Sizes in px; the design system gives the left panel's in rem (`SIDEBAR_STYLE`) */
export const PANEL_SIZES = {
  assistant: { default: 348, min: 280, max: 560, folded: 24 },
  console: { default: 256, min: 120, folded: 28 },
  centerMin: 320,
} as const;

/** 14.5 rem open and 3.25 rem as a rail, as the design system's migration map has it */
const SIDEBAR_STYLE = {
  "--sidebar-width": "14.5rem",
  "--sidebar-width-icon": "3.25rem",
} as CSSProperties;

/**
 * Same variants as `shared/ui/sheet`'s own `data-[side=right]:w-3/4
 * data-[side=right]:sm:max-w-sm`: an unprefixed `w-full` loses to them
 */
const SHEET_WIDTH: Record<Exclude<Viewport, "wide">, string> = {
  compact:
    "data-[side=right]:w-[21.75rem] data-[side=right]:sm:max-w-[21.75rem]",
  phone: "data-[side=right]:w-full data-[side=right]:sm:max-w-full",
};

export interface PanelState {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export interface BaseLayoutShellProps {
  viewport: Viewport;
  leftOpen: boolean;
  onLeftOpenChange: (open: boolean) => void;
  /**
   * The assistant's open state, which follows the viewport: the panel on a
   * wide screen (`onOpenChange` is a drag folding or unfolding it), the Sheet
   * below 1024 px
   */
  assistantState: PanelState;
  /** The console is folded or unfolded by dragging */
  consoleState: PanelState;
  horizontal?: HorizontalLayout;
  vertical?: VerticalLayout;
  onHorizontalLayout: (layout: PanelLayout) => void;
  onVerticalLayout: (layout: PanelLayout) => void;
  /**
   * Renders the left panel's content. It is handed the stock Sidebar's toggle
   * (which opens the Sheet below 768 px) and whether the Sidebar is in that
   * Sheet mode.
   */
  left: (stock: { toggle: () => void; isMobile: boolean }) => ReactNode;
  /**
   * Below 768 px: the left panel's Sheet opened or closed. Not folded into one
   * open/onOpenChange pair with `leftOpen`: the stock Sidebar keeps the
   * Sheet's state (`openMobile`) to itself and takes no prop for it, so the
   * two modes cannot be one controlled value.
   */
  onLeftSheetChange: (open: boolean) => void;
  stage: ReactNode;
  console: ReactNode;
  assistant: ReactNode;
  /** Below 1024 px: what opens the assistant Sheet, on the right edge */
  assistantOpener: ReactNode;
  /**
   * The font a Sheet's content is set in. Sheets portal outside the app
   * wrapper that sets it, so they would fall back to the browser's.
   */
  sheetFont?: CSSProperties;
}

/**
 * The library also reports a layout on mount and when a window resize
 * re-clamps it. Those are not choices: saving them would pin the sizes of
 * whatever window the page last opened in.
 */
const savedWhenDragged =
  (save: (layout: PanelLayout) => void) =>
  (layout: PanelLayout, meta: { isUserInteraction: boolean }) => {
    if (meta.isUserInteraction) save(layout);
  };

const LeftSlot = ({
  render,
}: {
  render: (stock: { toggle: () => void; isMobile: boolean }) => ReactNode;
}) => {
  const { toggleSidebar, isMobile } = useSidebar();
  return <>{render({ toggle: toggleSidebar, isMobile })}</>;
};

/**
 * Below 768 px the stock Sidebar is a Sheet nothing else opens, so this
 * renders its opener at the left edge and reports the Sheet opening and
 * closing (not the value it starts with).
 */
const LeftSheetOpener = ({
  onChange,
}: {
  onChange: (open: boolean) => void;
}) => {
  const { isMobile, openMobile, setOpenMobile } = useSidebar();
  const previous = useRef(openMobile);
  useEffect(() => {
    if (previous.current === openMobile) return;
    previous.current = openMobile;
    onChange(openMobile);
  }, [openMobile, onChange]);
  if (!isMobile) return null;
  return (
    <div className="absolute top-1 left-0 z-10">
      <button
        type="button"
        aria-label="Expand project panel"
        className="rounded-r-md border border-l-0 border-border bg-card px-1.5 py-2 text-muted-foreground hover:text-foreground"
        onClick={() => setOpenMobile(true)}
      >
        ›
      </button>
    </div>
  );
};

/**
 * The area under Flow's header: the left panel as the stock Sidebar, the
 * stage over the console, and the assistant beside them on a wide screen or
 * in a Sheet below 1024 px. Lays out what it is given; holds no state.
 */
const BaseLayoutShell = (props: BaseLayoutShellProps) => {
  const assistantRef = usePanelRef();
  const consoleRef = usePanelRef();
  // The size each panel last had open, in px. Opening goes through
  // `resize(openSize)`, not `expand()`: `expand()` restores a size the panel
  // had before it folded, and a panel that mounted folded never had one, so it
  // would open at its minimum instead of its default.
  const assistantOpenSize = useRef<number>(PANEL_SIZES.assistant.default);
  const consoleOpenSize = useRef<number>(PANEL_SIZES.console.default);

  // `open` props drive the panels; a drag that folds one reports back
  // through `onResize`, so the two never disagree for long. A panel that
  // mounts again on a wide screen starts at its `defaultSize`, which follows
  // `assistantState.open`, so nothing re-syncs it here: on that first run the
  // panel's handle is not yet registered with its group, and its
  // `isCollapsed()` throws "Panel constraints not found". The flag follows the
  // viewport, so crossing 1024 px changes it too: that change is skipped.
  // `assistantSeen` is the viewport of the last render the effect below
  // saw, renewed by its own effect after it so that every viewport change
  // reaches it, not only the ones that also change the flag.
  const assistantSeen = useRef(props.viewport);
  useEffect(() => {
    const panel = assistantRef.current;
    if (props.viewport !== "wide" || assistantSeen.current !== "wide") return;
    if (!panel || panel.isCollapsed() === !props.assistantState.open) return;
    if (props.assistantState.open) panel.resize(assistantOpenSize.current);
    else panel.collapse();
    // The viewport is read, not a trigger: its changes are the ones skipped
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.assistantState.open, assistantRef]);
  useEffect(() => {
    assistantSeen.current = props.viewport;
  }, [props.viewport]);

  useEffect(() => {
    const panel = consoleRef.current;
    if (!panel || panel.isCollapsed() === !props.consoleState.open) return;
    if (props.consoleState.open) panel.resize(consoleOpenSize.current);
    else panel.collapse();
  }, [props.consoleState.open, consoleRef]);

  const wide = props.viewport === "wide";

  const center = (
    <ResizablePanelGroup
      orientation="vertical"
      id="layout-vertical"
      defaultLayout={props.vertical}
      onLayoutChanged={savedWhenDragged(props.onVerticalLayout)}
    >
      <ResizablePanel id="stage" className="flex min-h-0 flex-col">
        {props.stage}
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel
        id="console"
        panelRef={consoleRef}
        collapsible
        collapsedSize={PANEL_SIZES.console.folded}
        defaultSize={
          props.consoleState.open
            ? PANEL_SIZES.console.default
            : PANEL_SIZES.console.folded
        }
        minSize={PANEL_SIZES.console.min}
        groupResizeBehavior="preserve-pixel-size"
        className="flex min-h-0 flex-col"
        onResize={(size) => {
          const folded = consoleRef.current?.isCollapsed();
          if (folded === false && size.inPixels > PANEL_SIZES.console.folded) {
            consoleOpenSize.current = size.inPixels;
          }
          if (folded !== undefined && folded === props.consoleState.open) {
            props.consoleState.onOpenChange(!folded);
          }
        }}
      >
        {props.console}
      </ResizablePanel>
    </ResizablePanelGroup>
  );

  return (
    <SidebarProvider
      open={props.leftOpen}
      onOpenChange={props.onLeftOpenChange}
      style={{ ...SIDEBAR_STYLE, padding: `0 ${GAP} ${GAP}` }}
      className="relative min-h-0 flex-1"
    >
      {/* The stock Sidebar is fixed at the window's full height; Flow's
          header keeps the top, so it sits in the area under it instead, inset
          by the gutter. The left panel draws its own rounded border, so the
          container's edge line and fill are dropped. */}
      <Sidebar
        collapsible="icon"
        className="absolute inset-y-0 h-auto group-data-[side=left]:border-r-0 [&>[data-slot=sidebar-inner]]:bg-transparent"
        style={{ left: GAP, bottom: GAP }}
      >
        <div className="contents" style={props.sheetFont}>
          <LeftSlot render={props.left} />
        </div>
      </Sidebar>
      <LeftSheetOpener onChange={props.onLeftSheetChange} />
      <SidebarInset className="relative min-h-0 min-w-0 md:ml-2">
        {/* One tree at every width, so a rotate across 1024 px does not
            remount the stage, Monaco or the console's terminal. Below 1024 px
            the group holds only the centre, so it neither takes nor saves the
            horizontal layout: crossing a breakpoint writes nothing. */}
        <ResizablePanelGroup
          orientation="horizontal"
          id="layout-horizontal"
          defaultLayout={wide ? props.horizontal : undefined}
          onLayoutChanged={
            wide ? savedWhenDragged(props.onHorizontalLayout) : undefined
          }
        >
          <ResizablePanel
            id="center"
            minSize={PANEL_SIZES.centerMin}
            className="flex min-w-0 flex-col"
          >
            {center}
          </ResizablePanel>
          {wide && <ResizableHandle className="w-2 bg-transparent" />}
          {wide && (
            <ResizablePanel
              id="assistant"
              panelRef={assistantRef}
              collapsible
              collapsedSize={PANEL_SIZES.assistant.folded}
              defaultSize={
                props.assistantState.open
                  ? PANEL_SIZES.assistant.default
                  : PANEL_SIZES.assistant.folded
              }
              minSize={PANEL_SIZES.assistant.min}
              maxSize={PANEL_SIZES.assistant.max}
              groupResizeBehavior="preserve-pixel-size"
              className="flex min-w-0 flex-col"
              onResize={(size) => {
                const folded = assistantRef.current?.isCollapsed();
                if (
                  folded === false &&
                  size.inPixels > PANEL_SIZES.assistant.folded
                ) {
                  assistantOpenSize.current = size.inPixels;
                }
                if (
                  folded !== undefined &&
                  folded === props.assistantState.open
                ) {
                  props.assistantState.onOpenChange(!folded);
                }
              }}
            >
              {props.assistant}
            </ResizablePanel>
          )}
        </ResizablePanelGroup>
        {props.viewport !== "wide" && (
          <>
            {/* Under the settings panel (fixed, z-2) when it opens over it */}
            <div className="absolute top-1 right-0 z-1">
              {props.assistantOpener}
            </div>
            <Sheet
              open={props.assistantState.open}
              onOpenChange={props.assistantState.onOpenChange}
            >
              <SheetContent
                side="right"
                showCloseButton={false}
                aria-describedby={undefined}
                className={cn("p-0", SHEET_WIDTH[props.viewport])}
                style={props.sheetFont}
              >
                <SheetTitle className="sr-only">Assistant</SheetTitle>
                {props.assistant}
              </SheetContent>
            </Sheet>
          </>
        )}
      </SidebarInset>
    </SidebarProvider>
  );
};

export default BaseLayoutShell;
