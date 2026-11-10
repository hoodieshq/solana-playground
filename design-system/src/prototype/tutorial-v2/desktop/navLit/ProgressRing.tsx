import { LIT_STROKE } from "./icons"

/** Progress as one ring: the whole track, and a brand purple arc over it as long as the share done, at
 * the icons' stroke. Setup's row has it on the avatar's axis; each lesson in Learning has it on the right.
 * A full ring is done */
export function ProgressRing({ done, of, size }: { done: number; of: number; size: number }) {
  const r = 8
  const c = 2 * Math.PI * r
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" width={size} height={size} className="shrink-0 -rotate-90">
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
          className="stroke-brand-purple transition-[stroke-dashoffset] duration-500 ease-out motion-reduce:transition-none"
        />
      )}
    </svg>
  )
}
