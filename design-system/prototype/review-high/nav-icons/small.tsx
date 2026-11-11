import { useId } from "react"

import { BRAND_ICONS } from "@/prototype/tutorial-v2/ui/brandGlyphs"
import { arch, poly, ring, type Slit } from "@/prototype/tutorial-v2/ui/smallGlyphs"

export { chevrons, home, plus, SmallIcon, type Slit } from "@/prototype/tutorial-v2/ui/smallGlyphs"

/* What was tried on the way to the nav's small icons (ui/smallGlyphs.tsx): the variants this board
   shows beside the ones taken */

/** The play triangle's two long edges run from (2, 1) and (2, 15) to the point at (14.5, 8) */
const PLAY_BAR = poly([2, 1], [4.4, 2.34], [4.4, 13.66], [2, 15])

/** The call to action's play ring, drawn for the 14 and 17 pixels a button gives it: at that size the
 * slits inside the art director's triangle are a third of a pixel (Almaz, 11 Nov) */
export const PLAYS: { title: string; d: string }[] = [
  { title: "In the ring: a solid triangle", d: ring(8, 8, 7.5, 5.8) + poly([6, 3.7], [12.8, 8], [6, 12.3]) },
  { title: "In the ring: a bar, one slit, a wedge", d: ring(8, 8, 7.5, 5.8) + poly([5.2, 4], [6.8, 4], [6.8, 10.4], [5.2, 12]) + poly([8.4, 4.4], [13, 8], [8.4, 11.6]) },
  { title: "No ring: a bar, one slit, a wedge", d: PLAY_BAR + poly([6.9, 3.74], [14.5, 8], [6.9, 12.26]) },
  { title: "No ring: three bars, as the mark's own play", d: PLAY_BAR + poly([6.4, 3.46], [12.71, 7], [8.21, 7], [6.4, 5.98]) + poly([6.4, 12.54], [12.71, 9], [8.21, 9], [6.4, 10.02]) },
]

/** Profile, drawn anew: the first redraw and the art director's own both failed (Almaz, 11 Nov) */
export const PROFILES: { title: string; d: string; slits?: Slit[] }[] = [
  { title: "Two cut bars for shoulders, a slit between", d: ring(8, 4, 3, 1.2) + poly([6.75, 8.5], [6.75, 11.5], [3.25, 15], [0.25, 15]) + poly([9.25, 8.5], [9.25, 11.5], [12.75, 15], [15.75, 15]) },
  { title: "Shoulders split down the middle", d: ring(8, 4, 3, 1.2) + arch(6, 3.8), slits: [[8, 7.5, 8, 16]] },
  { title: "A slit across one shoulder", d: ring(8, 4, 3, 1.2) + arch(6, 3.8), slits: [[8, 15, 14, 9]] },
  { title: "Head over solid shoulders, a slit between", d: ring(8, 4, 3, 1.2) + `M2 15A6 6 0 0 1 14 15Z`, slits: [[0, 9.2, 16, 9.2]] },
  { title: "A cut bust, a slit along its side", d: ring(8, 4, 3, 1.2) + poly([6, 8.5], [10, 8.5], [15, 13.5], [15, 15], [1, 15], [1, 13.5]), slits: [[7, 6.5, 16, 15.5]] },
]

/** 2.5 of the 16 grid, in the medal's box */
const SLIT = (2.5 / 16) * 890

/** One of the art director's icons as drawn (the medal unless named), with slits cut through it: the drawing stays his, the slit is
 * the width the other icons wear */
export function Medal({ slits, name = "tutorial", className }: { slits: Slit[]; name?: keyof typeof BRAND_ICONS; className?: string }) {
  const id = useId()
  const { box, d } = BRAND_ICONS[name]
  return (
    <svg className={className} viewBox={`0 0 ${box[0]} ${box[1]}`} fill="currentColor" aria-hidden="true">
      <mask id={id} maskUnits="userSpaceOnUse" x="-100" y="-100" width={box[0] + 200} height={box[1] + 200}>
        <rect x="-100" y="-100" width={box[0] + 200} height={box[1] + 200} fill="#fff" />
        {slits.map(([x1, y1, x2, y2]) => (
          <line key={`${x1} ${y1} ${x2}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#000" strokeWidth={SLIT} />
        ))}
      </mask>
      <path d={d} mask={`url(#${id})`} />
    </svg>
  )
}
