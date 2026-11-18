import { useLayoutEffect, useRef, useState } from "react"
import { ChevronDown } from "lucide-react"

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

/** A suggested question. 28 high with 13px words: at 24 and 12 it sat under a 16px answer and over a 40px
 * field like a footnote (Almaz, 18 Nov) */
export const CHIP =
  "h-7 shrink-0 rounded-full border border-border-strong px-3 text-[0.8125rem] whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground outline-none focus-visible:outline-2 focus-visible:outline-brand-purple pointer-coarse:h-11 pointer-coarse:px-4"

const MORE_W = 76

/** The questions for the moment, in one row over the composer: the one way to ask with a press, in a
 * tutorial and beside a program's code alike. Those that don't fit fold into More; on a phone the row
 * scrolls sideways under a fade at the right edge. `onPick` gets the chip pressed, so the question can
 * fly from it into the thread */
export function ChipRow({ chips, phone = false, onPick }: { chips: string[]; phone?: boolean; onPick: (label: string, button?: HTMLElement) => void }) {
  const row = useRef<HTMLDivElement>(null)
  const [fits, setFits] = useState(chips.length)
  // Where More sits: right after the last chip that shows
  const [moreAt, setMoreAt] = useState(0)

  // How many chips fit whole beside More; all of them when they fit without it
  const key = chips.join("|")
  useLayoutEffect(() => {
    const el = row.current
    if (!el || phone) return
    const measure = () => {
      const kids = [...el.querySelectorAll<HTMLElement>("[data-chip]")]
      const room = el.clientWidth
      const end = (k: HTMLElement) => k.offsetLeft + k.offsetWidth
      // Measured at its own width: a squeeze from the last pass is taken off first
      if (kids[0]) kids[0].style.maxWidth = ""
      if (kids.every((k) => end(k) <= room + 0.5)) return setFits(kids.length)
      const i = kids.findIndex((k) => end(k) > room - MORE_W)
      const n = i === -1 ? kids.length : i
      // More is never alone (Almaz, 18 Nov: a menu with no question beside it gave nothing to press at
      // once). A first question too long for the row is cut to what is left beside More
      if (n === 0 && kids[0]) {
        kids[0].style.maxWidth = `${room - MORE_W - 6}px`
        setFits(1)
        return setMoreAt(room - MORE_W)
      }
      setFits(n)
      setMoreAt(end(kids[n - 1]) + 6)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [key, phone])

  if (chips.length === 0) return null
  const hidden = phone ? [] : chips.slice(fits)
  return (
    <div ref={row} className={cn("relative mb-3 flex gap-1.5", phone ? "-mx-4 overflow-x-auto px-4 [scrollbar-width:none] mask-r-from-[calc(100%-2.5rem)]" : "overflow-hidden")}>
      {chips.map((c, i) => {
        const out = !phone && i >= fits
        return (
          <button
            key={c}
            type="button"
            data-chip
            onClick={(e) => onPick(c, e.currentTarget)}
            tabIndex={out ? -1 : undefined}
            aria-hidden={out || undefined}
            // Kept in the row, unseen, so the row can measure it again when it widens
            title={c}
            className={cn(CHIP, "truncate", out && "invisible")}
          >
            {c}
          </button>
        )
      })}
      {hidden.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger style={{ left: moreAt }} className={cn(CHIP, "absolute top-0 flex items-center gap-1 bg-surface-base")}>
            More
            <ChevronDown className="size-3" aria-hidden="true" />
          </DropdownMenuTrigger>
          {/* As wide as its longest question, up to the column: at a fixed 208 one question broke in two and the
              rows lost their even step (Almaz, 18 Nov) */}
          <DropdownMenuContent side="top" align="start" sideOffset={6} className="w-max max-w-[min(22rem,calc(100vw-2rem))] min-w-52">
            {hidden.map((c) => (
              <DropdownMenuItem key={c} onSelect={() => onPick(c)} className="h-8 px-2.5 text-[0.8125rem] whitespace-nowrap">
                {c}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}
