import { useState } from "react"
import { ChevronDown, RotateCcw, SlidersHorizontal } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Segmented, SegmentedItem } from "@/components/ui/segmented"
import { cn } from "@/lib/utils"

import { switchView, view, type View } from "./view"

/** Phone or desktop, and Reset. Under the phone it sits in the caption row. Over the desktop
 * screen it floats in a corner and folds away, so the screen reads as the product */
export function ViewSwitch({ onReset, floating = false }: { onReset: () => void; floating?: boolean }) {
  const [open, setOpen] = useState(true)

  if (floating && !open)
    return (
      <Button
        variant="secondary"
        size="sm"
        className="fixed right-4 bottom-4 z-50 shadow-modal"
        aria-label="Show prototype controls"
        onClick={() => setOpen(true)}
      >
        <SlidersHorizontal />
        Prototype
      </Button>
    )

  return (
    <div
      className={cn(
        "flex items-center gap-2",
        floating && "fixed right-4 bottom-4 z-50 rounded-full border border-border bg-surface-panel p-1 pl-1.5 shadow-modal"
      )}
    >
      <Segmented
        value={view}
        onValueChange={(v) => v !== view && switchView(v as View)}
        aria-label="View"
        className="pill h-8! rounded-full! border-0! p-0!"
      >
        <SegmentedItem value="phone" className="rounded-full! px-3!">
          Phone
        </SegmentedItem>
        <SegmentedItem value="desktop" className="rounded-full! px-3!">
          Desktop
        </SegmentedItem>
      </Segmented>
      <Button variant="ghost" size="sm" onClick={onReset}>
        <RotateCcw />
        Reset
      </Button>
      {floating && (
        <Button variant="ghost" size="icon" className="size-8" aria-label="Hide prototype controls" onClick={() => setOpen(false)}>
          <ChevronDown />
        </Button>
      )}
    </div>
  )
}
