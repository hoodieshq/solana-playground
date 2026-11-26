import { cn } from "@/lib/utils"

/** The brand mark's play triangle, its three bars as drawn there (brand-icon.tsx), the ring left out */
const BARS = (
  <>
    <path d="M38.022 17.025C31.787 10.706 36.263 0.001 45.139 0L169.07 0C171.745 0 174.309 1.073 176.188 2.977L420.203 250.263C426.438 256.582 421.961 267.287 413.085 267.287L289.155 267.287C286.48 267.287 283.916 266.215 282.037 264.311Z" />
    <path d="M35.308 559.444C26.431 559.444 21.955 548.738 28.19 542.42L272.206 295.134C274.085 293.229 276.649 292.157 279.324 292.157L403.254 292.157C412.131 292.157 416.607 302.863 410.372 309.181L166.356 556.468C164.477 558.372 161.913 559.444 159.238 559.444Z" />
    <path d="M2.343 43.128C2.384 34.242 13.13 29.82 19.414 36.104L107.001 123.69C108.891 125.58 109.945 128.147 109.93 130.819L108.2 425C108.2 430.3 106.1 435.4 102.3 439.2L17.1 524.4C10.8 530.7 0.05 526.2 0.05 517.3Z" />
  </>
)

/** The assistant's mark (Almaz, 25 Nov): the brand's triangle alone, in a square box so it sits where the eight
 * ray spark did. `strokeWidth` is the spark's and does nothing now; its callers still pass it */
export function AssistantMark({ className }: { className?: string; strokeWidth?: number }) {
  return (
    // A little right of centre: the triangle's weight sits by its upright bar
    <svg viewBox="-96 -20 600 600" fill="currentColor" aria-hidden="true" className={cn("size-4 shrink-0", className)}>
      {BARS}
    </svg>
  )
}

/** The mark where the assistant introduces itself: on a round plate a shade off the panel */
export function AssistantSign({ className }: { className?: string }) {
  return (
    <span className={cn("grid size-12 shrink-0 place-items-center rounded-full bg-foreground/6 text-muted-foreground", className)}>
      <svg viewBox="0 0 427 560" fill="currentColor" aria-hidden="true" className="h-6 w-auto translate-x-px">
        {BARS}
      </svg>
    </span>
  )
}
