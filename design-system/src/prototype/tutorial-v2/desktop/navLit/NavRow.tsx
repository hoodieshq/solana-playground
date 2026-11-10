import { useState, type ReactNode } from "react"

import { cn } from "@/lib/utils"

import { FOCUS, HOVER, Tip, useRoomy, useTablet } from "./parts"
import { RowMenu, type RowMenuFor } from "./RowMenu"

type Props = {
  kind: "destination" | "item" | "service"
  glyph?: ReactNode
  label: string
  /** The right slot when nothing needs you: "2/4", "4 steps" */
  meta?: ReactNode
  current?: boolean
  /** Tutorials while a lesson is open: bright, no fill, no marker */
  section?: boolean
  /** Words for the right slot, in amber ink, before any meta */
  attention?: string
  menu?: RowMenuFor
  tip?: string
  /** The accessible name, where it says more than the label ("Hello Anchor, lesson, step 2 of 4") */
  name?: string
  /** Set by the shell on the row focus lands on when the overlay opens */
  autoFocusRow?: boolean
  onClick: () => void
}

const HEIGHT = { destination: "h-[1.875rem]", item: "h-[1.875rem]", service: "h-[1.875rem]" }
/** Two text styles in the whole nav, as Claude's sidebar has: this row style for every place, lesson,
 * project and you, and the group heading's small quiet one (NavGroup). Service rows ("Show all") are
 * the heading's style too */
const ROW = "text-[0.875rem] leading-5 font-act tracking-[-0.005em] text-foreground"
const TYPE = {
  destination: ROW,
  item: ROW,
  service: "text-[0.75rem] font-act tracking-[0.01em] text-(color:--text-quiet)",
}
const TABLET_TYPE = {
  destination: "text-control font-act tracking-[-0.005em] text-foreground",
  item: "text-control font-act tracking-[-0.005em] text-foreground",
  service: "text-[0.75rem] font-act tracking-[0.01em] text-(color:--text-quiet)",
}

/** One row of the open nav. A destination, a lesson or a project is 30 high in the one row style, a
 * lesson or a project with a ⋯ menu; a service row ("Show all 13") 30 high in the heading's quiet 12px.
 * Rows touch, no gap, so a long list fits as in the old nav; the hover fill keeps them apart. The fill runs
 * from x 8 to 232, the glyph's box sits at x 16 to 36 and the text starts at x 46. On the tablet every
 * row is 44 high and the type a step up where the nav is a full screen sheet (phone, Tablet 820) */
export function NavRow({ kind, glyph, label, meta, current = false, section = false, attention, menu, tip, name, onClick }: Props) {
  const tablet = useTablet()
  const roomy = useRoomy()
  const [menuOpen, setMenuOpen] = useState(false)
  const slot = attention ? <span className="text-[0.75rem] font-act tracking-[0.01em] text-warning-ink">{attention}</span> : meta
  return (
    <div className="group/row relative" onContextMenu={menu ? (e) => (e.preventDefault(), setMenuOpen(true)) : undefined}>
      <Tip label={tip}>
        <button
          type="button"
          onClick={onClick}
          aria-current={current ? "page" : undefined}
          aria-label={name}
          data-here={current || undefined}
          className={cn(
            "flex w-full items-center rounded-lg text-left whitespace-nowrap",
            FOCUS,
            HOVER,
            roomy ? "h-11 gap-2.5 px-1.5 active:bg-surface-hover" : cn(HEIGHT[kind], "gap-2.5 px-2 active:bg-surface-hover"),
            roomy ? TABLET_TYPE[kind] : TYPE[kind],
            current ? "bg-(--nav-current) font-act text-foreground" : "hover:bg-(--nav-hover) hover:text-foreground",
            menuOpen && !current && "bg-(--nav-hover) text-foreground",
            section && "text-foreground",
            // Where the ⋯ always shows it sits after the right slot; where it shows on hover it takes the slot's place
            menu && (roomy ? "pr-12" : tablet || current || menuOpen ? "pr-8" : "group-focus-within/row:pr-8 group-hover/row:pr-8")
          )}
        >
          {/* Places lead with their icon, a lesson with its progress ring, a project with a folder: one
              column of marks, every name on one line */}
          {glyph && (
            <span
              aria-hidden="true"
              className={cn(
                "flex shrink-0 items-center justify-center",
                roomy ? "size-6 [&>svg]:h-5 [&>svg]:w-full" : "size-5 [&>svg]:h-[1.125rem] [&>svg]:w-full",
                kind !== "service" && (current || section ? "text-foreground" : "text-muted-foreground group-hover/row:text-foreground")
              )}
            >
              {glyph}
            </span>
          )}
          <span className="min-w-0 flex-1 truncate">{label}</span>
          {slot && (
            <span
              aria-hidden="true"
              className={cn("ml-auto shrink-0", menu && !tablet && !current && (menuOpen ? "hidden" : "group-focus-within/row:hidden group-hover/row:hidden"))}
            >
              {slot}
            </span>
          )}
        </button>
      </Tip>
      {menu && <RowMenu row={menu} open={menuOpen} onOpenChange={setMenuOpen} />}
    </div>
  )
}

/** The lesson's "2/4", in mono with even figures */
export const Meta = ({ children, current = false }: { children: ReactNode; current?: boolean }) => {
  const roomy = useRoomy()
  return (
    <span className={cn("font-mono tracking-[0.02em] tabular-nums", roomy ? "text-[0.75rem]" : "text-[0.6875rem]", current ? "text-muted-foreground" : "text-(color:--text-quiet)")}>{children}</span>
  )
}
