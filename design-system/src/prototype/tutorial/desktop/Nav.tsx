import { useEffect, useState, type ReactNode } from "react"
import { BookOpen, Boxes, Folder, FolderOpen, Home, PanelLeft, Plus } from "lucide-react"
import { toast } from "sonner"

import { LogoMark } from "@/components/ui/logo"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

import { useStore } from "../store"
import { view } from "../view"
import { flashKeys, useFlash } from "./flash"
import { MENU_KEYS } from "./keys"
import { useCoarse, useKeyHints } from "./pointer"

const soon = () => toast("Only the tutorial flow is in this prototype")

const IN_TABLET_FRAME = window.self !== window.top && view === "tablet"

// Whether the nav shows its labels: unset follows the screen (a rail during a step and under 1280),
// set is the viewer's own choice and holds across steps until they change it. The tablet keeps its
// own, since its default differs and the frame shares storage with the desktop view
const KEY = "pg-proto-nav-open"
const TABLET_KEY = "pg-proto-nav-open-tablet"
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

function Item({ icon, label, active = false, labels, onClick }: { icon: ReactNode; label: string; active?: boolean; labels: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-9 w-full shrink-0 items-center gap-2.5 rounded-control px-2.5 text-caption! text-muted-foreground transition-colors duration-150 ease-standard hover:bg-surface hover:text-foreground motion-reduce:transition-none pointer-coarse:h-11 pointer-coarse:px-3.5 [&_svg]:size-4 [&_svg]:shrink-0",
        active && "bg-surface-raised text-foreground"
      )}
    >
      {icon}
      <span className={cn("hidden truncate", labels)}>{label}</span>
    </button>
  )
}

/** The product's own navigation, as in client-v2. Under 1280 it folds to a rail of icons, and
 * while a step is open it stays a rail at any width: the editor and the lesson need the room.
 * The logo slot and ⌘B unfold it with labels, as Gemini's sidebar does: folded, the logo is the
 * button and turns into the panel icon on hover; unfolded, the close button sits at the end of the
 * logo's row. With a mouse, unfolded it pushes the screen aside rather than covering the code,
 * and the choice holds. A tablet, as Gemini's, has the drawer out by default outside a step and
 * pushes the screen, whatever its width. During a step there's no room to push: it opens over the
 * code on a scrim, closes on a pick, a tap outside or Esc, and each step starts with the rail */
