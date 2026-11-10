import { Children, useState, type ReactNode } from "react"

import { cn } from "@/lib/utils"

import { LitIcon } from "./icons"
import { FOCUS, useRoomy } from "./parts"

export type GroupName = "Pinned" | "Projects"

const FOLDED_KEY = "pg-proto-nav-folded"
const readFolded = (): GroupName[] => {
  try {
    return JSON.parse(localStorage.getItem(FOLDED_KEY) ?? "[]")
  } catch {
    return []
  }
}

/** Pinned or Projects: a heading you can fold, smaller and dimmer than the bright rows under it, as
 * Dropbox Dash, Sana, Buffer and Twenty set theirs, so a heading never reads as one more row. On desktop
 * the rows touch and the heading is 24 high, so a long list fits; the tablet keeps its finger sizes. A
 * group with nothing in it has no heading and takes no room */
export function NavGroup({ label, children }: { label: GroupName; children: ReactNode }) {
  const tablet = useRoomy()
  const [folded, setFolded] = useState(() => readFolded().includes(label))
  if (Children.toArray(children).length === 0) return null

  const toggle = () => {
    setFolded(!folded)
    try {
      const rest = readFolded().filter((g) => g !== label)
      localStorage.setItem(FOLDED_KEY, JSON.stringify(folded ? rest : [...rest, label]))
    } catch {
      // Storage off: the fold lasts until the page reloads
    }
  }

  return (
    <section aria-label={label} className={cn("flex flex-col", tablet && "gap-0.5")}>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={!folded}
        className={cn(
          "group/head flex w-fit items-end gap-1 rounded-md px-2 pb-0.5 text-left text-[0.75rem] leading-4 font-act tracking-[0.01em] text-(color:--text-quiet) hover:text-muted-foreground",
          FOCUS,
          tablet ? "h-9" : "h-6"
        )}
      >
        <h2>{label}</h2>
        <span
          aria-hidden="true"
          className={cn(
            "mb-px flex size-3 transition-transform duration-150 [&>svg]:size-full",
            folded && "-rotate-90"
          )}
        >
          <LitIcon name="caret" />
        </span>
      </button>
      {!folded && children}
    </section>
  )
}
