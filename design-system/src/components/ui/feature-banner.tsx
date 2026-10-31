import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

/* The banner at the top of a gallery: the one thing a newcomer starts
   with. A state line, a title, one line of what it is, then either how far
   along you are or the facts that decide a start, and the actions: the
   brand button, and a quiet one beside it. Art sits behind the words on the
   right: the voxel sculpture, the dither, or anything else passed as art.
   From 640px wide the art stands beside the words; under that it moves to
   the top right corner and the words run under it. A render function as art
   is told which, so a picture can change its own layout. A picture that
   needs room of its own, such as the code picture, goes in the aside, which
   takes a column from 44rem and steps out under it.

   glow is the panel with a soft light of purple from the corner the art
   sits in: purple is for what is current, and a banner is not that. tint
   mixes a little purple into the panel too, and rings it. */

/** The banner's width, in px, from which the art stands beside the words */
const WIDE_MIN = 640

const FeatureBannerContext = React.createContext<{ titleId: string; wide: boolean }>({ titleId: "", wide: true })

const featureBannerVariants = cva(
  "group/feature-banner @container/feature-banner relative isolate overflow-hidden rounded-card border text-foreground",
  {
    variants: {
      surface: {
        glow: "border-border [background:radial-gradient(120%_140%_at_100%_0%,color-mix(in_oklab,var(--brand-purple)_14%,transparent),transparent_62%),var(--surface-panel)]",
        tint: "border-brand-purple/20 [background:radial-gradient(120%_140%_at_100%_0%,color-mix(in_oklab,var(--brand-purple)_14%,transparent),transparent_62%),color-mix(in_oklab,var(--brand-purple)_6%,var(--surface-panel))]",
      },
    },
    defaultVariants: {
      surface: "glow",
    },
  }
)

function FeatureBanner({
  className,
  surface = "glow",
  art,
  children,
  ...props
}: Omit<React.ComponentProps<"section">, "children"> &
  VariantProps<typeof featureBannerVariants> & {
    /** behind the words, filling the banner; a function is told whether the banner is wide */
    art?: React.ReactNode | ((state: { wide: boolean }) => React.ReactNode)
    children?: React.ReactNode
  }) {
  const titleId = React.useId()
  const ref = React.useRef<HTMLElement>(null)
  const [wide, setWide] = React.useState(true)

  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setWide(e.contentRect.width >= WIDE_MIN))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <FeatureBannerContext.Provider value={{ titleId, wide }}>
      <section
        ref={ref}
        data-slot="feature-banner"
        data-variant={surface}
        data-layout={wide ? "wide" : "narrow"}
        aria-labelledby={titleId}
        className={cn(featureBannerVariants({ surface }), className)}
        {...props}
      >
        {typeof art === "function" ? art({ wide }) : art}
        <div
          data-slot="feature-banner-body"
          className="relative grid items-center gap-x-8 gap-y-6 p-5 @md/feature-banner:p-7 @min-[44rem]/feature-banner:has-data-[slot=feature-banner-aside]:grid-cols-[minmax(18rem,1fr)_minmax(0,25rem)] @min-[44rem]/feature-banner:has-data-[slot=feature-banner-aside]:p-8"
        >
          {children}
        </div>
      </section>
    </FeatureBannerContext.Provider>
  )
}

/* The words. Beside art behind them they keep to where it has faded out,
   about the left 42% of a wide banner; beside an aside they take their
   column. */
function FeatureBannerContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="feature-banner-content"
      className={cn(
        "max-w-[19rem] min-w-0 group-has-data-[slot=feature-banner-aside]/feature-banner:max-w-none",
        className
      )}
      {...props}
    />
  )
}

/* Where you stand: fresh in the brand's periwinkle, otherwise muted. done
   puts a green tick before it. */
function FeatureBannerEyebrow({
  className,
  tone = "fresh",
  done = false,
  children,
  ...props
}: React.ComponentProps<"p"> & { tone?: "fresh" | "muted"; done?: boolean }) {
  return (
    <p
      data-slot="feature-banner-eyebrow"
      data-status={done ? "done" : tone}
      className={cn(
        "flex items-center gap-1.5 text-[0.8125rem] leading-5",
        tone === "fresh" ? "text-brand-violet dark:text-brand-periwinkle" : "text-muted-foreground",
        className
      )}
      {...props}
    >
      {done && (
        <span aria-hidden="true" className="flex size-4 items-center justify-center rounded-full bg-brand-green/15 text-brand-deep-green dark:text-brand-green">
          <Check strokeWidth={2.5} className="size-2.5" />
        </span>
      )}
      {children}
    </p>
  )
}

