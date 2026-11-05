import type { PointerEvent } from "react";
import { useRef } from "react";

import { Outlet } from "@/shared/lib/outlet";
import { cn } from "@/shared/lib/utils";
import { BOTTOM_BAR_PX } from "@/views/flow/tokens";

import type { TutorialPhoneSlot } from "./BaseLayoutShell";

/** How far a swipe must travel sideways to change space, in px */
export const SWIPE_MIN_DX = 56;
/** A swipe from this close to the left edge is the browser's back gesture */
const EDGE_PX = 20;

export interface BaseTutorialPhoneProps {
  phone: TutorialPhoneSlot;
  stageNode: HTMLDivElement;
  consoleNode: HTMLDivElement;
  consoleOpen: boolean;
  /** From `LAYOUT_BREAKPOINTS.phone` to the frame: the chat is centred */
  tablet: boolean;
}

/**
 * Whether `from`, or anything between it and `until`, scrolls sideways: a
 * swipe there is that element's scroll (Monaco, a code block), not a change
 * of space.
 */
const scrollsSideways = (from: EventTarget, until: Element) => {
  for (
    let el = from instanceof Element ? from : undefined;
    el && el !== until;
    el = el.parentElement ?? undefined
  ) {
    if (el.scrollWidth <= el.clientWidth) continue;
    const { overflowX } = getComputedStyle(el);
    if (overflowX === "auto" || overflowX === "scroll") return true;
  }
  return false;
};

/**
 * A tutorial below the frame's width: the head over Chat and Code side by
 * side, one in view. The strip slides between them; the one out of view is
 * inert, so focus and screen readers stay in the shown one. Code is the
 * stage over the console, both outlets the shell owns, so they move here
 * from the frame without remounting.
 */
const BaseTutorialPhone = ({
  phone,
  stageNode,
  consoleNode,
  consoleOpen,
  tablet,
}: BaseTutorialPhoneProps) => {
  const start = useRef<{ x: number; y: number } | undefined>(undefined);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    // A mouse drag selects text; only a finger or a pen swipes
    const touch = event.pointerType === "touch" || event.pointerType === "pen";
    start.current =
      touch &&
      event.clientX >= EDGE_PX &&
      !scrollsSideways(event.target, event.currentTarget)
        ? { x: event.clientX, y: event.clientY }
        : undefined;
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const from = start.current;
    start.current = undefined;
    if (!from) return;
    const dx = event.clientX - from.x;
    const dy = event.clientY - from.y;
    // Mostly sideways: a vertical scroll of the feed that drifts is not a swipe
    if (Math.abs(dx) < SWIPE_MIN_DX || Math.abs(dx) < 2 * Math.abs(dy)) return;
    if (dx < 0 && phone.space === "chat") phone.onSpace("code", "swipe");
    if (dx > 0 && phone.space === "code") phone.onSpace("chat", "swipe");
  };

  const code = phone.space === "code";
  return (
    <div
      data-testid="tutorial-phone"
      className="flex h-full min-h-0 w-full flex-col pb-[env(safe-area-inset-bottom,0px)]"
    >
      {phone.head}
      <div
        className="relative min-h-0 flex-1 overflow-hidden"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (start.current = undefined)}
      >
        <div
          className={cn(
            "flex h-full w-[200%] transition-transform duration-300 motion-reduce:transition-none",
            code && "-translate-x-1/2"
          )}
        >
          <section
            aria-label="Chat"
            inert={code}
            className="flex h-full w-1/2 min-w-0 flex-col"
          >
            {tablet ? (
              <div className="mx-auto flex min-h-0 w-full max-w-[640px] flex-1 flex-col px-8">
                {phone.chat}
              </div>
            ) : (
              phone.chat
            )}
          </section>
          <section
            aria-label="Code"
            inert={!code}
            className="flex h-full w-1/2 min-w-0 flex-col"
          >
            <Outlet node={stageNode} className="flex min-h-0 flex-1 flex-col" />
            <Outlet
              node={consoleNode}
              // Closed, the console is its bar: the body stays mounted (the
              // terminal keeps its buffer) and is clipped, as on the pager.
              // Open, it takes a share of the space and leaves the editor
              // room above it.
              className={cn(
                "flex min-h-0 shrink-0 flex-col",
                consoleOpen
                  ? "h-[42dvh] max-h-[42dvh] min-h-32"
                  : "overflow-hidden"
              )}
              style={consoleOpen ? undefined : { height: BOTTOM_BAR_PX }}
            />
          </section>
        </div>
      </div>
    </div>
  );
};

export default BaseTutorialPhone;
