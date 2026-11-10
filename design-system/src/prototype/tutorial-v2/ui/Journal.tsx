import { useEffect, useId, useState, type ReactNode } from "react"
import { ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"

import { FOCUS } from "./type"

/* What already ran, as one quiet record. A small build row over two bold deploy and run cards, each
   in its own box, read as three different things and buried the finish card among them (Almaz, 8 Nov).
   Records that follow each other share one box, a row each, parted by hairlines. A failure or a card
   that waits on you ends the box, and records after it start a new one. Shared by the lesson and the
   project shell */

export function Journal({ children }: { children: ReactNode }) {
  return <section aria-label="Results" className="divide-y divide-border overflow-hidden rounded-control border border-border bg-(--card-ground)">{children}</section>
}

/** One record: the mark in one column, the label in one face, the time on the right. Only a row with
 * something to open is a button with a chevron, and it opens under itself in the same box. `open` is
 * where it starts: a newer record folds it (a state taken once kept a card open over the milestone) */
export function JournalRow({
  icon,
  label,
  took,
  open: initial = false,
  phone = false,
  status = false,
  children,
}: {
  icon: ReactNode
  label: ReactNode
  took?: string
  open?: boolean
  phone?: boolean
  /** The lesson announces each result as it lands */
  status?: boolean
  children?: ReactNode
}) {
  const id = useId()
  const [open, setOpen] = useState(initial)
  useEffect(() => setOpen(initial), [initial])
  const row = cn("flex h-10 w-full items-center gap-2.5 px-4 text-left pointer-coarse:h-11", phone && "h-11")
  // The chevron's column is kept on every row, so the times line up whether a row opens or not
  const head = (
    <>
      <span aria-hidden="true" className="flex w-4 shrink-0 justify-center [&_svg]:size-4 [&_svg]:shrink-0">
        {icon}
      </span>
      <span className="min-w-0 flex-1 truncate text-[0.9375rem] leading-5 font-act text-foreground">{label}</span>
      {took && <span className="shrink-0 text-[0.8125rem] leading-5 text-muted-foreground tabular-nums">{took}</span>}
      <span aria-hidden="true" className="flex w-4 shrink-0 justify-center">
        {children && (
          <ChevronDown
            className={cn(
              "size-4 text-muted-foreground transition-transform duration-150 ease-standard group-hover:text-foreground motion-reduce:transition-none",
              open && "rotate-180"
            )}
          />
        )}
      </span>
    </>
  )
  if (!children)
    return (
      <div role={status ? "status" : undefined} className={row}>
        {head}
      </div>
    )
  // A plain fold, not Radix's Collapsible: a row that lands open was measured shut for a frame, the feed
  // was clamped short of its foot and stopped following the new turn
  return (
    <div>
      <div role={status ? "status" : undefined}>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen(!open)}
          className={cn(row, "group transition-colors duration-150 ease-standard hover:bg-foreground/[0.04] active:bg-foreground/[0.06] motion-reduce:transition-none", FOCUS)}
        >
          {head}
          <span className="sr-only">{open ? "Hide details" : "Details"}</span>
        </button>
      </div>
      <div id={id} hidden={!open} className="animate-[pg-fade_240ms_var(--ease-out-value)_both]">
        {open && children}
      </div>
    </div>
  )
}