function FeatureBannerTitle({ className, ...props }: React.ComponentProps<"h2">) {
  const { titleId } = React.useContext(FeatureBannerContext)
  return (
    <h2
      id={titleId}
      data-slot="feature-banner-title"
      className={cn("mt-1.5 font-heading text-[1.5rem] leading-tight font-normal tracking-[-0.015em] text-foreground", className)}
      {...props}
    />
  )
}

function FeatureBannerDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="feature-banner-description"
      className={cn("mt-2 max-w-[44ch] text-[0.9375rem] leading-[1.35] text-balance text-foreground/78", className)}
      {...props}
    />
  )
}

/* How far along, as a short bar in Solana's two colours and "2 of 4". The
   words say it, so the bar is hidden from a screen reader. Children replace
   the words. */
function FeatureBannerProgress({
  className,
  value,
  max,
  children,
  ...props
}: React.ComponentProps<"div"> & { value: number; max: number }) {
  const share = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0
  return (
    <div data-slot="feature-banner-progress" className={cn("mt-3 flex max-w-xs items-center gap-3", className)} {...props}>
      <span aria-hidden="true" className="h-[3px] flex-1 overflow-hidden rounded-[2px] bg-border">
        <span
          className="block h-full bg-(image:--gradient-product-flat) transition-[width] duration-400 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none"
          style={{ width: `${share * 100}%` }}
        />
      </span>
      <span className="text-[0.75rem] leading-4 font-[380] text-muted-foreground tabular-nums">
        {children ?? `${value} of ${max}`}
      </span>
    </div>
  )
}

/* The facts that decide a start: time, steps, level, framework, author. */
function FeatureBannerMeta({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="feature-banner-meta"
      className={cn("mt-3 text-[0.75rem] leading-4 font-[380] text-muted-foreground tabular-nums", className)}
      {...props}
    />
  )
}

/* The brand button at even padding, and a quiet button beside it (Button
   variant quiet, an arrow at its end). On a narrow banner, a phone's, the
   first brand button takes the width at a thumb's 48. */
function FeatureBannerActions({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="feature-banner-actions"
      className={cn(
        "mt-6 flex flex-wrap items-center gap-x-4 gap-y-2",
        "[&>[data-slot=brand-button]]:px-5 [&>[data-slot=brand-button]]:font-medium [&>[data-slot=brand-button]]:tracking-[-0.005em] pointer-coarse:[&>[data-slot=brand-button]]:h-11",
        "@max-md/feature-banner:[&>[data-slot=brand-button]:first-child]:h-12 @max-md/feature-banner:[&>[data-slot=brand-button]:first-child]:w-full",
        "[&>[data-variant=quiet]]:h-10 [&>[data-variant=quiet]]:text-[0.8125rem] [&>[data-variant=quiet]]:font-normal pointer-coarse:[&>[data-variant=quiet]]:h-11",
        className
      )}
      {...props}
    />
  )
}

/* A picture with a column of its own beside the words, from 44rem wide.
   Under that the words keep the room and it steps out. It only decorates. */
function FeatureBannerAside({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="feature-banner-aside"
      aria-hidden="true"
      className={cn("pointer-events-none hidden min-w-0 select-none @min-[44rem]/feature-banner:block", className)}
      {...props}
    />
  )
}

/* The banner's texture: a field of light from the picture's side, turned
   into square pixels by Bayer's ordered dither and coloured in Solana's
   purple going to green. One inline SVG filter, no image to load. The field
   fades out well before the words, so they keep their contrast on the plain
   ground. side lights the right of a banner, strip a band right of some
   words, corner the top right corner only. */

// Bayer's 4 by 4 matrix: a threshold for each cell, spread so any grey becomes an even scatter
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]
const BAYER_TILE = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 4 4' shape-rendering='crispEdges'>${BAYER.map(
    (v, i) => `<rect x='${i % 4}' y='${Math.floor(i / 4)}' width='1' height='1' fill='rgb(${Math.round(((v + 0.5) / 16) * 255)},0,0)'/>`
  ).join("")}</svg>`
)}`

// One pixel of the dither in CSS pixels: big enough to read as a pixel on a 1x screen too
const DITHER_CELL = 3

