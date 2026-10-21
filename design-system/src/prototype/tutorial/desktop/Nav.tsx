import type { ReactNode } from "react"
import { BookOpen, Boxes, Folder, FolderOpen, Home, Plus } from "lucide-react"
import { toast } from "sonner"

import { LogoMark } from "@/components/ui/logo"
import { cn } from "@/lib/utils"

import { useStore } from "../store"

const soon = () => toast("Only the tutorial flow is in this prototype")

function Item({ icon, label, active = false, rail, onClick }: { icon: ReactNode; label: string; active?: boolean; rail: boolean; onClick: () => void }) {
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
      <span className={cn("hidden truncate", !rail && "xl:inline")}>{label}</span>
    </button>
  )
}

/** The product's own navigation, as in client-v2. Under 1280 it folds to a rail of icons, and
 * while a step is open it stays a rail at any width: the editor and the lesson need the room */
export function Nav() {
  const { s, dispatch } = useStore()
  const inProject = s.screen === "step" || s.screen === "finish"
  const rail = s.screen === "step"
  return (
    <nav aria-label="Playground" className={cn("flex w-14 shrink-0 flex-col gap-1 border-r border-border bg-surface-well px-2 py-3", !rail && "xl:w-[200px]")}>
      <div className="mb-3 flex h-8 items-center gap-2 px-2">
        <LogoMark className="size-5" />
        <span className={cn("hidden font-heading text-control", !rail && "xl:inline")}>Solana Playground</span>
      </div>
      <Item icon={<Home strokeWidth={1.75} />} label="Home" rail={rail} onClick={soon} />
      <Item icon={<Plus strokeWidth={1.75} />} label="New project" rail={rail} onClick={soon} />
      <Item icon={<BookOpen strokeWidth={1.75} />} label="Tutorials" rail={rail} active={!inProject} onClick={() => dispatch({ type: "open", screen: "gallery" })} />
      <Item icon={<Boxes strokeWidth={1.75} />} label="Programs" rail={rail} onClick={soon} />
      <p className={cn("mt-4 mb-1 hidden px-2.5 text-caption text-muted-foreground", !rail && "xl:block")}>Projects</p>
      <span aria-hidden="true" className={cn("my-2 h-px bg-border", !rail && "xl:hidden")} />
      <Item icon={<Folder strokeWidth={1.75} />} label="Counter" rail={rail} onClick={soon} />
      <Item icon={<Folder strokeWidth={1.75} />} label="Tip Jar" rail={rail} onClick={soon} />
      {s.startedAt !== null && (
        <Item icon={<FolderOpen strokeWidth={1.75} />} label="Hello Anchor" rail={rail} active={inProject} onClick={() => dispatch({ type: "start" })} />
      )}
    </nav>
  )
}
