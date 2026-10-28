import { useEffect, useRef, useState, type ReactNode } from "react"
import { Pin, PinOff } from "lucide-react"
import { toast } from "sonner"

import { Kbd } from "@/components/ui/kbd"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

import { useOpenTutorial, useStartedLessons } from "../host"
import { useStore } from "../store"
import { BrandIcon, ProductLogo, ProductMark, type BrandIconName } from "../ui/brandGlyphs"
import { on } from "../ui/events"
import { NAV_ICONS } from "../ui/navIcons"
import { view } from "../view"
import { flashKeys, useFlash } from "./flash"
import { MENU_KEYS } from "./keys"
import { NavHint, useNavHint } from "./NavHint"
import { useCoarse } from "./pointer"

const soon = () => toast("Only the tutorial flow is in this prototype")

const IN_TABLET_FRAME = window.self !== window.top && view === "tablet"

// Whether the nav shows its labels outside a tutorial: unset follows the screen (a rail under 1280),
// set is the viewer's own choice. The tablet keeps its own, since its default differs and the frame
// shares storage with the desktop view. The v2 keys keep v1's choice apart
const KEY = "pg-proto-nav-open-v2"
const TABLET_KEY = "pg-proto-nav-open-tablet-v2"
const read = (key: string): boolean | null => {
  try {
    const v = localStorage.getItem(key)
    return v === null ? null : v === "1"
  } catch {
    return null
  }
}
const save = (key: string, open: boolean) => {
  try {
    localStorage.setItem(key, open ? "1" : "0")
  } catch {
    // Storage off: the choice lasts until the page reloads
  }
}

/** One row shape for every sidebar destination: 28px tall, 13px, the glyph in a 16px box */
const ROW =
  "flex h-7 w-full items-center gap-2 rounded-[6px] px-2 text-left text-[0.8125rem] whitespace-nowrap outline-none transition-colors duration-100 hover:bg-surface-hover hover:text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-purple motion-reduce:transition-none"
const GLYPH = "flex size-4 shrink-0 items-center justify-center [&>svg]:size-full"

/* The column's two shapes, as client-v2's NavSidebar: 14.5rem open, a 3.25rem rail folded. Both are
   in the page and the classes pick one, so with no choice made the width decides (xl and up opens
   it) without a render. "auto" follows the width, "open" and "rail" are fixed. Each part is laid out
   at its final width less the border's pixel and clipped while the column moves, so nothing rewraps
   on the way */
type Shape = "auto" | "open" | "rail"
const OPEN_ONLY: Record<Shape, string> = { auto: "hidden xl:flex", open: "flex", rail: "hidden" }
const RAIL_ONLY: Record<Shape, string> = { auto: "flex xl:hidden", open: "hidden", rail: "flex" }
const WIDTH: Record<Shape, string> = { auto: "w-[3.25rem] xl:w-[14.5rem]", open: "w-[14.5rem]", rail: "w-[3.25rem]" }
const OPEN_W = "w-[calc(14.5rem-1px)]"
const RAIL_W = "w-[calc(3.25rem-1px)]"

const FOCUS = "outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-purple"

/** A destination or a project, open: the glyph, then the name. Where you are carries the accent
 * on its glyph, over the flat hover tint */
function Row({ glyph, label, current = false, onClick }: { glyph: ReactNode; label: string; current?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={current ? "page" : undefined}
      className={cn(ROW, current ? "bg-surface-hover font-medium text-foreground" : "text-muted-foreground")}
    >
      <span aria-hidden="true" className={cn(GLYPH, current && "text-foreground")}>
        {glyph}
      </span>
      <span className="truncate">{label}</span>
    </button>
  )
}

/** A tip on the rail's right, the product's own, after a short wait so passing over the rail doesn't flash them */
function RailTip({ label, keys, children, disabled = false }: { label: string; keys?: string; children: ReactNode; disabled?: boolean }) {
  if (disabled) return <>{children}</>
  return (
    <Tooltip delayDuration={300}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        {label}
        {keys && <Kbd className="ml-1.5">{keys}</Kbd>}
      </TooltipContent>
    </Tooltip>
  )
}

