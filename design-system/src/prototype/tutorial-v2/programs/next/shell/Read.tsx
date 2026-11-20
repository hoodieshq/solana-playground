import { useEffect, useRef, useState } from "react"
import { BookOpen } from "lucide-react"

import { CopyButton } from "@/components/ui/copy-button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { StatusDot } from "@/components/ui/status-dot"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

import { openExplorer } from "../../../ui/explorer"
import { type ProgramMeta } from "../../data"
import { WHY } from "../../read"
import { ask, setNotice, type Project } from "../../store"
import { CHIP_BUTTON, QUIET } from "./parts"
import { copyText, flashReadOnly, onReveal, shortKey } from "./util"

// ----- Line links and the lit range -----------------------------------------------------------------

/** The range a line link lit in this file: the editor draws it as written lines, in the neutral tint */
export function useLit(file: string) {
  const [lit, setLit] = useState<{ file: string; from: number; to: number; at: number } | null>(null)
  useEffect(() => onReveal((d) => d.lit && setLit({ file: d.file, from: d.line, to: d.to ?? d.line, at: Date.now() })), [])
  if (!lit || lit.file !== file) return { written: [], arrive: 0 }
  return { written: Array.from({ length: lit.to - lit.from + 1 }, (_, i) => lit.from + i), arrive: lit.at }
}

/** The editor's written lines in a neutral tint: an explanation lights code, it didn't write it, so no green */
export const LIT_CSS = `
.prog-lit pre > div[class~="border-foreground/25"] { background-color: color-mix(in srgb, var(--foreground) 4%, transparent); }
.prog-lit .pg-arrive { animation-name: prog-lit-arrive; }
@keyframes prog-lit-arrive { from { background-color: color-mix(in srgb, var(--foreground) 14%, transparent); } }`

// ----- Chips ------------------------------------------------------------------------------------------

/** Two or three questions under the last answer; a finger gets 44 round each */
export function Chips({ p, chips }: { p: Project; chips: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5 pointer-coarse:gap-y-4">
      {chips.map((c) => (
        <button key={c} type="button" className={cn(CHIP_BUTTON, "relative pointer-coarse:after:absolute pointer-coarse:after:-inset-y-2 pointer-coarse:after:inset-x-0 pointer-coarse:after:content-['']")} onClick={() => ask(p.id, c)}>
          {c}
        </button>
      ))}
    </div>
  )
}

// ----- Stop cards ---------------------------------------------------------------------------------------

// ----- Stop answers ---------------------------------------------------------------------------------------

// ----- Call on devnet (memo and noop) ----------------------------------------------------------------------

// ----- Done ------------------------------------------------------------------------------------------------

// ----- The workspace head's chips ----------------------------------------------------------------------------

const CHIP = "flex h-7 shrink-0 items-center gap-1.5 rounded-lg border border-border bg-surface-panel text-13 leading-4"

/** Solana's copy on devnet with Copy, or "Not on devnet". Never "your program" */
export function DevnetChip({ meta }: { meta: ProgramMeta }) {
  const id = meta.devnetId
  if (!id)
    return (
      <div className={cn(CHIP, "px-2.5")}>
        <StatusDot variant="idle" />
        <span className="text-muted-foreground">Not on devnet</span>
      </div>
    )
  return (
    <div className={cn(CHIP, "pr-1 pl-2.5")}>
      <StatusDot variant="success" />
      <span className="text-muted-foreground">Devnet</span>
      <span aria-hidden="true" className="text-subtle">
        ·
      </span>
      <DropdownMenu>
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger className="rounded-sm font-mono text-13 text-foreground outline-none hover:text-foreground/80 focus-visible:ring-2 focus-visible:ring-ring">{shortKey(id)}</DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom">Solana's copy on devnet</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="end" className="min-w-48">
          <DropdownMenuItem onSelect={() => copyText(id, "Program id")}>Copy program id</DropdownMenuItem>
          <DropdownMenuItem onSelect={openExplorer}>Open in Explorer</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <CopyButton value={id} label="Copy program id" className="size-6" />
    </div>
  )
}

// ----- The typing notice -----------------------------------------------------------------------------------

/** A keystroke in the read only editor: the notice floats in the editor's chip slot (pinned under the Code
 * row on a phone) and leaves on the next click elsewhere; the head's mark flashes once */
export function ReadNotice({ p, phone = false, onAsk }: { p: Project; phone?: boolean; onAsk?: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const shown = p.notice === "read"
  useEffect(() => {
    if (!shown) return
    const away = (e: PointerEvent) => {
      // The phone's switch to Code is how you get to the notice, so it doesn't count as elsewhere
      if (!ref.current?.contains(e.target as Node) && !(e.target as Element).closest?.("[data-keep-notice]")) setNotice(p.id, null)
    }
    document.addEventListener("pointerdown", away)
    return () => document.removeEventListener("pointerdown", away)
  }, [shown, p.id])
  if (!shown) return null
  return (
    <div
      ref={ref}
      role="status"
      className={cn(
        "flex items-start gap-2 text-13 leading-5 text-foreground/80 animate-in fade-in-0 duration-[120ms]",
        phone ? "min-h-11 border-b border-border bg-surface-raised px-4 py-2.5 [html.portrait_&]:px-8" : "max-w-[360px] rounded-[10px] border border-border-strong bg-surface-raised px-3 py-2 shadow-md"
      )}
    >
      <BookOpen aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
      <p className="min-w-0 flex-1">
        Read only. Playground can't build Native programs yet, so changes here couldn't run.{" "}
        <button
          type="button"
          onClick={() => {
            setNotice(p.id, null)
            ask(p.id, WHY)
            onAsk?.()
          }}
          className={cn(QUIET, "text-13 text-foreground underline underline-offset-[3px] pointer-coarse:-my-3.5 pointer-coarse:py-3.5")}
        >
          Ask why
        </button>
      </p>
    </div>
  )
}

/** The read only editor's keys: a printing key, Delete or a paste shows the notice. Select and copy work */
export function onReadOnlyKey(p: Project, e: { key: string; metaKey: boolean; ctrlKey: boolean; altKey: boolean }) {
  if (!p.read || e.metaKey || e.ctrlKey || e.altKey) return
  if (e.key.length !== 1 && e.key !== "Backspace" && e.key !== "Delete" && e.key !== "Enter") return
  setNotice(p.id, "read")
  flashReadOnly()
}
