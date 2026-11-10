import { ChevronRight } from "lucide-react"
import { useState, type ReactNode } from "react"

import { StatusDot } from "@/components/ui/status-dot"
import { cn } from "@/lib/utils"


const FOCUS = "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-purple"

/** Rows before Show all: three keep the catalog under it in the first screen, as Home's Your projects */
const FIRST = 3

export type ResumeItem = {
  key: string
  cover: ReactNode
  name: string
  where: string
  done?: boolean
  onOpen: () => void
  /** The row's own ⋯, after Continue */
  menu?: ReactNode
  /** In the row's place while a delete is asked about */
  confirm?: ReactNode
}

/** What you started, at the top of Tutorials and of Programs (Almaz, 10 Nov): left half done, a lesson
 * or a project was found again only by its card, or not at all. One panel of rows, each row one button:
 * the cover, the name and where it stands in the words of its own step bar. Not drawn while empty */
export function ResumeList({ id, title, count, items, className }: { id: string; title: string; count?: string; items: ResumeItem[]; className?: string }) {
  const [open, setOpen] = useState(false)
  if (!items.length) return null
  const more = items.length > FIRST
  const shown = more && !open ? items.slice(0, FIRST) : items
  return (
    <section aria-labelledby={id} className={className}>
      <div className="mb-2.5 flex min-h-9 items-center gap-2">
        <h2 id={id} className="font-heading text-[1.25rem] leading-[1.5rem] font-medium text-foreground">
          {title}
        </h2>
        {count && <span className="text-[0.8125rem] leading-[1.125rem] text-muted-foreground tabular-nums">{count}</span>}
        {/* The levels' Show all, opening in place. With the number: rows don't show how many hide behind it */}
        {more && (
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen(!open)}
            className={cn("-mr-2 ml-auto flex h-9 items-center gap-1 rounded-lg px-2 text-[0.8125rem] text-muted-foreground tabular-nums hover:text-foreground", FOCUS)}
          >
            {open ? "Show less" : `Show all ${items.length}`}
            <span
              aria-hidden="true"
              className={cn("flex size-3.5 transition-transform duration-200 ease-[cubic-bezier(0.22,0.61,0.36,1)] motion-reduce:transition-none [&>svg]:size-full", open ? "-rotate-90" : "rotate-90")}
            >
              <ChevronRight aria-hidden="true" strokeWidth={1.5} className="size-full" />
            </span>
          </button>
        )}
      </div>
      <ul className="overflow-hidden rounded-panel border border-border bg-surface-panel">
        {shown.map((it) =>
          it.confirm ? (
            // A delete asked about in the row itself, as Your projects' rows ask
            <li key={it.key} className="flex min-h-[4.25rem] items-center gap-3 px-4 py-3 not-last:border-b not-last:border-border">
              {it.confirm}
            </li>
          ) : (
            <li
              key={it.key}
              className="group/row relative flex items-center gap-3.5 px-4 py-3 transition-colors duration-100 not-last:border-b not-last:border-border hover:bg-[color-mix(in_srgb,var(--foreground)_4%,var(--surface-panel))] motion-reduce:transition-none"
            >
              {it.cover}
              <div className="min-w-0 flex-1">
                <p className="truncate font-heading text-[1.0625rem] leading-[1.25] font-normal tracking-[-0.015em] text-foreground">{it.name}</p>
                {/* Green and white once it's done, as the catalog's standing; grey while it's under way */}
                <p className={cn("mt-1 flex items-center gap-1.5 text-[0.8125rem] leading-[1.125rem]", it.done ? "text-foreground" : "text-muted-foreground")}>
                  <StatusDot variant={it.done ? "success" : "idle"} />
                  <span className="truncate">{it.where}</span>
                </p>
              </div>
              {/* The row's one button, stretched over it; the word says what a press does */}
              <button
                type="button"
                onClick={it.onOpen}
                aria-label={`${it.done ? "Open" : "Continue"} ${it.name}, ${it.where}`}
                className={cn(
                  "h-8 shrink-0 rounded-lg px-2.5 text-[0.8125rem] font-label text-muted-foreground transition-colors duration-100 after:absolute after:inset-0 after:content-[''] group-hover/row:text-foreground motion-reduce:transition-none",
                  FOCUS
                )}
              >
                {/* On a phone the word took the step's room and cut it short; a chevron says the same */}
                <span className="max-sm:hidden">{it.done ? "Open" : "Continue"}</span>
                <ChevronRight aria-hidden="true" className="hidden size-4 max-sm:block" />
              </button>
              {/* Over the stretched button, so it opens its own menu; shown under the pointer or the focus,
                always under a finger */}
              {it.menu && (
                <div className="relative z-10 -mr-1.5 opacity-0 transition-opacity duration-100 group-hover/row:opacity-100 focus-within:opacity-100 has-[[data-state=open]]:opacity-100 motion-reduce:transition-none pointer-coarse:opacity-100">
                  {it.menu}
                </div>
              )}
            </li>
          )
        )}
      </ul>
    </section>
  )
}
