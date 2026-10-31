import * as React from "react"
import { cn } from "@/lib/utils"
import { BRAND_MARK_PATH } from "@/components/ui/brand-icon"

/* A tutorial's cover in the brand, as client-v2 draws it
   (views/flow/gallery/TutorialCover.tsx): one of the Styleguide's grounds
   and the mark in white on it, so a wall of them reads as one family and
   each still differs. The ground says the framework; where the mark sits
   comes from the name, so the same name always gives the same cover. The
   grounds and their colour fields are the deck's (views/deck/Atmosphere.tsx),
   held still. They are an illustration, the same on paper and in the dark,
   so they stay here rather than in the tokens. */

type TutorialCoverGround = "haze" | "deep" | "explore" | "violet"
type Field = { c: string; x: number; y: number; s: number; o?: number }

const BEDS: Record<TutorialCoverGround, string> = { haze: "#B8A6F5", deep: "#6858D2", explore: "#6A63CD", violet: "#6A4BCF" }

const FIELDS: Record<TutorialCoverGround, Field[]> = {
  haze: [
    { c: "#2DCEA9", x: 104, y: -6, s: 0.62 },
    { c: "#5FD5C1", x: -4, y: 106, s: 0.62 },
    { c: "#D2B0FF", x: 36, y: 44, s: 1.05 },
    { c: "#ACBCEC", x: -6, y: 8, s: 0.6 },
    { c: "#7F87E5", x: 92, y: 58, s: 0.66 },
    { c: "#AA8FF4", x: 62, y: 96, s: 0.66 },
    { c: "#C0A6F9", x: 30, y: -4, s: 0.6 },
  ],
  deep: [
    { c: "#2DCEA9", x: 104, y: -6, s: 0.58 },
    { c: "#2B9C9E", x: -4, y: 106, s: 0.58 },
    { c: "#6A4AD4", x: 46, y: 56, s: 1.0 },
    { c: "#7D90E8", x: -6, y: 4, s: 0.6 },
    { c: "#5595CB", x: 104, y: 62, s: 0.6 },
    { c: "#4A4AAF", x: 38, y: 108, s: 0.66 },
    { c: "#8F78F6", x: 34, y: -6, s: 0.6 },
  ],
  explore: [
    { c: "#14F195", x: 104, y: 14, s: 0.66 },
    { c: "#3D95AC", x: -4, y: 86, s: 0.6 },
    { c: "#7456D9", x: 44, y: 56, s: 0.9 },
    { c: "#33CFAE", x: -6, y: -4, s: 0.58 },
    { c: "#16EE97", x: 104, y: 88, s: 0.7 },
    { c: "#4A48AD", x: 28, y: 108, s: 0.62 },
    { c: "#8C6EF5", x: 44, y: -6, s: 0.6 },
  ],
  violet: [
    { c: "#9945FF", x: 104, y: -6, s: 0.8 },
    { c: "#1E2173", x: -4, y: 106, s: 0.78 },
    { c: "#7A56DA", x: 46, y: 52, s: 0.9 },
    { c: "#9496F9", x: -6, y: -6, s: 0.66 },
    { c: "#8A4AF0", x: 104, y: 58, s: 0.6 },
    { c: "#3A2893", x: 36, y: 108, s: 0.66 },
    { c: "#957BFB", x: 40, y: -6, s: 0.6 },
  ],
}

/* One ground per framework: what a tutorial is built with reads before its
   title does. Anything else, or none, is haze. */
const GROUND_BY_FRAMEWORK: Record<string, TutorialCoverGround> = { Anchor: "deep", Native: "explore", Seahorse: "violet" }

/* Where the mark sits: the play triangle alone, or the whole mark. Each is
   a viewBox into the mark's own 970 by 574 box, in a thumbnail's 4:3. */
const PLACES = [
  { box: "-428 -191 1275 956", play: true },
  { box: "-152 -191 1275 956", play: false },
]

/** Where the triangle ends and the O begins, in the mark's box */
const PLAY_WIDTH = 418

/** A small stable number from the name, so a cover never changes on reload */
const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7)

const FIELD_FILL =
  "radial-gradient(closest-side, currentColor 0%, color-mix(in srgb, currentColor 72%, transparent) 30%, color-mix(in srgb, currentColor 34%, transparent) 60%, color-mix(in srgb, currentColor 10%, transparent) 82%, transparent 100%)"

/* Decorative: the card's own text names the tutorial. name is the
   product's (upstream's) name, so a cover matches the product's own. A
   ground given outright wins over the framework's. */
function TutorialCover({
  name,
  framework,
  ground,
  className,
  style,
  ...props
}: React.ComponentProps<"span"> & { name: string; framework?: string; ground?: TutorialCoverGround }) {
  const bed = ground ?? GROUND_BY_FRAMEWORK[framework ?? ""] ?? "haze"
  const place = PLACES[hash(name) % PLACES.length]
  return (
    <span
      data-slot="tutorial-cover"
      data-variant={bed}
      aria-hidden="true"
      style={{ backgroundColor: BEDS[bed], ...style }}
      className={cn("relative block aspect-[4/3] w-24 shrink-0 overflow-hidden text-white", className)}
      {...props}
    >
      {FIELDS[bed].map((f, i) => (
        <span
          key={i}
          className="absolute aspect-square w-full rounded-full"
          style={{
            color: f.c,
            opacity: f.o ?? 0.94,
            left: `${f.x}%`,
            top: `${f.y}%`,
            transform: `translate(-50%, -50%) scale(${f.s})`,
            background: FIELD_FILL,
          }}
        />
      ))}
      <svg viewBox={place.box} preserveAspectRatio="xMidYMid meet" className="absolute inset-0 size-full">
        {place.play ? (
          <svg x="0" y="-20" width={PLAY_WIDTH} height="620" overflow="hidden">
            <path d={BRAND_MARK_PATH} fill="currentColor" transform="translate(0 20)" />
          </svg>
        ) : (
          <path d={BRAND_MARK_PATH} fill="currentColor" />
        )}
      </svg>
    </span>
  )
}

export { TutorialCover, type TutorialCoverGround }
