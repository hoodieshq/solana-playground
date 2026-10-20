import { useState, type SyntheticEvent } from "react"

import { cn } from "@/lib/utils"

type Fit = { mode: "cover" } | { mode: "contain"; bg?: string }

/** A tutorial cover. The upstream covers come in two shapes. Square ones are
 * drawn with their own margins, so they fill the tile. 4:3 ones carry text to
 * the edges, so they sit whole inside it with some air, on the colour of the
 * cover's own corner so the padding reads as part of the image */
export function Thumb({ src, className }: { src: string; className?: string }) {
  const [fit, setFit] = useState<Fit>({ mode: "cover" })

  const measure = (e: SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget
    const ratio = img.naturalWidth / img.naturalHeight
    if (ratio > 0.95 && ratio < 1.05) return setFit({ mode: "cover" })
    try {
      const canvas = document.createElement("canvas")
      canvas.width = canvas.height = 1
      const ctx = canvas.getContext("2d")
      ctx?.drawImage(img, 0, 0, 1, 1, 0, 0, 1, 1)
      const [r, g, b] = ctx?.getImageData(0, 0, 1, 1).data ?? []
      setFit({ mode: "contain", bg: r === undefined ? undefined : `rgb(${r} ${g} ${b})` })
    } catch {
      // A cover from another origin can't be read: keep the default tile
      setFit({ mode: "contain" })
    }
  }

  return (
    <span
      className={cn("block shrink-0 overflow-hidden rounded-lg bg-surface-raised", fit.mode === "contain" && "p-1.5", className)}
      style={fit.mode === "contain" && fit.bg ? { backgroundColor: fit.bg } : undefined}
    >
      <img src={src} alt="" onLoad={measure} className={cn("size-full", fit.mode === "cover" ? "object-cover" : "object-contain")} />
    </span>
  )
}
