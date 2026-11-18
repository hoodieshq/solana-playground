import { Check, CircleAlert } from "lucide-react"
import type { ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { StatusDot } from "@/components/ui/status-dot"
import { cn } from "@/lib/utils"

import type { ProgramMeta } from "../data"
import { onChain, usePrograms, type Project } from "../store"
import { stagesOf } from "./shell/Stages"
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

export type Standing = { word: string; deployed: boolean; done?: boolean; failed?: boolean; id?: string; at: number }

/** Where a returning program stands, in the words the whole product uses for it: "Step 2 of 4 · Build" while
 * it is under way and "Done" once it is, as a tutorial's row and its step bar say (Almaz, 18 Nov: one
 * product, one way to say a thing). The steps are the bar's own stages, so the card, the row in Your
 * projects and the page count the same four. A card has no Continue (the card is the button), so this line
 * is what tells a program you started from one you finished and from one you never opened */
export function standing(p: Project): Standing {
  const chain = onChain(p)
  if (p.read) return p.lastCallOkAt ? { word: "Done · Called on devnet", deployed: true, done: true, at: p.lastCallOkAt } : { word: "Opened", deployed: false, at: p.createdAt }
  const list = stagesOf(p)
  const at = list.findIndex((s) => s.state !== "done" && s.state !== "stale")
  const when = Math.max(p.createdAt, chain?.at ?? 0, p.lastCallOkAt)
  if (at === -1) return { word: p.framework === "ts-client" ? "Done · Ran on devnet" : "Done · Runs on devnet", deployed: true, done: true, id: chain?.programId, at: when }
  const stage = list[at]
  if (stage.state === "failed") return { word: `${stage.label} failed`, deployed: !!chain, failed: true, id: chain?.programId, at: when }
  return { word: `Step ${at + 1} of ${list.length} · ${stage.label}`, deployed: !!chain, id: chain?.programId, at: when }
}

/** The 44 tile with the program's cover, on a row of Your projects; the catalog's card draws it at 56 */
export function ProgramIcon({ p, className }: { p: ProgramMeta; className?: string }) {
  return <ProgramCover p={p} className={cn("size-11 rounded-[9px]", className)} />
}

/** The mark and the word: a green tick once done, a green dot on devnet, a red one on a failed step, grey otherwise */
export function StandingWord({ s, className }: { s: Standing; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", s.deployed ? "text-foreground" : "text-muted-foreground", className)}>
      {s.done ? <Check aria-hidden="true" strokeWidth={2.5} className="size-3.5 text-success" /> : <StatusDot variant={s.failed ? "error" : s.deployed ? "success" : "idle"} />}
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
