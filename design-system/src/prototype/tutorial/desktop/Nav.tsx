import { useEffect, useState, type ReactNode } from "react"
import { BookOpen, Boxes, Folder, FolderOpen, Home, PanelLeft, Plus } from "lucide-react"
import { toast } from "sonner"

import { LogoMark } from "@/components/ui/logo"
import { cn } from "@/lib/utils"

import { useStore } from "../store"
import { MENU_KEYS } from "./keys"

const soon = () => toast("Only the tutorial flow is in this prototype")

// Whether the nav shows its labels: unset follows the screen (a rail during a step and under 1280),
// set is the viewer's own choice and holds across steps until they change it
const KEY = "pg-proto-nav-open"
const read = (): boolean | null => {
  try {
    const v = localStorage.getItem(KEY)
    return v === null ? null : v === "1"
  } catch {
    return null
  }
}
const save = (open: boolean) => {
  try {
    localStorage.setItem(KEY, open ? "1" : "0")
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
        "flex h-9 w-full items-center gap-2.5 rounded-control px-2.5 text-caption! text-muted-foreground transition-colors duration-150 ease-standard hover:bg-surface hover:text-foreground motion-reduce:transition-none [&_svg]:size-4 [&_svg]:shrink-0",
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
 * The button at its foot and ⌘B unfold it with labels and fold it back, as the product's sidebar
 * trigger does; unfolded it pushes the screen aside rather than covering the code */
export function Nav() {
  const { s, dispatch } = useStore()
  const [open, setOpen] = useState<boolean | null>(read)
  const inProject = s.screen === "step" || s.screen === "finish"
  const rail = s.screen === "step"

  // Classes for what follows the screen, or the viewer's choice once there is one
  const wide = open === null ? (rail ? "" : "xl:w-[200px]") : open ? "w-[200px]" : ""
  const labels = open === null ? (rail ? "" : "xl:inline") : open ? "inline" : ""
  const block = open === null ? (rail ? "" : "xl:block") : open ? "block" : ""
  const rule = open === null ? (rail ? "" : "xl:hidden") : open ? "hidden" : ""

  const toggle = () => {
    // What shows now, worked out the way the classes above do, so the button always flips it
    const shown = open ?? (!rail && window.matchMedia("(min-width: 1280px)").matches)
    setOpen(!shown)
    save(!shown)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "b") {
        e.preventDefault()
        toggle()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })

  const shownNow = open ?? (!rail && window.matchMedia("(min-width: 1280px)").matches)
  return (
    <nav
      aria-label="Playground"
      className={cn(
        "flex w-14 shrink-0 flex-col gap-1 border-r border-border bg-surface-well px-2 py-3 transition-[width] duration-200 ease-standard motion-reduce:transition-none",
        wide
      )}
    >
      <div className="mb-3 flex h-8 items-center gap-2 px-2">
        <LogoMark className="size-5 shrink-0" />
        <span className={cn("hidden truncate font-heading text-control", labels)}>Solana Playground</span>
      </div>
      <Item icon={<Home strokeWidth={1.75} />} label="Home" labels={labels} onClick={soon} />
      <Item icon={<Plus strokeWidth={1.75} />} label="New project" labels={labels} onClick={soon} />
      <Item icon={<BookOpen strokeWidth={1.75} />} label="Tutorials" labels={labels} active={!inProject} onClick={() => dispatch({ type: "open", screen: "gallery" })} />
      <Item icon={<Boxes strokeWidth={1.75} />} label="Programs" labels={labels} onClick={soon} />
      <p className={cn("mt-4 mb-1 hidden px-2.5 text-caption text-muted-foreground", block)}>Projects</p>
      <span aria-hidden="true" className={cn("my-2 h-px bg-border", rule)} />
      <Item icon={<Folder strokeWidth={1.75} />} label="Counter" labels={labels} onClick={soon} />
      <Item icon={<Folder strokeWidth={1.75} />} label="Tip Jar" labels={labels} onClick={soon} />
      {s.startedAt !== null && (
        <Item icon={<FolderOpen strokeWidth={1.75} />} label="Hello Anchor" labels={labels} active={inProject} onClick={() => dispatch({ type: "start" })} />
      )}
      {/* At the foot, out of the way of the items, with the key in its name */}
      <div className="mt-auto">
        <Item icon={<PanelLeft strokeWidth={1.75} />} label={`${shownNow ? "Collapse" : "Expand"} menu (${MENU_KEYS})`} labels={labels} onClick={toggle} />
      </div>
    </nav>
  )
}
