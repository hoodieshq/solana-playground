import { useId } from "react"

/* The banner's texture: a field of light from the picture's side, turned into square pixels by an
   ordered dither and coloured in Solana's purple going to green. It's all one inline SVG filter,
   no image to load. The field is faded out well before the words, so the text keeps its contrast
   on the plain ground */

// Bayer's 4 by 4 matrix: a threshold for each cell, spread so any grey becomes an even scatter
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]
const TILE = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 4 4' shape-rendering='crispEdges'>${BAYER.map(
    (v, i) => `<rect x='${i % 4}' y='${Math.floor(i / 4)}' width='1' height='1' fill='rgb(${Math.round(((v + 0.5) / 16) * 255)},0,0)'/>`
  ).join("")}</svg>`
)}`

// One pixel of the dither in CSS pixels: big enough to read as a pixel on a 1x screen too
const CELL = 3

// Where the light is, and the stretch (x1 to x2) over which the words' side fades it to nothing
const FIELD = {
  // Behind the picture on the right, reaching down past its foot. Where the words are, nothing
  desktop: { cx: 0.86, cy: 0.5, r: 0.7, x1: 0.4, x2: 0.6 },
  // A strip right of some words, brightest at its outer edge, softening in from its inner one
  phone: { cx: 1, cy: 0.5, r: 1, x1: 0, x2: 0.4 },
  // The phone banner's top right corner: brightest in the corner, gone before the box's left and
  // bottom edges, so it never reaches the words beside and under it
  corner: { cx: 1, cy: 0, r: 1, x1: 0, x2: 0.45 },
}

export function StartHereSurface({ layout }: { layout: keyof typeof FIELD }) {
  const id = useId().replace(/:/g, "")
  const f = FIELD[layout]
  const url = (name: string) => `url(#${id}${name})`

  return (
    <svg aria-hidden="true" className="pointer-events-none absolute inset-0 size-full">
      <defs>
        {/* How lit each spot is, in the red channel. It never reaches full, so even the centre stays a scatter */}
        <radialGradient id={`${id}field`} cx={f.cx} cy={f.cy} r={f.r}>
          <stop offset="0" stopColor="rgb(235,0,0)" />
          <stop offset="0.5" stopColor="rgb(110,0,0)" />
          <stop offset="1" stopColor="rgb(0,0,0)" />
        </radialGradient>
        <linearGradient id={`${id}ink`} x1="0.4" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--brand-purple)" />
          <stop offset="0.6" stopColor="var(--brand-violet)" />
          <stop offset="1" stopColor="var(--brand-green)" />
        </linearGradient>
        {/* Black laid over the field on the words' side, so it goes into the dither as darkness and
            the pixels thin out there */}
        <linearGradient id={`${id}fade`} x1={f.x1} x2={f.x2} y1="0" y2="0">
          <stop offset="0" stopColor="#000" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </linearGradient>
        <filter id={`${id}dither`} x="0" y="0" width="100%" height="100%" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feImage href={TILE} x="0" y="0" width={CELL * 4} height={CELL * 4} preserveAspectRatio="none" />
          <feTile result="threshold" />
          {/* Lit where the field is brighter than the cell's threshold: field + threshold over 1 */}
          <feComposite in="SourceGraphic" in2="threshold" operator="arithmetic" k2="16" k3="16" k4="-16" />
          <feComponentTransfer>
            <feFuncR type="discrete" tableValues="0 1" />
          </feComponentTransfer>
          {/* Red to white, so the mask reads it as on or off */}
          <feColorMatrix values="1 0 0 0 0  1 0 0 0 0  1 0 0 0 0  0 0 0 0 1" />
        </filter>
        <mask id={`${id}pixels`} maskUnits="userSpaceOnUse" x="0" y="0" width="100%" height="100%">
          <g filter={url("dither")}>
            <rect width="100%" height="100%" fill={url("field")} />
            <rect width="100%" height="100%" fill={url("fade")} />
          </g>
        </mask>
      </defs>
      <rect width="100%" height="100%" fill={url("ink")} mask={url("pixels")} opacity="0.7" />
    </svg>
  )
}
