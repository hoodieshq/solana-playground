import type { ReactNode } from "react"
import { BookOpen, Boxes, Folder, FolderOpen, Home, Plus } from "lucide-react"
import { toast } from "sonner"

import { LogoMark } from "@/components/ui/logo"
import { cn } from "@/lib/utils"

import { useStore } from "../store"

const soon = () => toast("Only the tutorial flow is in this prototype")

function Item({ icon, label, active = false, onClick }: { icon: ReactNode; label: string; active?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-9 w-full items-center gap-2.5 rounded-control px-2.5 text-caption text-muted-foreground transition-colors duration-150 ease-standard hover:bg-surface hover:text-foreground motion-reduce:transition-none [&_svg]:size-4 [&_svg]:shrink-0",
        active && "bg-surface-raised text-foreground"
      )}
    >
      {icon}
      <span className="hidden truncate xl:inline">{label}</span>
    </button>
  )
}

/** The product's own navigation, as in client-v2. Under 1280 it folds to a rail of icons */
export function Nav() {
  const { s, dispatch } = useStore()
  const inProject = s.screen === "step" || s.screen === "finish"
  return (
    <nav aria-label="Playground" className="flex w-14 shrink-0 flex-col gap-1 border-r border-border bg-surface-well px-2 py-3 xl:w-[200px]">
      <div className="mb-3 flex h-8 items-center gap-2 px-2">
        <LogoMark className="size-5" />
        <span className="hidden font-heading text-control xl:inline">Solana Playground</span>
      </div>
      <Item icon={<Home strokeWidth={1.75} />} label="Home" onClick={soon} />
      <Item icon={<Plus strokeWidth={1.75} />} label="New project" onClick={soon} />
      <Item icon={<BookOpen strokeWidth={1.75} />} label="Tutorials" active={!inProject} onClick={() => dispatch({ type: "open", screen: "gallery" })} />
      <Item icon={<Boxes strokeWidth={1.75} />} label="Programs" onClick={soon} />
      <p className="mt-4 mb-1 hidden px-2.5 text-caption text-muted-foreground xl:block">Projects</p>
      <span aria-hidden="true" className="my-2 h-px bg-border xl:hidden" />
      <Item icon={<Folder strokeWidth={1.75} />} label="Counter" onClick={soon} />
      <Item icon={<Folder strokeWidth={1.75} />} label="Tip Jar" onClick={soon} />
      {s.startedAt !== null && (
        <Item icon={<FolderOpen strokeWidth={1.75} />} label="Hello Anchor" active={inProject} onClick={() => dispatch({ type: "start" })} />
      )}
    </nav>
  )
}
