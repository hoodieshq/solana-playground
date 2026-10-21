import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

/* What the mechanics share: the code card they play on and its lines */

/** The editor card, glass over the banner's pixels like the banner's own picture. Its mono size
 * and line height are the ones every mechanic sets its code in. No file tab: the banner's height is
 * fixed, and the code needs the room. `reply` is the terminal's short answer to the last move, set
 * under the code inside the card so it never sits on the pixels */
export function CodeCard({ className, reply, children }: { className?: string; reply?: ReactNode; children: ReactNode }) {
  return (
    <div className={cn("rounded-panel border border-border bg-surface-well/85 font-mono text-[0.75rem]/[1.25rem] backdrop-blur-[6px]", className)}>
      <div className="px-3 py-2">{children}</div>
      {reply && <div className="border-t border-border px-3 py-1.5 text-muted-foreground">{reply}</div>}
    </div>
  )
}

/** A reply line: a comment, in the editor's grey, the way a terminal answers */
export function Reply({ children }: { children: ReactNode }) {
  return (
    <p>
      <span className="text-syntax-comment">//</span> {children}
    </p>
  )
}

/** A line of code that's only there for context: dim, never wrapped, faded out at the card's edge
 * when it can't fit. `plain` keeps its own colours, for a line that matters but may still run long */
export function ContextLine({ n, plain = false, children }: { n: number; plain?: boolean; children: ReactNode }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "flex min-h-5 overflow-hidden whitespace-pre [mask-image:linear-gradient(to_right,#000_calc(100%-1.5rem),transparent)]",
        plain ? "text-syntax-plain" : "text-muted-foreground/80"
      )}
    >
      <Gutter n={n} />
      {children}
    </div>
  )
}

/** The line number, in the comment grey, two characters wide and a space */
export function Gutter({ n }: { n: number }) {
  return (
    <span aria-hidden="true" className="w-[3ch] shrink-0 text-syntax-comment">
      {String(n).padStart(2)}
    </span>
  )
}
