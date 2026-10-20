import { useState, type SyntheticEvent } from "react"

import { cn } from "@/lib/utils"

/** A tutorial cover, whole and with some air around it. The upstream covers
 * come in 4:3 and square, so the tile takes its colour from the cover's own
 * corner and the padding reads as part of the image */
export function Thumb({ src, className }: { src: string; className?: string }) {
  const [bg, setBg] = useState<string>()

  const sample = (e: SyntheticEvent<HTMLImageElement>) => {
    try {
      const canvas = document.createElement("canvas")
      canvas.width = canvas.height = 1
      const ctx = canvas.getContext("2d")
      if (!ctx) return
      ctx.drawImage(e.currentTarget, 0, 0, 1, 1, 0, 0, 1, 1)
      const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data
      setBg(`rgb(${r} ${g} ${b})`)
    } catch {
      // A cover from another origin can't be read: keep the default tile
    }
  }

  return (
    <span className={cn("block shrink-0 overflow-hidden rounded-lg bg-surface-raised p-1.5", className)} style={{ backgroundColor: bg }}>
      <img src={src} alt="" onLoad={sample} className="size-full object-contain" />
    </span>
  )
}
