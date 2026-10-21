import { useState } from "react"
import { ChevronDown, RotateCcw, SlidersHorizontal } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Segmented, SegmentedItem } from "@/components/ui/segmented"
import { cn } from "@/lib/utils"

import { switchView, view, type View } from "./view"

/** Phone or desktop, and Reset. Under the phone it sits in the caption row. Over the desktop
 * screen it floats in the bottom left corner, over the empty foot of the navigation, where it
 * covers no action, and folds away, so the screen reads as the product */
export function ViewSwitch({ onReset, floating = false }: { onReset: () => void; floating?: boolean }) {
  // Under 1280 the navigation is a rail of icons, too narrow to hold the plaque, so it starts folded
  const [open, setOpen] = useState(() => !floating || window.innerWidth >= 1280)

  if (floating && !open)
    return (
      <Button
        variant="secondary"
        size="sm"
        className="fixed bottom-3 left-3 z-50 shadow-modal"
        aria-label="Show prototype controls"
        onClick={() => setOpen(true)}
      >
        <SlidersHorizontal />
        Prototype
      </Button>
    )

  const views = (
    <Segmented
      value={view}
      onValueChange={(v) => v !== view && switchView(v as View)}
      aria-label="View"
      className={cn("pill h-8! rounded-full! border-0! p-0!", floating && "w-full")}
    >
      <SegmentedItem value="phone" className="flex-1 rounded-full! px-3!">
        Phone
      </SegmentedItem>
      <SegmentedItem value="desktop" className="flex-1 rounded-full! px-3!">
        Desktop
      </SegmentedItem>
    </Segmented>
  )
  const reset = (
    <Button variant="ghost" size="sm" onClick={onReset}>
      <RotateCcw />
      Reset
    </Button>
  )

  if (!floating)
    return (
      <div className="flex items-center gap-2">
        {views}
        {reset}
      </div>
    )

  // Stacked, so it fits the navigation's 200px
  return (
    <div className="fixed bottom-3 left-3 z-50 flex w-44 flex-col gap-1 rounded-panel border border-border bg-surface-panel p-1.5 shadow-modal">
      {views}
      <div className="flex items-center justify-between">
        {reset}
        <Button variant="ghost" size="icon" className="size-8" aria-label="Hide prototype controls" onClick={() => setOpen(false)}>
          <ChevronDown />
        </Button>
      </div>
    </div>
  )
}
