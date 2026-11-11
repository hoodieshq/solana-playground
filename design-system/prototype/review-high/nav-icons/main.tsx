import { useEffect, useRef, type ReactNode } from "react"
import { GraduationCap } from "lucide-react"
import { createRoot } from "react-dom/client"

import "@/index.css"

import { BrandButton, BrandButtonIcon } from "@/components/ui/brand-button"
import { LitIcon, type LitIconName } from "@/prototype/tutorial-v2/desktop/navLit/icons"
import { ItemTile } from "@/prototype/tutorial-v2/desktop/navLit/ItemTile"
import { ProgressRing } from "@/prototype/tutorial-v2/desktop/navLit/ProgressRing"
import { BrandIcon, ProductMark, type BrandIconName } from "@/prototype/tutorial-v2/ui/brandGlyphs"
import { NAV_ICONS } from "@/prototype/tutorial-v2/ui/navIcons"

import { chevrons, home, Medal, PLAYS, plus, PROFILES, SmallIcon, type Slit } from "./small"

/* The art director's icons cut from the mark, as the old nav wore them: each at its drawn size and at
   the sizes the nav bar gives an icon. Stage one, only the collection; the small redraw comes next */

const ICONS: { name: BrandIconName; label: string; today: LitIconName }[] = [
  { name: "search", label: "Search", today: "search" },
  { name: "home", label: "Home", today: "home" },
  { name: "new", label: "New project", today: "new" },
  { name: "tutorial", label: "Tutorials", today: "tutorials" },
  { name: "programs", label: "Programs", today: "programs" },
  { name: "profile", label: "Profile", today: "profile" },
]

/** Home's slits, from the first pass to wider and fewer */
const HOMES = [
  { title: "Two slits of 1.3, the first pass", d: home(0.7, 1.3) },
  { title: "Two slits of 2", d: home(1, 2) },
  { title: "Two slits of 2.5", d: home(1.25, 2.5) },
  { title: "One slit of 2.5, the corner", d: home(0, 2.5) },
  { title: "One slit of 2.5, the roof", d: home(1.25, 0) },
]

const MEDALS: { title: string; slits: Slit[] }[] = [
  { title: "Down the middle of the ribbon", slits: [[282, -40, 282, 326]] },
  { title: "Between the ribbon and the ring", slits: [[-40, 257, 604, 257]] },
  { title: "Across the ring", slits: [[282, 608, 640, 966]] },
  { title: "Across one strap", slits: [[330, 95, 520, 285]] },
  { title: "The ribbon's middle and the ring", slits: [[282, -40, 282, 326], [282, 608, 640, 966]] },
]

const PROGRAMS: ({ title: string } & ({ d: string } | { slits: Slit[] }))[] = [
  {
    title: "Four bars, narrow slits, the first pass",
    d: "M5.8 1L9.1 1L5.1 5L1.8 5ZM1.8 6L5.1 6L9.1 10L5.8 10ZM6.9 6L10.2 6L14.2 10L10.9 10ZM10.9 11L14.2 11L10.2 15L6.9 15Z",
  },
  { title: "Two chevrons, one slit of 2", d: chevrons(2) },
  { title: "Two chevrons, one slit of 2.5", d: chevrons(2.5) },
  { title: "As drawn, one slit across the middle", slits: [[150, 634, 550, 234]] },
  { title: "As drawn, the middle slit widened", slits: [[40, 245, 660, 623]] },
]

/** What the nav draws for Programs and Tutorials today, beside the two destinations: all Lucide */
const ROWS: { title: string; where: string; icon: LitIconName }[] = [
  { title: "Programs", where: "The destination's row and the rail", icon: "programs" },
  { title: "Tutorials", where: "The destination's row and the rail", icon: "tutorials" },
  { title: "A project", where: "A project's row under Pinned and Projects", icon: "project" },
  { title: "A lesson", where: "A lesson's row under Pinned and Projects", icon: "tutorials" },
]

const PLUSES = [
  { title: "Slit of 1.1, the first pass", d: plus(1.1, 1.13) },
  { title: "Slit of 2", d: plus(1.1, 2) },
  { title: "Slit of 2.5", d: plus(1.1, 2.5) },
  { title: "Slit of 2, arms of 2.8", d: plus(1.4, 2) },
  { title: "Slit of 2.5, arms of 2.8", d: plus(1.4, 2.5) },
]

/** The nav's icon sizes: 16 in the old nav's rows, 18 in today's rows and rail, 20 under a finger */
const SMALL = [16, 18, 20]

