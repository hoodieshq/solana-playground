import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

/** With a back button the title follows it. Without one the title starts on
 * the content's own edge, in line with the cards below. A screen with its own
 * large title passes none, and the bar keeps only its buttons */
export function TopBar({ left, title, right }: { left?: ReactNode; title?: string; right?: ReactNode }) {
  return (
    <header className={cn("flex h-phone-head shrink-0 items-center gap-1 border-b border-border pr-1.5", left ? "pl-1.5" : "pl-4")}>
      {left && <div className="flex size-11 shrink-0 items-center justify-center">{left}</div>}
      {title ? <h1 className="min-w-0 flex-1 truncate font-heading text-title">{title}</h1> : <span className="flex-1" />}
      <div className="flex size-11 shrink-0 items-center justify-center">{right}</div>
    </header>
  )
}
