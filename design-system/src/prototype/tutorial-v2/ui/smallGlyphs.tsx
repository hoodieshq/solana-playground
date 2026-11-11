import { useId, type ReactNode } from "react"

import { BrandIcon } from "./brandGlyphs"

/* The mark's icons redrawn for the nav's 16 to 20 pixels (Almaz, 11 Nov). At that size the art
   director's drawings lost what made them the brand's: a slit between two parts came to under half a
   pixel and the 45 degree cuts to a blur. Here each is drawn on a 16 grid with the same parts, a line
   of 2, a slit of 2.5 (one of a pixel read as noise), and the cuts large enough to see. The box is square, where the
   originals stood tall and narrow and filled 10 of the 16 across */

/** A ring as one path: the outer circle and the hole, filled evenodd */
export const ring = (cx: number, cy: number, r: number, hole: number) =>
  [r, hole].map((q) => `M${cx - q} ${cy}a${q} ${q} 0 1 0 ${q * 2} 0a${q} ${q} 0 1 0 ${-q * 2} 0Z`).join("")

export const poly = (...p: number[][]) => `M${p.map((q) => q.join(" ")).join("L")}Z`

/** Home with its two slits set: `roof` the half width of the one at the roof's point, `corner` the width
 * of the one across the bottom right corner. 0 closes a slit */
export const home = (roof: number, corner: number) => {
  const o = corner * Math.SQRT1_2
  return (
    poly([8 - roof, 1 + roof], [2, 7], [2, 15], [14 - o, 15], [12 - o, 13], [4, 13], [4, 7.8], [8 - roof, 3.8 + roof]) +
    poly([8 + roof, 1 + roof], [14, 7], [14, 15 - o], [12, 13 - o], [12, 7.8], [8 + roof, 3.8 + roof])
  )
}

/** The plus as two elbows: `h` half an arm's width, `slit` the width of the slit across the middle */
export const plus = (h: number, slit: number) => {
  const o = slit * Math.SQRT1_2
  const a = [[8 - h, 0.5], [8 + h, 0.5 + 2 * h], [8 + h, 8 - h], [15.5 - 2 * h, 8 - h], [15.5, 8 + h], [8 + h + o, 8 + h], [8 - h, 8 - h - o]]
  return poly(...a) + poly(...a.map(([x, y]) => [16 - x, 16 - y]))
}

/** Programs as two whole chevrons, < over >, with one slit of `slit` between them: the four bars with a
 * slit at each joint fell into dashes once the slits were wide */
export const chevrons = (slit: number) => {
  const a = 5 + slit * Math.SQRT2
  const dx = (16 - (a + 7.5 + 1.5)) / 2
  const at = (p: number[][]) => p.map(([x, y]) => [+(x + dx).toFixed(2), y])
  return (
    poly(...at([[6, 1], [9, 1], [4.5, 5.5], [9, 10], [6, 10], [1.5, 5.5]])) +
    poly(...at([[a, 6], [a + 3, 6], [a + 7.5, 10.5], [a + 3, 15], [a, 15], [a + 4.5, 10.5]]))
  )
}

/** Shoulders as half a ring standing on the box's floor */
export const arch = (r: number, hole: number) => `M${8 - r} 15A${r} ${r} 0 0 1 ${8 + r} 15L${8 + hole} 15A${hole} ${hole} 0 0 0 ${8 - hole} 15Z`

/** A slit's middle line in the medal's own 564 by 890 box: x1, y1, x2, y2 */
export type Slit = [number, number, number, number]

export const SMALL_ICONS = {
  // The ring, a slit, then the handle with its end cut upright
  search: ring(10, 6, 5, 3) + poly([3.99, 10.6], [5.4, 12.01], [2.4, 15], [1, 15], [1, 13.58]),
  // Two parts: the left wall with the floor, and the right. A slit at the roof's point and a cut corner
  home: home(1.25, 2.5),
  // Two elbows with a slit across the middle, every arm's end cut
  new: plus(1.1, 2.5),
  // Two whole chevrons, < over >, their ends cut level, one slit between them
  programs: chevrons(2.5),
  // The ring for a head, shoulders as half a ring, and a slit across one shoulder
  profile: ring(8, 4, 3, 1.2) + arch(6, 3.8),
}

/** The slits an icon of the set is cut with, where its drawing is whole */
const SMALL_SLITS: { [name: string]: Slit[] | undefined } = { profile: [[8, 15, 14, 9]] }

export type SmallIconName = keyof typeof SMALL_ICONS | "tutorial"

/** `d` draws a path of its own in the name's place, for a variant under review; `slits` cuts lines of
 * 2.5 through it, each x1, y1, x2, y2 on the 16 grid */
export function SmallIcon({ name, d, slits = (!d && name && SMALL_SLITS[name]) || [], className }: { name?: SmallIconName; d?: string; slits?: Slit[]; className?: string }): ReactNode {
  const id = useId()
  // Tutorials keeps the art director's own drawing with no slit: redrawn wide the medal read as a
  // funnel, and a slit through the ribbon or the ring was tried and dropped (Almaz, 11 Nov)
  if (name === "tutorial") return <BrandIcon name="tutorial" className={className} />
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      {slits.length > 0 && (
        <mask id={id} maskUnits="userSpaceOnUse" x="-2" y="-2" width="20" height="20">
          <rect x="-2" y="-2" width="20" height="20" fill="#fff" />
          {slits.map(([x1, y1, x2, y2]) => (
            <line key={`${x1} ${y1} ${x2}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#000" strokeWidth="2.5" />
          ))}
        </mask>
      )}
      <path fillRule="evenodd" d={d ?? SMALL_ICONS[name as keyof typeof SMALL_ICONS]} mask={slits.length ? `url(#${id})` : undefined} />
    </svg>
  )
}