/** The icon rastered at `size` pixels, as a 1x screen does, and shown four times larger with its pixels kept */
function Pixels({ children, size }: { children: ReactNode; size: number }) {
  const src = useRef<HTMLSpanElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const svg = src.current?.querySelector("svg")
    const ctx = canvas.current?.getContext("2d")
    if (!svg || !ctx) return
    const [, , w, h] = svg.getAttribute("viewBox")!.split(" ").map(Number)
    const copy = svg.cloneNode(true) as SVGSVGElement
    copy.setAttribute("xmlns", "http://www.w3.org/2000/svg")
    // The page's colour for currentColor; a filled drawing gets it as its fill, a stroked one keeps none
    copy.style.color = "#ededed"
    if (copy.getAttribute("fill") !== "none") copy.setAttribute("fill", "#ededed")
    copy.setAttribute("width", String((size * w) / h))
    copy.setAttribute("height", String(size))
    const img = new Image()
    img.onload = () => {
      ctx.clearRect(0, 0, size, size)
      ctx.drawImage(img, Math.round((size - (size * w) / h) / 2), 0)
    }
    img.src = `data:image/svg+xml,${encodeURIComponent(new XMLSerializer().serializeToString(copy))}`
  }, [size])
  return (
    <>
      <span ref={src} hidden>
        {children}
      </span>
      <canvas ref={canvas} width={size} height={size} style={{ width: size * 4, height: size * 4, imageRendering: "pixelated" }} className="rounded-md bg-background" />
    </>
  )
}

const Cap = ({ children }: { children: string }) => <p className="mt-2 text-xs text-muted-foreground tabular-nums">{children}</p>

/** A nav column as Oak draws it: 32 rows, an 18 icon, a 13 label */
/** What the nav lists under Pinned: a project and a lesson, each with an icon of its own */
const PINNED = [
  { kind: "project", label: "tip-jar" },
  { kind: "lesson", label: "Hello Anchor" },
] as const

