import { LIT_STROKE } from "./icons"

/** Progress as one ring: the whole track, and a grey arc over it as long as the share done (purple was
 * the one colour in a nav of grey icons; Almaz, 11 Nov), at
 * the icons' stroke. Setup's row has it on the avatar's axis; each lesson in Learning has it on the right.
 * A full ring is done */
export function ProgressRing({ done, of, size }: { done: number; of: number; size: number }) {
  const r = 8
  const c = 2 * Math.PI * r
  // One arc per step with a gap between: a single arc at a quarter read as a loading spinner that never
  // stopped (Nikita, 20 Nov, Lumberjack in the nav). Past 8 steps the gaps would eat the arcs: one track
  const steps = of > 0 && of <= 8 ? of : 0
  const seg = steps ? c / steps : c
  const gap = steps > 1 ? 2.6 : 0
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" width={size} height={size} className="shrink-0 -rotate-90">
      {steps ? (
        Array.from({ length: steps }, (_, i) => (
          <circle
            key={i}
            cx="10"
            cy="10"
            r={r}
            fill="none"
            strokeWidth={LIT_STROKE}
            strokeDasharray={`${seg - gap} ${c - seg + gap}`}
            strokeDashoffset={-(i * seg + gap / 2)}
            className={i < Math.min(done, of) ? "stroke-muted-foreground" : "stroke-border-strong"}
          />
        ))
      ) : (
        <>
          <circle cx="10" cy="10" r={r} fill="none" strokeWidth={LIT_STROKE} className="stroke-border-strong" />
          {done > 0 && (
            <circle
              cx="10"
              cy="10"
              r={r}
              fill="none"
              strokeWidth={LIT_STROKE}
              strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={c * (1 - Math.min(done, of) / of)}
              className="stroke-muted-foreground transition-[stroke-dashoffset] duration-500 ease-out motion-reduce:transition-none"
            />
          )}
        </>
      )}
    </svg>
  )
}
