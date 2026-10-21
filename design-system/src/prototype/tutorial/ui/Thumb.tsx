import { useState, type SyntheticEvent } from "react"

import { cn } from "@/lib/utils"

/** A tutorial cover in one frame for all of them. The upstream covers mix white tiles, black
 * tiles, square art and 4:3 cards, and side by side they read as a patchwork. So each sits on the
 * same neutral mat with a hairline, inset a few pixels: the frame, not the cover, sets the rhythm
 * of the list. Square covers fill the mat. 4:3 ones carry their name to the edges, so they sit
 * whole on it, never cropped */
export function Thumb({ src, className }: { src: string; className?: string }) {
  const [square, setSquare] = useState(true)
  const measure = (e: SyntheticEvent<HTMLImageElement>) => {
    const ratio = e.currentTarget.naturalWidth / e.currentTarget.naturalHeight
    setSquare(ratio > 0.95 && ratio < 1.15)
  }
  return (
    <span className={cn("block shrink-0 rounded-lg bg-surface-raised p-1 ring-1 ring-border ring-inset", className)}>
      <img src={src} alt="" onLoad={measure} className={cn("size-full rounded-[5px]", square ? "object-cover" : "object-contain")} />
    </span>
  )
}
