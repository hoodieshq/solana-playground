import { cn } from "@/lib/utils"

import "./tileCover.css"

/* A cover laid out of the brand's own rounded tiles (Almaz, 10 Nov), top down, the way the banners lay
   their mark as a voxel sculpture: a picture drawn by hand on a 12 by 12 grid, its lit tiles in a sweep
   of two colours, and under the pointer a wave of light from corner to corner. Programs and tutorials
   both wear it, each in its own colours. A coloured square with a line icon on it read as primitive.
   Only the lit tiles are drawn, on a dark patch with no outline: the faint rest of the grid and the
   patch's border made a frame in a frame inside the card's own (the art director, 11 Nov). The patch is
   flat: a glow in its corner made it a raised button (Almaz, 11 Nov) */

/** Tiles a side */
const N = 12

const mix = (a: string, b: string, t: number) => {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
  const [x, y] = [p(a), p(b)]
  return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * t)).join(" ")})`
}

/** Decorative: the card's own text names the thing. `art` is twelve rows of twelve, # a lit tile;
 * `sweep` its colours from the top left to the bottom right */
export function TileCover({ art, sweep: [from, to], className }: { art: string[]; sweep: [string, string]; className?: string }) {
  // 100 units a side: a tile's pitch is 100/N, the tile 82% of it with the brand tile's soft corner
  const pitch = 100 / N
  const tile = pitch * 0.82
  const pad = (pitch - tile) / 2
  // The picture sits in the cover's middle whatever rows and columns its drawing left empty: an anchor
  // drawn from the second row to the last stood low in its box (Almaz, 11 Nov)
  const lit = art.flatMap((row, y) => [...row].flatMap((c, x) => (c === "#" ? [[x, y]] : [])))
  const mid = (i: number) => (Math.min(...lit.map((t) => t[i])) + Math.max(...lit.map((t) => t[i]))) / 2
  const [dx, dy] = lit.length ? [0, 1].map((i) => ((N - 1) / 2 - mid(i)) * pitch) : [0, 0]
  return (
    <span
      aria-hidden="true"
      className={cn("relative block shrink-0 overflow-hidden bg-[#0c0d0e]", className)}
    >
      {/* The grid's margin is in the picture's own box: a padding in per cent is measured off the parent's
          width, and the picture shrank to a dot in a wide row. The lit tiles throw a little of their own
          colour, as a lamp does */}
      <svg data-tile-cover viewBox="-19.44 -19.44 138.88 138.88" style={{ filter: `drop-shadow(0 0 3px color-mix(in srgb, ${to} 45%, transparent))` }} className="block size-full">
        {Array.from({ length: N * N }, (_, k) => {
          const x = k % N
          const y = Math.floor(k / N)
          if (art[y]?.[x] !== "#") return null
          return (
            <rect
              key={k}
              x={x * pitch + pad + dx}
              y={y * pitch + pad + dy}
              width={tile}
              height={tile}
              rx={tile * 0.3}
              fill={mix(from, to, (x + y) / (2 * (N - 1)))}
              className="tile-cover-lit"
              style={{ animationDelay: `${(x + y) * 28}ms` }}
            />
          )
        })}
      </svg>
    </span>
  )
}