/** The rail's version of a row: the glyph alone, in a square, marked the same way when current */
function RailButton({ label, current = false, onClick, children, coarse }: { label: string; current?: boolean; onClick: () => void; children: ReactNode; coarse: boolean }) {
  return (
    <RailTip label={label} disabled={coarse}>
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        aria-current={current ? "page" : undefined}
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors duration-100 hover:bg-surface-hover motion-reduce:transition-none [&>svg]:size-[1.125rem]",
          FOCUS,
          current ? "bg-surface-hover text-foreground" : "text-muted-foreground hover:text-foreground"
        )}
      >
        {children}
      </button>
    </RailTip>
  )
}

/** The account's picture, or with none the brand's own profile glyph in a disc */
const Avatar = () => (
  <span className="flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-hover text-muted-foreground [&>svg]:size-3">
    <BrandIcon name="profile" />
  </span>
)

const ClusterDot = () => <span className="size-[0.4375rem] rounded-full bg-success" />

/** The product's own navigation, as client-v2's NavSidebar. Outside a tutorial it follows the window,
 * open from 1280 up. Entering a tutorial folds it to a rail of icons, always: the chat and the code
 * need the room (D4). The mark or ⌘B opens it as an overlay over the chat with a scrim, which closes
 * on a pick, the scrim, Esc or ⌘B and gives the focus back. The pin docks it open, pushing the chat
 * and the code, until you leave the tutorial */
