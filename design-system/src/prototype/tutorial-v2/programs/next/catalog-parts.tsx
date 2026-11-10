import { CircleAlert } from "lucide-react"
import type { ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { StatusDot } from "@/components/ui/status-dot"
import { cn } from "@/lib/utils"

import type { ProgramMeta } from "../data"
import { readPath } from "../read"
import { answered, metaOf, onChain, usePrograms, type Project } from "../store"
import { ProgramCover } from "./ProgramCover"

/* Pieces the catalog, its banner and the Guide share: the icon tile, the state words, the failure
   block. The state strings are the same on the card and in the shell (ui-design.md 1.3) */

export const FOCUS = "outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"

/** The button back into a program you already opened, as the tutorials word theirs: Continue while the
 * Guide has a step left, Open project once the first call went through (read mode: Open once read).
 * Start would read as starting over */
export const resumeLabel = (p: Project) => (p.read ? (p.readAt ? "Open" : "Continue") : p.doneAt ? "Open project" : "Continue")

/** The project made from this catalog program, kept live: projectOfSlug reads the store once */
export const useProjectOf = (slug: string) => usePrograms((s) => Object.values(s.projects).find((p) => p.slug === slug))

export type Standing = { word: string; deployed: boolean; id?: string; at: number }

/** Where a returning program stands, in the words every screen uses */
export function standing(p: Project): Standing {
  const meta = metaOf(p)
  if (p.read && meta) {
    if (p.lastCallOkAt) return { word: "Called on devnet", deployed: true, at: p.lastCallOkAt }
    if (p.readAt) return { word: "Read", deployed: false, at: p.readAt }
    return { word: `Reading · ${answered(p).size} of ${readPath(meta).length}`, deployed: false, at: p.createdAt }
  }
  const chain = onChain(p)
  return chain ? { word: "Deployed to devnet", deployed: true, id: chain.programId, at: chain.at } : { word: "Opened", deployed: false, at: p.createdAt }
}

/** The 44 tile with the program's avatar, as the gallery card's cover */
export function ProgramIcon({ p, className }: { p: ProgramMeta; className?: string }) {
  return <ProgramCover p={p} className={cn("size-11 rounded-[9px]", className)} />
}

/** The dot and the word: green and white for an achievement, grey for plain "Opened" */
export function StandingWord({ s, className }: { s: Standing; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", s.deployed ? "text-foreground" : "text-muted-foreground", className)}>
      <StatusDot variant={s.deployed ? "success" : "idle"} />
      {s.word}
    </span>
  )
}

/** A separator dot: decoration, so it may sit in the tertiary grey */
export const Sep = () => (
  <span aria-hidden="true" className="text-subtle">
    ·
  </span>
)

/** Couldn't load: the NoMatch shape with an icon, so both empty states read alike (ui-design.md 2.6) */
export function Problem({ title, line, onRetry, retrying, children }: { title: string; line: string; onRetry: () => void; retrying?: boolean; children?: ReactNode }) {
  return (
    <div role="alert" className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-2.5 py-6">
      <CircleAlert aria-hidden="true" className="mt-0.5 size-4 text-error" />
      <div className="flex flex-col items-start gap-1">
        <p className="text-[0.9375rem] leading-5 font-act text-foreground">{title}</p>
        <p className="text-[0.875rem] leading-5 font-read text-muted-foreground">{line}</p>
        <div className="mt-2 flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onRetry} disabled={retrying} className="cursor-pointer">
            Try again
          </Button>
          {children}
        </div>
      </div>
    </div>
  )
}