function Column({ title, glyph, pinned }: { title: string; glyph: (i: (typeof ICONS)[number]) => ReactNode; pinned: (kind: "project" | "lesson") => ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-xs text-muted-foreground">{title}</p>
      <div className="flex gap-3">
        <div className="w-[15rem] rounded-panel border border-border bg-surface-panel p-2">
          {ICONS.map((i, k) => (
            <div key={i.name} className={`flex h-8 items-center gap-2.5 rounded-md px-2 text-[0.8125rem] ${k === 1 ? "bg-surface-hover text-foreground" : "text-muted-foreground"}`}>
              <span className="flex size-5 items-center justify-center [&>svg]:h-[1.125rem] [&>svg]:w-full">{glyph(i)}</span>
              {i.label}
            </div>
          ))}
          <p className="mt-3 px-2 pb-1 text-[0.6875rem] text-muted-foreground">Pinned</p>
          {PINNED.map((p) => (
            <div key={p.kind} className="flex h-8 items-center gap-2.5 rounded-md px-2 text-[0.8125rem] text-muted-foreground">
              <span className="flex size-5 items-center justify-center [&>svg]:h-[1.125rem] [&>svg]:w-full">{pinned(p.kind)}</span>
              {p.label}
            </div>
          ))}
        </div>
        <div className="flex w-[3.25rem] flex-col items-center gap-0.5 rounded-panel border border-border bg-surface-panel py-2">
          {ICONS.map((i, k) => (
            <span key={i.name} className={`flex size-9 items-center justify-center rounded-lg [&>svg]:h-[1.125rem] [&>svg]:w-[1.125rem] ${k === 1 ? "bg-surface-hover text-foreground" : "text-muted-foreground"}`}>
              {glyph(i)}
            </span>
          ))}
          <span className="my-1.5 h-px w-5 bg-border" />
          {PINNED.map((p) => (
            <span key={p.kind} className="flex size-9 items-center justify-center rounded-lg text-muted-foreground [&>svg]:h-[1.125rem] [&>svg]:w-[1.125rem]">
              {pinned(p.kind)}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

function Board() {
  return (
    <main className="mx-auto max-w-[1680px] p-8 text-foreground">
      <h1 className="font-heading text-2xl">Nav icons</h1>
      <p className="mt-1 max-w-[70ch] text-sm text-muted-foreground">
        The six icons the art director cut from the mark, as the old nav bar wore them. Each at its drawn size, then at the nav's sizes, and those same pixels four times larger to see what is left of the cuts.
      </p>

      <h2 className="mt-10 font-heading text-xl">The mark they are cut from</h2>
      <ProductMark className="mt-4 h-24 w-auto" />

      <h2 className="mt-12 font-heading text-xl">Each icon, large and small</h2>
      <div className="mt-4 grid grid-cols-3 gap-4 max-lg:grid-cols-2">
        {ICONS.map((i) => (
          <section key={i.name} className="rounded-card border border-border bg-surface-panel p-6">
            <h3 className="font-heading text-base">{i.label}</h3>
            <div className="mt-5 flex items-end gap-8">
              <div>
                <BrandIcon name={i.name} className="h-40 w-auto" />
                <Cap>160, as drawn</Cap>
              </div>
              <div>
                <SmallIcon name={i.name} className="size-40" />
                <Cap>160, the small drawing</Cap>
              </div>
            </div>
            {/* The same pixels a 1x screen gets, each drawn four times the size */}
            {(["As drawn", "Redrawn for small"] as const).map((title, redrawn) => (
              <div key={title} className="mt-6 border-t border-border pt-5">
                <p className="mb-3 text-xs text-muted-foreground">{title}</p>
                <div className="flex items-end gap-5">
                  {SMALL.map((s) => (
                    <div key={s}>
                      <span className="mb-3 flex items-center justify-center" style={{ height: 20 }}>
                        <span className="flex" style={{ height: s }}>
                          {redrawn ? <SmallIcon name={i.name} className="h-full w-auto" /> : <BrandIcon name={i.name} className="h-full w-auto" />}
                        </span>
                      </span>
                      <Pixels size={s}>{redrawn ? <SmallIcon name={i.name} /> : <BrandIcon name={i.name} />}</Pixels>
                      <Cap>{`${s}, and ×4`}</Cap>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </section>
        ))}
      </div>

      <h2 className="mt-12 font-heading text-xl">How wide the slits are</h2>
      <p className="mt-1 max-w-[70ch] text-sm text-muted-foreground">A slit of a pixel read as noise. Home and New project with their slits wider, and Home with one slit in place of two.</p>
      {[HOMES, PLUSES].map((set) => (
        <div key={set[0].title} className="mt-4 grid grid-cols-5 gap-4 max-xl:grid-cols-3">
          {set.map((v) => (
            <section key={v.title} className="rounded-card border border-border bg-surface-panel p-5">
              <h3 className="text-sm">{v.title}</h3>
              <SmallIcon d={v.d} className="mt-4 size-24" />
              <div className="mt-5 flex items-end gap-3">
                {SMALL.map((s) => (
                  <div key={s}>
                    <span className="mb-3 flex items-center justify-center" style={{ height: 20 }}>
                      <span className="flex" style={{ height: s }}>
                        <SmallIcon d={v.d} className="h-full w-auto" />
                      </span>
                    </span>
                    <Pixels size={s}>
                      <SmallIcon d={v.d} />
                    </Pixels>
                    <Cap>{String(s)}</Cap>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      ))}

      <h2 className="mt-12 font-heading text-xl">Profile, drawn anew</h2>
      <p className="mt-1 max-w-[70ch] text-sm text-muted-foreground">Neither the art director's profile nor its first redraw held. Five new ones: the mark's ring for a head, and one slit of 2.5 in a different place each time.</p>
      <div className="mt-4 grid grid-cols-5 gap-4 max-xl:grid-cols-3">
        {PROFILES.map((v) => (
          <section key={v.title} className="rounded-card border border-border bg-surface-panel p-5">
            <h3 className="text-sm">{v.title}</h3>
            <SmallIcon d={v.d} slits={v.slits} className="mt-4 size-24" />
            <div className="mt-5 flex items-end gap-3">
              {SMALL.map((s) => (
                <div key={s}>
                  <span className="mb-3 flex items-center justify-center" style={{ height: 20 }}>
                    <span className="flex" style={{ height: s }}>
                      <SmallIcon d={v.d} slits={v.slits} className="h-full w-auto" />
                    </span>
                  </span>
                  <Pixels size={s}>
                    <SmallIcon d={v.d} slits={v.slits} />
                  </Pixels>
                  <Cap>{String(s)}</Cap>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <h2 className="mt-12 font-heading text-xl">Programs, where a slit can go</h2>
      <p className="mt-1 max-w-[70ch] text-sm text-muted-foreground">Four bars with a slit at each joint fell into dashes once the slits were wide. One slit in their place: between two whole chevrons, or cut across the art director's own drawing.</p>
      <div className="mt-4 grid grid-cols-5 gap-4 max-xl:grid-cols-3">
        {PROGRAMS.map((v) => {
          const icon = (className?: string) => ("d" in v ? <SmallIcon d={v.d} className={className} /> : <Medal name="programs" slits={v.slits} className={className} />)
          return (
            <section key={v.title} className="rounded-card border border-border bg-surface-panel p-5">
              <h3 className="text-sm">{v.title}</h3>
              {icon("mt-4 h-24 w-auto")}
              <div className="mt-5 flex items-end gap-3">
                {SMALL.map((s) => (
                  <div key={s}>
                    <span className="mb-3 flex items-center justify-center" style={{ height: 20 }}>
                      <span className="flex" style={{ height: s }}>
                        {icon("h-full w-auto")}
                      </span>
                    </span>
                    <Pixels size={s}>{icon()}</Pixels>
                    <Cap>{String(s)}</Cap>
                  </div>
                ))}
              </div>
            </section>
          )
        })}
      </div>

      <h2 className="mt-12 font-heading text-xl">Tutorials, where a slit can go</h2>
      <p className="mt-1 max-w-[70ch] text-sm text-muted-foreground">The medal as the art director drew it, with one slit of 2.5 cut through it in different places, and two together.</p>
      <div className="mt-4 grid grid-cols-5 gap-4 max-xl:grid-cols-3">
        {MEDALS.map((v) => (
          <section key={v.title} className="rounded-card border border-border bg-surface-panel p-5">
            <h3 className="text-sm">{v.title}</h3>
            <Medal slits={v.slits} className="mt-4 h-24 w-auto" />
            <div className="mt-5 flex items-end gap-3">
              {SMALL.map((s) => (
                <div key={s}>
                  <span className="mb-3 flex items-center justify-center" style={{ height: 20 }}>
                    <span className="flex" style={{ height: s }}>
                      <Medal slits={v.slits} className="h-full w-auto" />
                    </span>
                  </span>
                  <Pixels size={s}>
                    <Medal slits={v.slits} />
                  </Pixels>
                  <Cap>{String(s)}</Cap>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <h2 className="mt-12 font-heading text-xl">Programs and Tutorials in the nav today</h2>
      <p className="mt-1 max-w-[70ch] text-sm text-muted-foreground">The nav's own icons for the two sections and for what is listed under them, with the marks a lesson's progress is shown by.</p>
      <div className="mt-4 grid grid-cols-5 gap-4 max-xl:grid-cols-3">
        {ROWS.map((r) => (
          <section key={r.title} className="rounded-card border border-border bg-surface-panel p-5">
            <h3 className="text-sm">{r.title}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{r.where}</p>
            <span className="mt-4 flex size-24 [&>svg]:size-full">
              <LitIcon name={r.icon} />
            </span>
            <div className="mt-5 flex items-end gap-3">
              {SMALL.map((s) => (
                <div key={s}>
                  <span className="mb-3 flex items-center justify-center" style={{ height: 20 }}>
                    <span className="flex [&>svg]:size-full" style={{ width: s, height: s }}>
                      <LitIcon name={r.icon} />
                    </span>
                  </span>
                  <Pixels size={s}>
                    <LitIcon name={r.icon} />
                  </Pixels>
                  <Cap>{String(s)}</Cap>
                </div>
              ))}
            </div>
          </section>
        ))}
        <section className="rounded-card border border-border bg-surface-panel p-5">
          <h3 className="text-sm">A lesson's progress</h3>
          <p className="mt-1 text-xs text-muted-foreground">The ring in a lesson's row, the tile on the rail</p>
          <div className="mt-4 flex items-center gap-4 [--nav-bg:var(--surface-panel)]">
            {[1, 3, 4].map((done) => (
              <ProgressRing key={done} done={done} of={4} size={16} />
            ))}
          </div>
          <Cap>The ring at 16: 1, 3 and 4 of 4</Cap>
          <div className="mt-4 flex items-center gap-4">
            <ItemTile kind="lesson" at={1} of={4} />
            <ItemTile kind="lesson" at={3} of={4} />
            <ItemTile kind="lesson" done />
          </div>
          <Cap>The tile at 18: 1, 3 of 4 and done</Cap>
        </section>
      </div>

      <h2 className="mt-12 font-heading text-xl">In the nav bar</h2>
      <p className="mt-1 text-sm text-muted-foreground">Oak's row and rail, the icon at 18: the mark's icons as drawn, redrawn for small, and the Lucide set the nav wears today. Under Pinned, a project and a lesson: the old nav's folder and cap, the redrawn set's own Programs and Tutorials icons, and today's folder and cap.</p>
      <div className="mt-4 flex flex-wrap gap-12">
        <Column title="As drawn" glyph={(i) => <BrandIcon name={i.name} />} pinned={(k) => (k === "project" ? NAV_ICONS.folder : <GraduationCap aria-hidden="true" strokeWidth={1.5} />)} />
        <Column title="Redrawn for small" glyph={(i) => <SmallIcon name={i.name} />} pinned={(k) => <SmallIcon name={k === "project" ? "programs" : "tutorial"} />} />
        <Column title="Today, Lucide" glyph={(i) => <LitIcon name={i.today} />} pinned={(k) => <LitIcon name={k === "project" ? "project" : "tutorials"} />} />
      </div>

      <h2 className="mt-12 font-heading text-xl">The play ring, in the main call to action</h2>
      <p className="mt-1 max-w-[70ch] text-sm text-muted-foreground">The mark's play shape in a ring. It trails the words of a screen's one main button and is used nowhere else: Home's hero, the Tutorials banner and the Programs banner.</p>
      <div className="mt-4 grid grid-cols-[auto_1fr] gap-4 max-lg:grid-cols-1">
        <section className="rounded-card border border-border bg-surface-panel p-6">
          <h3 className="text-sm">The icon</h3>
          <div className="mt-4 flex items-end gap-8">
            <div>
              <BrandButtonIcon className="size-40" />
              <Cap>160</Cap>
            </div>
            {[14, 17].map((s) => (
              <div key={s}>
                <span className="mb-3 flex items-center justify-center" style={{ height: 20 }}>
                  <BrandButtonIcon style={{ width: s, height: s }} />
                </span>
                <Pixels size={s}>
                  <BrandButtonIcon />
                </Pixels>
                <Cap>{s === 14 ? "14, the small button" : "17, the button"}</Cap>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-card border border-border bg-surface-panel p-6">
          <h3 className="text-sm">In the buttons</h3>
          <div className="mt-5 grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-x-8 gap-y-6">
            {[
              ["Home's hero, a first visit", "Start Hello Anchor"],
              ["Home's hero, a lesson under way", "Continue"],
              ["Home's hero, the path finished", "New project"],
              ["The Tutorials and Programs banners", "Start"],
            ].map(([where, label]) => (
              <div key={where}>
                <BrandButton className="h-10 font-heading text-[0.9375rem] font-medium tracking-[-0.005em]">
                  {label}
                  <BrandButtonIcon />
                </BrandButton>
                <Cap>{where}</Cap>
              </div>
            ))}
            <div>
              <BrandButton className="h-12 w-full font-heading text-[0.9375rem] font-medium tracking-[-0.005em]">
                Start Hello Anchor
                <BrandButtonIcon />
              </BrandButton>
              <Cap>On the phone, the card's width and 48 tall</Cap>
            </div>
            <div>
              <BrandButton size="sm">
                Show me how
                <BrandButtonIcon />
              </BrandButton>
              <Cap>The design system's small size, not used in Oak yet</Cap>
            </div>
          </div>
        </section>
      </div>

      <h2 className="mt-12 font-heading text-xl">The play ring, drawn for a button</h2>
      <p className="mt-1 max-w-[70ch] text-sm text-muted-foreground">In a button the sign is 14 or 17 pixels and the slits inside its triangle a third of one. Four ways to draw it small, each in the button it is for.</p>
      <div className="mt-4 grid grid-cols-5 gap-4 max-xl:grid-cols-3">
        {[{ title: "As drawn", d: "" }, ...PLAYS].map((v) => {
          const icon = (className?: string) => (v.d ? <SmallIcon d={v.d} className={className} /> : <BrandButtonIcon className={className} />)
          return (
            <section key={v.title} className="rounded-card border border-border bg-surface-panel p-5">
              <h3 className="text-sm">{v.title}</h3>
              {icon("mt-4 size-24")}
              <div className="mt-5 flex items-end gap-3">
                {[14, 17].map((s) => (
                  <div key={s}>
                    <span className="mb-3 flex items-center justify-center" style={{ height: 20 }}>
                      <span className="flex" style={{ width: s, height: s }}>
                        {icon("size-full")}
                      </span>
                    </span>
                    <Pixels size={s}>{icon()}</Pixels>
                    <Cap>{String(s)}</Cap>
                  </div>
                ))}
              </div>
              <div className="mt-5 flex flex-col items-start gap-3 border-t border-border pt-5">
                <BrandButton className="h-10 font-heading text-[0.9375rem] font-medium tracking-[-0.005em]">
                  Start
                  {icon()}
                </BrandButton>
                <BrandButton size="sm">
                  Show me how
                  {icon()}
                </BrandButton>
              </div>
            </section>
          )
        })}
      </div>
    </main>
  )
}

createRoot(document.getElementById("root")!).render(<Board />)
