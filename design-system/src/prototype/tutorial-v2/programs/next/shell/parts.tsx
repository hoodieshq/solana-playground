import { useEffect, useState, type ReactNode } from "react"
import { Check, ChevronRight, Copy, ExternalLink, SquareTerminal, type LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

import { openExplorer } from "../../../ui/explorer"
import { Prose } from "../../../ui/Prose"
import { FOCUS, READ } from "../../../ui/type"
import { setTerminal } from "../../store"

/* Small pieces the shell's cards share, after the tutorial's PlainDetails and result rows, wired to
   the programs store instead of the lesson's */

/** The details' quiet controls: caption size, muted, brighter on hover */
export const QUIET = cn(
  "inline-flex items-center gap-1.5 rounded-sm whitespace-nowrap text-[0.875rem] leading-[1.125rem] text-muted-foreground transition-colors duration-150 ease-standard hover:text-foreground motion-reduce:transition-none",
  FOCUS
)

/** A status row's words: the title 16/24 at 500, the meta 14/18 in grey, on one baseline */
export const STATUS_PAIR = "flex min-w-0 flex-1 items-baseline gap-2"
export const STATUS_TITLE = "shrink-0 font-heading text-[1rem] leading-[1.5rem] font-medium text-foreground"
export const STATUS_META = "min-w-0 truncate text-[0.875rem] leading-[1.125rem] text-muted-foreground"

/** Copy with "Copied" in its place for a moment */
export function CopyQuiet({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 1600)
    return () => clearTimeout(t)
  }, [copied])
  return (
    <button
      type="button"
      onClick={() =>
        navigator.clipboard
          ?.writeText(value)
          .then(() => setCopied(true))
          .catch(() => {})
      }
      className={QUIET}
    >
      {copied ? <Check aria-hidden="true" className="size-3.5 text-success" /> : <Copy aria-hidden="true" strokeWidth={1.75} className="size-3.5" />}
      <span aria-live="polite">{copied ? "Copied" : label}</span>
    </button>
  )
}

/** A result's details: one sentence of what happened, then Copy, Explorer and Log in one row. Log
 * opens the terminal, where the whole output is */
export function Details({ id, text, copy }: { id: string; text: string; copy?: { label: string; value: string } }) {
  // The actions sit in a bar of their own across the card, under a hairline, so they don't run into
  // the sentence (Almaz, 6 Nov)
  return (
    <div className="flex flex-col">
      <p className={cn(READ, "px-4 pt-3 pb-4 text-pretty")}>
        <Prose text={text} />
      </p>
      <Actions id={id} copy={copy} className="border-t border-border bg-surface-panel px-4" />
    </div>
  )
}

/** Copy, Explorer and Log in one row: a card's bar, or the Call panel's response foot */
export function Actions({ id, copy, className }: { id: string; copy?: { label: string; value: string }; className?: string }) {
  return (
    <div className={cn("flex h-10 items-center gap-4", className)}>
      {copy && <CopyQuiet {...copy} />}
      {copy && (
        <button type="button" onClick={openExplorer} className={QUIET}>
          <ExternalLink aria-hidden="true" strokeWidth={1.75} className="size-3.5" />
          Explorer
        </button>
      )}
      <button type="button" title="Terminal ⌘J" onClick={() => setTerminal(id, true)} className={cn(QUIET, "ml-auto")}>
        <SquareTerminal aria-hidden="true" strokeWidth={1.75} className="size-3.5" />
        Log
      </button>
    </div>
  )
}

/** Keys in printed lines cut six and six, as everywhere else: a full key ran over three lines */
export const shortKeys = (line: string) => line.replace(/[1-9A-HJ-NP-Za-km-z]{32,}/g, (k) => `${k.slice(0, 6)}…${k.slice(-6)}`)

/** Lines a program or a client printed, in a well */
export function Well({ lines, className }: { lines: string[]; className?: string }) {
  return (
    <div className={cn("rounded-control bg-surface-well px-3 py-2.5 font-mono text-[0.8125rem] leading-5 break-words", className)}>
      {lines.map((l, i) => (
        <p key={i} className="text-foreground">
          {l.startsWith("Program log: ") ? (
            <>
              <span className="text-muted-foreground">Program log: </span>
              {shortKeys(l.slice("Program log: ".length))}
            </>
          ) : (
            shortKeys(l)
          )}
        </p>
      ))}
    </div>
  )
}

/** A compiler's or a program's words, quoted on a red rule. Red stays on the rule, the words in foreground */
export function Quote({ children }: { children: ReactNode }) {
  return <div className="border-l-2 border-error/40 pl-3 font-mono text-[0.8125rem] leading-[1.6] break-words text-foreground/90">{children}</div>
}

/** A chip under an assistant's answer */
export const CHIP_BUTTON =
  "h-7 shrink-0 rounded-full border border-border-strong px-3 text-[0.8125rem] whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground outline-none focus-visible:outline-2 focus-visible:outline-brand-purple"

/** A way on from a done card: icon, words, chevron */
export function NextRow({ icon: Icon, label, onClick }: { icon: LucideIcon; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("group flex h-10 w-full items-center gap-3 rounded-lg px-2 pointer-coarse:h-11 text-left text-[0.9375rem] font-act text-foreground transition-colors duration-100 hover:bg-surface-hover motion-reduce:transition-none", FOCUS)}
    >
      <Icon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground group-hover:text-foreground" />
    </button>
  )
}
