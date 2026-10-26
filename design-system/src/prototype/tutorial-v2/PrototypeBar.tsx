import { ArrowUpRight, RotateCcw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Segmented, SegmentedItem } from "@/components/ui/segmented"

import { switchView, view, type View } from "./view"

// v1 is on this server in development and on its own stand once deployed (prototype/vercel-v2/build.sh)
const V1 = import.meta.env.VITE_V1_URL ?? "/prototype/tutorial/"

/** The prototype's own controls, in one place for both views: a thin strip across the top, over
 * the phone and tablet frames and over the desktop screen alike, so switching never moves them. A lighter
 * ground and small type keep it apart from the product, so it doesn't read as the app's header */
export function PrototypeBar({ onReset }: { onReset: () => void }) {
  return (
    <header
      aria-label="Prototype controls"
      className="grid h-10 shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-border bg-surface-raised px-4 text-caption text-muted-foreground"
    >
      <span className="truncate">Solana Playground · tutorial flow v2 · prototype</span>
      <Segmented
        value={view}
        onValueChange={(v) => v !== view && switchView(v as View)}
        aria-label="View"
        className="pill h-7! rounded-full! border-0! p-0!"
      >
        <SegmentedItem value="phone" className="rounded-full! px-3!">
          Phone
        </SegmentedItem>
        <SegmentedItem value="tablet" className="rounded-full! px-3!">
          Tablet
        </SegmentedItem>
        <SegmentedItem value="desktop" className="rounded-full! px-3!">
          Desktop
        </SegmentedItem>
      </Segmented>
      <div className="flex items-center gap-1 justify-self-end">
        {/* v1 as shown on 10/23, for the side by side. It gets no link back: it stays as it was */}
        <Button variant="ghost" size="sm" asChild>
          <a href={`${V1}${view === "phone" ? "" : `?view=${view}`}`}>
            Open v1
            <ArrowUpRight />
          </a>
        </Button>
        <Button variant="ghost" size="sm" onClick={onReset}>
          <RotateCcw />
          Reset
        </Button>
      </div>
    </header>
  )
}