export function Nav() {
  const openTutorial = useOpenTutorial()
  const started = useStartedLessons()
  const { s, dispatch } = useStore()
  const [open, setOpen] = useState<boolean | null>(() => read(KEY))
  const [tabletOpen, setTabletOpen] = useState<boolean | null>(() => read(TABLET_KEY))
  // A finger, or the tablet's frame on a desktop: the frame stands for a tablet, so it behaves as one
  const tablet = useCoarse() || IN_TABLET_FRAME
  const coarse = useCoarse()
  const learning = s.screen === "step"
  const [over, setOver] = useState(false)
  const [pinned, setPinned] = useState(false)
  const opener = useRef<HTMLElement | null>(null)
  const hint = useNavHint(learning && s.started)

  // Leaving the tutorial puts the nav back to how the window has it; coming back folds it again
  useEffect(() => {
    if (!learning) {
      setOver(false)
      setPinned(false)
    }
  }, [learning])

  const floats = learning && !pinned
  const mine = learning ? pinned || over : tablet ? (tabletOpen ?? true) : open
  const shape: Shape = learning ? (mine ? "open" : "rail") : mine === null ? "auto" : mine ? "open" : "rail"

  const shownNow = mine ?? window.matchMedia("(min-width: 1280px)").matches
  const close = () => {
    setOver(false)
    // The focus goes back where the overlay was opened from
    requestAnimationFrame(() => opener.current?.focus())
  }
  const toggle = () => {
    if (learning) {
      if (pinned) {
        setPinned(false)
        return
      }
      if (over) return close()
      opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
      setOver(true)
      return
    }
    if (tablet) setTabletOpen(!shownNow)
    else setOpen(!shownNow)
    save(tablet ? TABLET_KEY : KEY, !shownNow)
  }

  // An answer's Show me opens the overlay too
  useEffect(() =>
    on("nav:open", () => {
      if (learning && !pinned) {
        opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
        setOver(true)
      }
    })
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "b") {
        e.preventDefault()
        toggle()
        flashKeys(MENU_KEYS)
      } else if (e.key === "Escape" && floats && over) {
        close()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })

  const tip = (label: string, side: "right" | "bottom", trigger: ReactNode) =>
    coarse ? (
      trigger
    ) : (
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>{trigger}</TooltipTrigger>
        <TooltipContent side={side} sideOffset={8}>
          {label}
          <Kbd className="ml-1.5">{MENU_KEYS}</Kbd>
        </TooltipContent>
      </Tooltip>
    )
  const pressed = useFlash(MENU_KEYS)
  const flash = pressed.on ? (pressed.n % 2 ? "a" : "b") : undefined

  // A pick from the floating nav closes it, as a menu does
  const go = (then: () => void) => () => {
    if (floats && over) setOver(false)
    then()
  }

  const destinations: { id: string; label: string; icon: BrandIconName; current: boolean; onClick: () => void }[] = [
    { id: "home", label: "Home", icon: "home", current: false, onClick: go(soon) },
    { id: "new", label: "New project", icon: "new", current: false, onClick: go(soon) },
    { id: "tutorials", label: "Tutorials", icon: "tutorial", current: true, onClick: go(() => dispatch({ type: "open", screen: "gallery" })) },
    { id: "programs", label: "Programs", icon: "programs", current: false, onClick: go(soon) },
  ]
  // The workspaces this browser has, as the product lists them. A tutorial joins once it's started
  const projects: { name: string; current: boolean; onClick: () => void }[] = [
    ...["Counter", "Token Faucet", "Voting", "Tip Jar"].map((name) => ({ name, current: false, onClick: go(soon) })),
    ...started.map((l) => ({ name: l.name, current: l.open && learning, onClick: go(() => openTutorial(l.slug)) })),
  ]

  return (
    <>
      {/* Floating, the rail's room stays in the layout so nothing under it moves */}
      {floats && over && <div aria-hidden="true" className="w-[3.25rem] shrink-0" />}
      {floats && over && (
        <div aria-hidden="true" onClick={close} className="absolute inset-0 z-30 bg-black/50 duration-150 animate-in fade-in motion-reduce:animate-none" />
      )}
      <nav
        aria-label="Main"
        className={cn(
          "flex shrink-0 flex-col overflow-hidden border-r border-border bg-sidebar text-foreground transition-[width] duration-200 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none",
          WIDTH[shape],
          floats && over && "absolute inset-y-0 left-0 z-40 shadow-modal"
        )}
      >
        {/* Open: the lockup left, the pin and the fold right, a hairline under both. 44px, the height
            every column's head shares, so the rule reads as one line across the window */}
        <div className={cn(OPEN_ONLY[shape], OPEN_W, "h-11 shrink-0 items-center justify-between gap-1 border-b border-border pr-2 pl-3")}>
          <button type="button" onClick={go(soon)} aria-label="Solana Playground, home" className={cn("group/brand mr-auto flex h-9 shrink-0 items-center rounded-lg px-1 text-foreground", FOCUS)}>
            <ProductLogo className="block h-7 w-auto shrink-0 transition-opacity duration-100 group-hover/brand:opacity-82 motion-reduce:transition-none" />
          </button>
          {learning && !IN_TABLET_FRAME && (
            <Tooltip delayDuration={300}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => {
                    setPinned(!pinned)
                    setOver(false)
                  }}
                  aria-pressed={pinned}
                  aria-label={pinned ? "Fold while I learn" : "Keep open"}
                  className={cn("flex size-[1.875rem] shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-surface-hover hover:text-foreground [&>svg]:size-4", FOCUS)}
                >
                  {pinned ? <PinOff /> : <Pin />}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={8}>
                {pinned ? "Fold while I learn" : "Keep open"}
              </TooltipContent>
            </Tooltip>
          )}
          {tip(
            "Collapse sidebar",
            "bottom",
            <button
              type="button"
              onClick={toggle}
              aria-expanded={true}
              aria-label="Collapse the sidebar"
              data-flash={flash}
              className={cn("flex size-[1.875rem] shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-surface-hover hover:text-foreground [&>svg]:size-4", FOCUS)}
            >
              {NAV_ICONS.sidebar}
            </button>
          )}
        </div>
        {/* Folded: the mark alone, and it's the way back. Pointed at or focused it turns into the panel
            glyph the fold button wears when the column is open. While the first fold's hint shows, it
            carries a soft ring, so the eye finds what the hint is about */}
        <div className={cn(RAIL_ONLY[shape], RAIL_W, "relative h-11 shrink-0 items-center justify-center border-b border-border")}>
          {tip(
            "Open menu",
            "right",
            <button
              type="button"
              onClick={toggle}
              aria-expanded={false}
              aria-label="Open the menu"
              data-flash={flash}
              className={cn(
                "group/rail relative flex size-9 items-center justify-center rounded-lg text-foreground transition-colors duration-100 hover:bg-surface-hover focus-visible:bg-surface-hover motion-reduce:transition-none",
                FOCUS,
                hint.on && "ring-2 ring-brand-purple/40"
              )}
            >
              <ProductMark className="block h-auto w-7 transition-opacity duration-100 group-hover/rail:opacity-0 group-focus-visible/rail:opacity-0 motion-reduce:transition-none" />
              <span
                aria-hidden="true"
                className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-100 group-hover/rail:opacity-100 group-focus-visible/rail:opacity-100 motion-reduce:transition-none [&>svg]:size-[1.125rem]"
              >
                {NAV_ICONS.sidebar}
              </span>
            </button>
          )}
        </div>

        {/* Open: the destinations, then the projects, which scroll on their own so the foot never
            leaves the window */}
        <div className={cn(OPEN_ONLY[shape], OPEN_W, "min-h-0 flex-1 shrink-0 flex-col overflow-hidden px-2 pt-3 pb-1")}>
          <div role="group" aria-label="Destinations" className="flex flex-col gap-px">
            {destinations.map((d) => (
              <Row key={d.id} glyph={<BrandIcon name={d.icon} />} label={d.label} current={d.current} onClick={d.onClick} />
            ))}
          </div>
          <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
            <section aria-label="Projects" className="mt-5 flex flex-col gap-px">
              {/* Sentence case and grey: a section says what it holds, it doesn't shout */}
              <h2 className="mb-1 px-2 text-[0.75rem] font-normal text-subtle">Projects</h2>
              {projects.map((p) => (
                <Row key={p.name} glyph={NAV_ICONS.folder} label={p.name} current={p.current} onClick={p.onClick} />
              ))}
            </section>
          </div>
        </div>
        {/* Folded: the four destinations as icons */}
        <div role="group" aria-label="Destinations" className={cn(RAIL_ONLY[shape], RAIL_W, "min-h-0 flex-1 shrink-0 flex-col items-center gap-0.5 pt-3")}>
          {destinations.map((d) => (
            <RailButton key={d.id} label={d.label} current={d.current} onClick={d.onClick} coarse={coarse}>
              <BrandIcon name={d.icon} />
            </RailButton>
          ))}
        </div>

        {/* The session at the foot: the network, then the account */}
        <div className={cn(OPEN_ONLY[shape], OPEN_W, "shrink-0 flex-col")}>
          <div className="flex flex-col gap-px px-2 pt-1.5 pb-2">
            <Row glyph={<ClusterDot />} label="Devnet" onClick={go(soon)} />
            <button
              type="button"
              onClick={go(soon)}
              aria-haspopup="menu"
              className={cn(
                "flex min-h-10 w-full items-center gap-1 rounded-lg px-2 py-1 text-left text-foreground transition-colors duration-100 hover:bg-surface-hover motion-reduce:transition-none [&>span:first-child]:-ml-1",
                FOCUS
              )}
            >
              <Avatar />
              <span className="flex min-w-0 flex-1 flex-col leading-[1.3]">
                <span className="truncate text-[0.8125rem] font-medium">Sign in</span>
              </span>
              <span aria-hidden="true" className="flex size-3.5 shrink-0 text-subtle [&>svg]:size-full">
                {NAV_ICONS.chevrons}
              </span>
            </button>
          </div>
        </div>
        <div className={cn(RAIL_ONLY[shape], RAIL_W, "shrink-0 flex-col items-center gap-1 py-2")}>
          <RailButton label="Devnet · connected" onClick={go(soon)} coarse={coarse}>
            <ClusterDot />
          </RailButton>
          <RailButton label="Account" onClick={go(soon)} coarse={coarse}>
            <Avatar />
          </RailButton>
        </div>
      </nav>
      {hint.on && shape === "rail" && <NavHint onDone={hint.done} />}
    </>
  )
}
