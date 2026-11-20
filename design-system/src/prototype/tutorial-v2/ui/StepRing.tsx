import type { CSSProperties } from "react"

import { cn } from "@/lib/utils"

import { LIT_STROKE } from "../desktop/navLit/icons"

/** Where a run of steps stands, as one ring before the words "Step 2 of 4 · Build": a whole grey track and
 * an arc over it as long as the share done. One continuous ring, not an arc a step: four pieces read as four
 * things (Almaz, 20 Nov). The lesson and the project draw the same one, so moving from a tutorial to its
 * program keeps the pattern (Nikita, 20 Nov). The arc takes the colour of what stands: red after a failure,
 * amber when the code moved past a build */
export function StepRing({ done, of, tone, running = false, className, style }: { done: number; of: number; tone?: "error" | "warning"; running?: boolean; className?: string; style?: CSSProperties }) {
  const r = 8
  const c = 2 * Math.PI * r
  const share = of > 0 ? Math.min(done, of) / of : 0
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" width={16} height={16} style={style} className={cn("shrink-0 -rotate-90", className)}>
      <circle cx="10" cy="10" r={r} fill="none" strokeWidth={LIT_STROKE} className="stroke-border-strong" />
      {share > 0 && (
        <circle
          cx="10"
          cy="10"
          r={r}
          fill="none"
          strokeWidth={LIT_STROKE}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - share)}
          className={cn(
            tone === "error" ? "stroke-error" : tone === "warning" ? "stroke-warning" : "stroke-muted-foreground",
            running && "animate-pulse",
            "transition-[stroke-dashoffset] duration-500 ease-out motion-reduce:transition-none"
          )}
        />
      )}
    </svg>
  )
}
