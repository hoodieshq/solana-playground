import { cn } from "@/lib/utils"

/** A tutorial cover in one frame for all of them. The upstream covers mix white tiles, black
 * tiles, square art and 4:3 cards; each fills the same rounded square, cropped to it, so the frame
 * and not the cover sets the rhythm of the list. The hairline is drawn over the picture, so a white
 * cover still has an edge on the dark card */
export function Thumb({ src, className }: { src: string; className?: string }) {
  return (
    <span
      className={cn(
        "relative block shrink-0 overflow-hidden rounded-lg bg-surface-raised after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:ring-1 after:ring-border after:ring-inset after:content-['']",
        className
      )}
    >
      <img src={src} alt="" className="size-full object-cover" />
    </span>
  )
}