export function Nav() {
  const { s, dispatch } = useStore()
  const [open, setOpen] = useState<boolean | null>(() => read(KEY))
  const [tabletOpen, setTabletOpen] = useState<boolean | null>(() => read(TABLET_KEY))
  // A finger, or the tablet's frame on a desktop: the frame stands for a tablet, so it behaves as one
  const tablet = useCoarse() || IN_TABLET_FRAME
  const coarse = useCoarse()
  const hints = useKeyHints()
  const inProject = s.screen === "step" || s.screen === "finish"
  const rail = s.screen === "step"
  // The tablet's step: the nav covers rather than pushes
  const floats = tablet && rail
  // Open over the step it was opened on only: the next step starts with the rail
  const here = `${s.screen}:${s.step}`
  const [overOn, setOverOn] = useState<string | null>(null)
  const over = overOn === here
  const setOver = (to: boolean) => setOverOn(to ? here : null)

  // Classes for what follows the screen, or the viewer's choice once there is one. Floating, only
  // the overlay counts
  const mine = floats ? over : tablet ? (tabletOpen ?? true) : open
  // Wide enough for the name and the toggle beside it in one row, the toggle being bigger for a finger
  const wide = mine === null ? (rail ? "" : "xl:w-[232px] pointer-coarse:xl:w-[248px]") : mine ? "w-[232px] pointer-coarse:w-[248px]" : ""
  const labels = mine === null ? (rail ? "" : "xl:inline") : mine ? "inline" : ""
  const block = mine === null ? (rail ? "" : "xl:block") : mine ? "block" : ""
  const rule = mine === null ? (rail ? "" : "xl:hidden") : mine ? "hidden" : ""
  const flex = mine === null ? (rail ? "" : "xl:flex") : mine ? "flex" : ""

  const shownNow = mine ?? (!rail && window.matchMedia("(min-width: 1280px)").matches)
  const toggle = () => {
    if (floats) return setOver(!over)
    // What shows now, worked out the way the classes above do, so the button always flips it
    if (tablet) setTabletOpen(!shownNow)
    else setOpen(!shownNow)
    save(tablet ? TABLET_KEY : KEY, !shownNow)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "b") {
        e.preventDefault()
        toggle()
        flashKeys(MENU_KEYS)
      } else if (e.key === "Escape" && floats && over) {
        setOver(false)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })

  // The key goes in the tip only where there's a keyboard, and the tip only where there's hover
  const tip = (label: string, side: "right" | "bottom", trigger: ReactNode) =>
    coarse ? (
      trigger
    ) : (
      <Tooltip>
        <TooltipTrigger asChild>{trigger}</TooltipTrigger>
        <TooltipContent side={side}>
          {label}
          {hints && <span className="ml-1.5 opacity-60">{MENU_KEYS}</span>}
        </TooltipContent>
      </Tooltip>
    )
  const ring = "outline-none focus-visible:ring-2 focus-visible:ring-ring"
  // ⌘B's hint lives in the toggle's tip, which a key press doesn't open. So the toggle itself, the one
  // showing after the press, lights up once: that's the button the key pressed. Two names for one
  // animation, so a second press plays it again
  const pressed = useFlash(MENU_KEYS)
  const flash = pressed.on ? (pressed.n % 2 ? "a" : "b") : undefined

  // A pick from the floating nav closes it, as a menu does
  const go = (then: () => void) => () => {
    if (floats) setOver(false)
    then()
  }

  return (
    <>
      {/* Floating, the rail's room stays in the layout so nothing under it moves */}
      {floats && over && <div aria-hidden="true" className="w-14 shrink-0" />}
      {floats && over && (
        <div aria-hidden="true" onClick={() => setOver(false)} className="absolute inset-0 z-30 bg-black/50 duration-150 animate-in fade-in motion-reduce:animate-none" />
      )}
      <nav
        aria-label="Playground"
        className={cn(
          "flex w-14 shrink-0 flex-col gap-1 border-r border-border bg-surface-well px-2 py-3 transition-[width] duration-200 ease-standard motion-reduce:transition-none pointer-coarse:px-1.5",
          wide,
          floats && over && "absolute inset-y-0 left-0 z-40 shadow-modal"
        )}
      >
        {/* Folded: the logo's slot is the button. With a mouse it turns into the panel icon on hover
            or focus, so the logo still says whose app this is the rest of the time. A finger gets
            no hover, so there the logo stays and a tap opens */}
        {tip(
          "Open sidebar",
          "right",
          <button
            type="button"
            onClick={toggle}
            aria-expanded={false}
            aria-label="Open sidebar"
            data-flash={flash}
            className={cn(
              "group mb-3 grid h-9 w-full shrink-0 place-items-center rounded-control text-muted-foreground hover:bg-surface hover:text-foreground pointer-coarse:h-11",
              ring,
              rule
            )}
          >
            <LogoMark className="col-start-1 row-start-1 size-5 transition-opacity duration-150 ease-standard motion-reduce:transition-none pointer-fine:group-hover:opacity-0 pointer-fine:group-focus-visible:opacity-0" />
            <PanelLeft
              strokeWidth={1.75}
              aria-hidden="true"
              className="col-start-1 row-start-1 size-4 opacity-0 transition-opacity duration-150 ease-standard motion-reduce:transition-none pointer-coarse:hidden pointer-fine:group-hover:opacity-100 pointer-fine:group-focus-visible:opacity-100"
            />
          </button>
        )}
        {/* Unfolded: the logo and the name, and the close button at the end of the same row */}
        <div className={cn("mb-3 hidden h-9 shrink-0 items-center gap-1 pointer-coarse:h-11", flex)}>
          <div className="flex min-w-0 flex-1 items-center gap-2 px-2 pointer-coarse:px-3">
            <LogoMark className="size-5 shrink-0" />
            <span className="truncate font-heading text-control">Solana Playground</span>
          </div>
          {tip(
            "Close sidebar",
            "bottom",
            <button
              type="button"
              onClick={toggle}
              aria-expanded={true}
              aria-label="Close sidebar"
              data-flash={flash}
              className={cn(
                "grid size-9 shrink-0 place-items-center rounded-control text-muted-foreground transition-colors duration-150 ease-standard hover:bg-surface hover:text-foreground motion-reduce:transition-none pointer-coarse:size-11",
                ring
              )}
            >
              <PanelLeft strokeWidth={1.75} className="size-4" />
            </button>
          )}
        </div>
        <Item icon={<Home strokeWidth={1.75} />} label="Home" labels={labels} onClick={go(soon)} />
        <Item icon={<Plus strokeWidth={1.75} />} label="New project" labels={labels} onClick={go(soon)} />
        <Item
          icon={<BookOpen strokeWidth={1.75} />}
          label="Tutorials"
          labels={labels}
          active={!inProject}
          onClick={go(() => dispatch({ type: "open", screen: "gallery" }))}
        />
        <Item icon={<Boxes strokeWidth={1.75} />} label="Programs" labels={labels} onClick={go(soon)} />
        <p className={cn("mt-4 mb-1 hidden px-2.5 text-caption text-muted-foreground", block)}>Projects</p>
        <span aria-hidden="true" className={cn("my-2 h-px shrink-0 bg-border", rule)} />
        <Item icon={<Folder strokeWidth={1.75} />} label="Counter" labels={labels} onClick={go(soon)} />
        <Item icon={<Folder strokeWidth={1.75} />} label="Tip Jar" labels={labels} onClick={go(soon)} />
        {s.startedAt !== null && (
          <Item
            icon={<FolderOpen strokeWidth={1.75} />}
            label="Hello Anchor"
            labels={labels}
            active={inProject}
            onClick={go(() => dispatch({ type: "start" }))}
          />
        )}
      </nav>
    </>
  )
}
