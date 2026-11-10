import { createContext, useContext, type ReactNode } from "react"

import { Kbd } from "@/components/ui/kbd"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

import { view } from "../../view"

/* What every part of Lit Path shares: the focus ring, the tablet switch, the tooltip */

export const FOCUS = "outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-purple"

/** Hover fills come in at 100ms and leave at 160ms */
export const HOVER = "transition-colors duration-160 ease-standard hover:duration-100 motion-reduce:transition-none"

export const IN_TABLET_FRAME = window.self !== window.top && view === "tablet"

/** A finger, or the tablet's frame on a desktop: 44px rows, the type a step up, ⋯ always shown and
 * no tooltips. The shell decides once and every part reads it */
export const TabletCtx = createContext(false)
export const useTablet = () => useContext(TabletCtx)

/** Finger sized rows (44, the type a step up) only where the nav is a full screen sheet: the phone and
 * the upright tablet. The landscape tablet keeps the desktop's rows and sizes (Almaz, 11/09) and only
 * the touch rules above */
export const RoomyCtx = createContext(false)
export const useRoomy = () => useContext(RoomyCtx)

/** A tooltip after 300ms, pointer only: on the tablet the trigger stands alone */
export function Tip({ label, keys, side = "right", children }: { label?: string; keys?: string; side?: "right" | "top" | "bottom"; children: ReactNode }) {
  const tablet = useTablet()
  if (!label || tablet) return <>{children}</>
  return (
    <Tooltip delayDuration={300}>
      {/* Pointer only: a focus doesn't open it, so the overlay's focus on the lesson row stays quiet */}
      <TooltipTrigger asChild onFocus={(e) => e.preventDefault()}>
        {children}
      </TooltipTrigger>
      <TooltipContent side={side} sideOffset={8}>
        {label}
        {keys && <Kbd className="ml-1.5">{keys}</Kbd>}
      </TooltipContent>
    </Tooltip>
  )
}
