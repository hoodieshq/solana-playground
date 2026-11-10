import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

import "./firstLight.css"

/* The lit pick (CONSENSUS.md, 3.5): the gradient ring. Put inside a .np-pickable that carries
   data-picked; it fades with it */
export function LitPick() {
  return <span aria-hidden="true" className="np-ring" />
}

/** The check that says "this one": the ring's gradient as a disc with a dark tick and a soft glow,
 * popping in after the ring */
export function CheckBadge({ size = 20, className }: { size?: 16 | 20; className?: string }) {
  const big = size === 20
  return (
    <span
      aria-hidden="true"
      style={{ width: big ? 24 : size, height: big ? 24 : size, background: "var(--np-stroke)", boxShadow: "var(--np-check-glow)" }}
      className={cn("z-[3] grid shrink-0 animate-pop place-items-center rounded-full text-(--brand-ink) [animation-delay:80ms]", className)}
    >
      <span className={big ? "size-3.5" : "size-2.5"}><Check aria-hidden="true" strokeWidth={3.25} className="size-full" /></span>
    </span>
  )
}
