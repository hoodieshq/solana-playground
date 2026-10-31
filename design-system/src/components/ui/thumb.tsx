import * as React from "react"
import { cn } from "@/lib/utils"

/* One frame for covers that do not agree on a shape. Upstream's tutorial
   covers mix square art and 4:3 cards with a title set close to their
   edges. Square art fills the rounded square. A cover that is not square
   fits whole with some room round it, on its own edge colour, so the
   square is still full and the title is neither cut nor pressed to the
   edge. The hairline is drawn over the picture, so a white cover still has
   an edge on a dark card. */

/* The colour at a picture's edges: its four corners, averaged on a tiny
   canvas. A picture from another origin without CORS taints the canvas,
   and the frame keeps its own ground. */
function edgeColour(img: HTMLImageElement) {
  try {
    const size = 8
    const canvas = document.createElement("canvas")
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext("2d", { willReadFrequently: true })
    if (!ctx) return null
    ctx.drawImage(img, 0, 0, size, size)
    const corners = [
      ctx.getImageData(0, 0, 1, 1),
      ctx.getImageData(size - 1, 0, 1, 1),
      ctx.getImageData(0, size - 1, 1, 1),
      ctx.getImageData(size - 1, size - 1, 1, 1),
    ]
    const [r, g, b] = [0, 1, 2].map((c) => Math.round(corners.reduce((sum, p) => sum + p.data[c], 0) / corners.length))
    return `rgb(${r} ${g} ${b})`
  } catch {
    return null
  }
}

function Thumb({
  src,
  alt = "",
  crossOrigin,
  className,
  style,
  ...props
}: React.ComponentProps<"span"> & {
  src: string
  /** empty by default: beside a title the cover only decorates */
  alt?: string
  /** for a cover from another origin, so its edge colour can be read */
  crossOrigin?: React.ComponentProps<"img">["crossOrigin"]
}) {
  const [fit, setFit] = React.useState<{ square: boolean; backing: string | null } | null>(null)

  const onLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget
    const square = Math.abs(img.naturalWidth / img.naturalHeight - 1) < 0.05
    setFit({ square, backing: square ? null : edgeColour(img) })
  }

  return (
    <span
      data-slot="thumb"
      data-variant={fit ? (fit.square ? "fill" : "fit") : undefined}
      style={fit?.backing ? { backgroundColor: fit.backing, ...style } : style}
      className={cn(
        "relative block size-12 shrink-0 overflow-hidden rounded-lg bg-surface-raised after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:ring-1 after:ring-border after:ring-inset after:content-['']",
        className
      )}
      {...props}
    >
      <img
        src={src}
        alt={alt}
        crossOrigin={crossOrigin}
        onLoad={onLoad}
        className={cn("size-full", fit && !fit.square ? "object-contain p-[10%]" : "object-cover")}
      />
    </span>
  )
}

export { Thumb }
