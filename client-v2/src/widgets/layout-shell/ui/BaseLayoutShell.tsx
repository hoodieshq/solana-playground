import { cn } from "cn";
import { useEffect } from "react";
import type { CSSProperties, ReactNode } from "react";
import { usePanelRef } from "react-resizable-panels";

import type { Viewport } from "@/shared/lib/hooks/use-viewport";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/shared/ui/resizable";
import { Sheet, SheetContent, SheetTitle } from "@/shared/ui/sheet";
import { Sidebar, SidebarInset, SidebarProvider } from "@/shared/ui/sidebar";
import type { PanelLayout } from "../model/layout-state";

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

const SHEET_WIDTH: Record<Exclude<Viewport, "wide">, string> = {
  compact: "w-[21.75rem] sm:max-w-[21.75rem]",
  phone: "w-full sm:max-w-full",
};

export interface BaseLayoutShellProps {
  viewport: Viewport;
  leftOpen: boolean;
  onLeftOpenChange: (open: boolean) => void;
  assistantOpen: boolean;
  /** The assistant panel was folded or unfolded by dragging */
  onAssistantOpenChange: (open: boolean) => void;
  /** Below 1024 px: whether the assistant Sheet is open */
  assistantSheetOpen: boolean;
  onAssistantSheetChange: (open: boolean) => void;
  consoleOpen: boolean;
  /** The console panel was folded or unfolded by dragging */
  onConsoleOpenChange: (open: boolean) => void;
  horizontal?: PanelLayout;
  vertical?: PanelLayout;
  onHorizontalLayout: (layout: PanelLayout) => void;
  onVerticalLayout: (layout: PanelLayout) => void;
  left: ReactNode;
  stage: ReactNode;
  console: ReactNode;
  assistant: ReactNode;
  /** Below 1024 px: what opens the assistant Sheet, on the right edge */
  assistantOpener: ReactNode;
}

/**
 * The area under Flow's header: the left panel as the stock Sidebar, the
 * stage over the console, and the assistant beside them on a wide screen or
 * in a Sheet below 1024 px. Lays out what it is given; holds no state.
 */
const BaseLayoutShell = (props: BaseLayoutShellProps) => {
  const assistantRef = usePanelRef();
  const consoleRef = usePanelRef();

  // `open` props drive the panels; a drag that folds one reports back
  // through `onResize`, so the two never disagree for long. A panel that
  // mounts again on a wide screen starts at its `defaultSize`, which follows
  // `assistantOpen`, so nothing re-syncs it here (its handle is not yet
  // registered with the group when this effect runs, and throws).
  useEffect(() => {
    const panel = assistantRef.current;
    if (!panel || panel.isCollapsed() === !props.assistantOpen) return;
    if (props.assistantOpen) panel.expand();
    else panel.collapse();
  }, [props.assistantOpen, assistantRef]);

  useEffect(() => {
    const panel = consoleRef.current;
    if (!panel || panel.isCollapsed() === !props.consoleOpen) return;
    if (props.consoleOpen) panel.expand();
    else panel.collapse();
  }, [props.consoleOpen, consoleRef]);

  const wide = props.viewport === "wide";

  const center = (
    <ResizablePanelGroup
      orientation="vertical"
      id="layout-vertical"
      defaultLayout={props.vertical}
      onLayoutChanged={props.onVerticalLayout}
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
          props.consoleOpen
            ? PANEL_SIZES.console.default
            : PANEL_SIZES.console.folded
        }
        minSize={PANEL_SIZES.console.min}
        className="flex min-h-0 flex-col"
        onResize={() => {
          const folded = consoleRef.current?.isCollapsed();
          if (folded !== undefined && folded === props.consoleOpen) {
            props.onConsoleOpenChange(!folded);
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
      style={SIDEBAR_STYLE}
      className="relative min-h-0 flex-1"
    >
      {/* The stock Sidebar is fixed at the window's full height; Flow's
          header keeps the top, so it sits in the area under it instead */}
      <Sidebar collapsible="icon" className="absolute inset-y-0 h-full">
        {props.left}
      </Sidebar>
      <SidebarInset className="relative min-h-0 min-w-0">
        {/* One tree at every width, so a rotate across 1024 px does not
            remount the stage, Monaco or the console's terminal. Below 1024 px
            the group holds only the centre, so it neither takes nor saves the
            horizontal layout: crossing a breakpoint writes nothing. */}
        <ResizablePanelGroup
          orientation="horizontal"
          id="layout-horizontal"
          defaultLayout={wide ? props.horizontal : undefined}
          onLayoutChanged={wide ? props.onHorizontalLayout : undefined}
        >
          <ResizablePanel
            id="center"
            minSize={PANEL_SIZES.centerMin}
            className="flex min-w-0 flex-col"
          >
            {center}
          </ResizablePanel>
          {wide && <ResizableHandle />}
          {wide && (
            <ResizablePanel
              id="assistant"
              panelRef={assistantRef}
              collapsible
              collapsedSize={PANEL_SIZES.assistant.folded}
              defaultSize={
                props.assistantOpen
                  ? PANEL_SIZES.assistant.default
                  : PANEL_SIZES.assistant.folded
              }
              minSize={PANEL_SIZES.assistant.min}
              maxSize={PANEL_SIZES.assistant.max}
              className="flex min-w-0 flex-col"
              onResize={() => {
                const folded = assistantRef.current?.isCollapsed();
                if (folded !== undefined && folded === props.assistantOpen) {
                  props.onAssistantOpenChange(!folded);
                }
              }}
            >
              {props.assistant}
            </ResizablePanel>
          )}
        </ResizablePanelGroup>
        {props.viewport !== "wide" && (
          <>
            <div className="absolute top-1 right-0 z-10">
              {props.assistantOpener}
            </div>
            <Sheet
              open={props.assistantSheetOpen}
              onOpenChange={props.onAssistantSheetChange}
            >
              <SheetContent
                side="right"
                className={cn("p-0", SHEET_WIDTH[props.viewport])}
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