// Where the light is, and the stretch (x1 to x2) over which the words' side fades it to nothing
const DITHER_FIELD = {
  side: { cx: 0.86, cy: 0.5, r: 0.7, x1: 0.4, x2: 0.6 },
  strip: { cx: 1, cy: 0.5, r: 1, x1: 0, x2: 0.4 },
  corner: { cx: 1, cy: 0, r: 1, x1: 0, x2: 0.45 },
}

function FeatureBannerDither({
  className,
  field = "side",
  ...props
}: React.ComponentProps<"svg"> & { field?: keyof typeof DITHER_FIELD }) {
  const id = React.useId().replace(/:/g, "")
  const f = DITHER_FIELD[field]
  const url = (name: string) => `url(#${id}${name})`

  return (
    <svg
      data-slot="feature-banner-dither"
      data-variant={field}
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 size-full", className)}
      {...props}
    >
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
        {/* Black laid over the field on the words' side, so the dither reads it as darkness and the pixels thin out */}
        <linearGradient id={`${id}fade`} x1={f.x1} x2={f.x2} y1="0" y2="0">
          <stop offset="0" stopColor="#000" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </linearGradient>
        <filter id={`${id}dither`} x="0" y="0" width="100%" height="100%" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feImage href={BAYER_TILE} x="0" y="0" width={DITHER_CELL * 4} height={DITHER_CELL * 4} preserveAspectRatio="none" />
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

/* The code picture: lines of a file and the line the network sends back,
   with a thread in Solana's two colours between them by way of the
   network. The echo sits in the same column as the code, so a word in the
   log lands right under the same word in the source: column is how many
   characters of a line come before it (13 for `    msg!("` after the
   line number, and for `Program log: `). Every size is in rem and ch, so a
   larger font scales the whole picture and the column still lines up. The
   thread is dashed until done. animate plays the trip once as it mounts:
   the thread runs down, the log line arrives and its words glow a moment.
   compact is the phone's: no cards, a strip across the banner's top. Code
   comes in as nodes, so it can be coloured with the syntax tokens. */

// The ease-out and slow duration from the motion tokens, as values for the Web Animations API
const EASE_OUT = "cubic-bezier(0.22, 0.61, 0.24, 1)"
const SLOW = 620

function useArrival(on: boolean) {
  const thread = React.useRef<HTMLDivElement>(null)
  const dot = React.useRef<HTMLDivElement>(null)
  const log = React.useRef<HTMLDivElement>(null)
  const word = React.useRef<HTMLSpanElement>(null)

  React.useEffect(() => {
    if (!on || !thread.current || !dot.current || !log.current || !word.current) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    // A backwards fill hides each part only until its turn comes; if anything fails it all stays in view
    const runs = [
      thread.current.animate([{ transform: "scaleY(0)" }, { transform: "scaleY(1)" }], { duration: SLOW, delay: 500, easing: EASE_OUT, fill: "backwards" }),
      dot.current.animate(
        // The dot is hidden by its own style before and after, so the run leaves nothing behind
        [
          { top: "0%", opacity: 0 },
          { top: "8%", opacity: 1, offset: 0.1 },
          { top: "100%", opacity: 1, offset: 0.85 },
          { top: "100%", opacity: 0 },
        ],
        { duration: SLOW + 120, delay: 500, easing: EASE_OUT }
      ),
      log.current.animate([{ opacity: 0, transform: "translateY(0.375rem)" }, { opacity: 1, transform: "none" }], { duration: 320, delay: 1050, easing: EASE_OUT, fill: "backwards" }),
      word.current.animate(
        [{ backgroundColor: "color-mix(in srgb, var(--brand-green) 22%, transparent)" }, { backgroundColor: "transparent" }],
        { duration: 1400, delay: 1250, easing: "ease-out", fill: "backwards" }
      ),
    ]
    return () => runs.forEach((r) => r.cancel())
  }, [on])

  return { thread, dot, log, word }
}

function FeatureBannerCode({
  className,
  style,
  file,
  lines,
  network = "devnet",
  logLabel = "Program log:",
  log,
  source,
  column = 13,
  done = false,
  compact = false,
  animate = false,
  ...props
}: React.ComponentProps<"div"> & {
  /** the file's name, on the editor card's tab */
  file?: string
  lines: { number: number; code: React.ReactNode }[]
  network?: string
  logLabel?: string
  /** what came back, the words under the source's own */
  log: React.ReactNode
  /** the number of the line the log echoes; the first line if left out */
  source?: number
  column?: number
  done?: boolean
  compact?: boolean
  animate?: boolean
}) {
  const { thread, dot, log: logRef, word } = useArrival(animate)
  const at = Math.max(0, lines.findIndex((line) => line.number === source))
  const shown = compact ? lines.slice(at, at + 1) : lines
  const first = compact ? 2 : 3
  const n = shown.length

  return (
    <div
      data-slot="feature-banner-code"
      data-status={done ? "done" : undefined}
      aria-hidden="true"
      style={{ "--column": `calc(1rem + ${column + 0.5}ch)`, "--rows": n, ...style } as React.CSSProperties}
      className={cn(
        "pointer-events-none grid font-mono text-[0.75rem] select-none [--lh:1.25rem]",
        compact
          ? // top pad, the source line, the trip, the log line, bottom pad
            "grid-rows-[0.875rem_var(--lh)_1.75rem_var(--lh)_0.875rem] text-[0.6875rem]"
          : // the file's tab, pad, the lines, pad, the trip, then the log strip with its pads
            "grid-rows-[2rem_0.5rem_repeat(var(--rows),var(--lh))_0.75rem_2.25rem_0.5rem_var(--lh)_0.5rem]",
        className
      )}
      {...props}
    >
      {/* The cards blur what is behind them, and a blur paints above plain blocks, so everything drawn over them is positioned */}
      {!compact && (
        <>
          <div
            className="col-start-1 rounded-panel border border-border bg-surface-well/75 backdrop-blur-[6px]"
            style={{ gridRow: `1 / ${n + 4}` }}
          />
          <div
            className="col-start-1 rounded-control border border-border bg-surface-well/75 backdrop-blur-[6px]"
            style={{ gridRow: `${n + 5} / ${n + 8}` }}
          />
          <div className="relative col-start-1 row-start-1 flex items-center border-b border-border px-4 text-muted-foreground">{file}</div>
        </>
      )}

      {shown.map((line, i) => (
        <div
          key={line.number}
          style={{ gridRow: first + i }}
          // A line longer than the picture fades out rather than stopping at a cut. The plain syntax colour is
          // the dark one on both grounds, so paper takes the foreground
          className="relative col-start-1 overflow-hidden px-4 leading-(--lh) whitespace-pre text-foreground dark:text-syntax-plain mask-[linear-gradient(to_right,#000_calc(100%-2.5rem),transparent)]"
        >
          <span className="text-syntax-comment">{String(line.number).padStart(2)} </span>
          {line.code}
        </div>
      ))}

      {/* The trip: from under the source to the top of the log line, past the network on the way */}
      <div
        className="relative col-start-1 ml-(--column) w-px"
        style={{ gridRow: compact ? "3 / 4" : `${first + at + 1} / ${n + 6}` }}
      >
        <div
          ref={thread}
          className={cn(
            "absolute inset-0 origin-top bg-linear-to-b from-brand-purple to-brand-green",
            // Dashed until done: a 3px dash every 6px, cut out of the gradient
            !done && "mask-[repeating-linear-gradient(to_bottom,#000_0_3px,transparent_3px_6px)]"
          )}
        />
        <div
          ref={dot}
          className="absolute left-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-green opacity-0 shadow-[0_0_8px_var(--brand-green)]"
        />
      </div>
      <div
        className="relative col-start-1 ml-[calc(var(--column)-3.5px)] flex items-center gap-2 text-muted-foreground"
        style={{ gridRow: compact ? 3 : n + 4 }}
      >
        <span className="size-2 shrink-0 rounded-full border border-brand-periwinkle/70 bg-surface-well" />
        {/* A backing of its own, so the word reads over whatever is behind it */}
        <span className="-ml-1 rounded-sm bg-surface-well/85 px-1">{network}</span>
      </div>

      <div
        ref={logRef}
        style={{ gridRow: compact ? 4 : n + 6 }}
        className="relative col-start-1 overflow-hidden px-4 leading-(--lh) whitespace-pre text-muted-foreground"
      >
        {logLabel}{" "}
        <span ref={word} className="rounded-[2px] text-success">
          {log}
        </span>
      </div>
    </div>
  )
}

export {
  FeatureBanner,
  FeatureBannerActions,
  FeatureBannerAside,
  FeatureBannerCode,
  FeatureBannerContent,
  FeatureBannerDescription,
  FeatureBannerDither,
  FeatureBannerEyebrow,
  FeatureBannerMeta,
  FeatureBannerProgress,
  FeatureBannerTitle,
  featureBannerVariants,
}
