import { cn } from "@/lib/utils"

/* The pixel covers: a 28 by 21 sprite per tutorial, drawn by hand in the brand's palette, every one on
   the same Haze sky so a list of them reads as one family. The files are the sprite already blown up 8
   times with hard edges (224 by 168), and the browser only scales them down. Scaling the 28 by 21 up in
   the browser with image-rendering: pixelated drew some rows of pixels a device pixel thicker than
   their neighbours whenever the card sat on a fraction of a pixel (the list's cards do, at y .75), and
   the sprite looked warped. The 40 square in the chat is the same 56 by 42 picture cropped to its
   centre, not a resize. Tutorials without one keep the brand tile (TutorialCover) */
const PIXEL = new Set(["hello-anchor", "lumberjack", "zero-copy"])

export const hasPixelCover = (slug: string) => PIXEL.has(slug)

const src = (slug: string) => `${import.meta.env.BASE_URL}prototype/covers-v2/${slug}.png`

/** Decorative: the card's own text names the tutorial. `square` crops the 56 by 42 to its centre 40 */
export function PixelCover({ slug, square = false, className }: { slug: string; square?: boolean; className?: string }) {
  return (
    <span aria-hidden="true" className={cn("relative block shrink-0 overflow-hidden", square ? "size-10" : "h-[2.625rem] w-14", className)}>
      <img
        src={src(slug)}
        alt=""
        width={56}
        height={42}
        draggable={false}
        className={cn("absolute h-[42px] w-[56px] max-w-none", square ? "-top-px -left-2" : "top-0 left-0")}
      />
    </span>
  )
}
