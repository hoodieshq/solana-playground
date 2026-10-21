import { useState, type SyntheticEvent } from "react"

import { cn } from "@/lib/utils"

/** The colour at a cover's edges: the four corners, averaged on a tiny canvas. The covers are
 * served from this site, so the canvas can read them */
function edgeColour(img: HTMLImageElement) {
  try {
    const size = 8
    const canvas = document.createElement("canvas")
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext("2d")
    if (!ctx) return null
    ctx.drawImage(img, 0, 0, size, size)
    const corners = [ctx.getImageData(0, 0, 1, 1), ctx.getImageData(size - 1, 0, 1, 1), ctx.getImageData(0, size - 1, 1, 1), ctx.getImageData(size - 1, size - 1, 1, 1)]
    const [r, g, b] = [0, 1, 2].map((c) => Math.round(corners.reduce((sum, p) => sum + p.data[c], 0) / corners.length))
    return `rgb(${r} ${g} ${b})`
  } catch {
    return null
  }
}

/** A tutorial cover in one frame for all of them. The upstream covers mix square art (512 by 512)
 * and 4:3 cards with a title set close to their edges. Square art fills the rounded square; a card
 * that isn't square fits whole with some room around it, on its own edge colour, so the square is
 * still full and the title is neither cut nor pressed to the edge. The hairline is drawn over the
 * picture, so a white cover still has an edge on the dark card */
export function Thumb({ src, className }: { src: string; className?: string }) {
  const [fit, setFit] = useState<{ square: boolean; backing: string | null } | null>(null)

  const onLoad = (e: SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget
    const square = Math.abs(img.naturalWidth / img.naturalHeight - 1) < 0.05
    setFit({ square, backing: square ? null : edgeColour(img) })
  }

  return (
    <span
      style={fit?.backing ? { backgroundColor: fit.backing } : undefined}
      className={cn(
        "relative block shrink-0 overflow-hidden rounded-lg bg-surface-raised after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:ring-1 after:ring-border after:ring-inset after:content-['']",
        className
      )}
    >
      <img
        src={src}
        alt=""
        onLoad={onLoad}
        className={cn("size-full", fit && !fit.square ? "object-contain p-[10%]" : "object-cover")}
      />
    </span>
  )
}
