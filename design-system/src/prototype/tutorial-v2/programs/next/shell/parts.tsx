import { useEffect, useState, type ReactNode } from "react"
import { Check, ChevronRight, Copy, ExternalLink, X, type LucideIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Kbd } from "@/components/ui/kbd"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

import { openExplorer } from "../../../ui/explorer"
import { FOCUS } from "../../../ui/type"

/* Small pieces the shell's cards share, after the tutorial's PlainDetails and result rows, wired to
   the programs store instead of the lesson's */

/** The details' quiet controls: caption size, muted, brighter on hover */
export const QUIET = cn(
  "inline-flex items-center gap-1.5 rounded-sm whitespace-nowrap text-13 leading-[1.125rem] text-muted-foreground transition-colors duration-150 ease-standard hover:text-foreground motion-reduce:transition-none",
  FOCUS
)

/** A status row's words: the title 16/24 at 500, the meta 14/18 in grey, on one baseline */
export const STATUS_PAIR = "flex min-w-0 flex-1 items-baseline gap-2"
export const STATUS_TITLE = "shrink-0 font-heading text-16 leading-[1.5rem] font-act text-foreground"
export const STATUS_META = "min-w-0 truncate text-13 leading-[1.125rem] text-muted-foreground"

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

/** Copy and Explorer in one row: the Call panel's response foot. No Log beside them: the panel shows the
 * log right above, and the workspace head has the terminal's button. As the terminal's icon beside the
 * word it read as a third way to the same lines (Almaz, 10 Nov) */
export function Actions({ copy, className }: { copy?: { label: string; value: string }; className?: string }) {
  if (!copy) return null
  return (
    <div className={cn("flex h-10 items-center gap-4", className)}>
      <CopyQuiet {...copy} />
      <button type="button" onClick={openExplorer} className={QUIET}>
        <ExternalLink aria-hidden="true" strokeWidth={1.75} className="size-3.5" />
        Explorer
      </button>
    </div>
  )
}

/** Keys in printed lines cut six and six, as everywhere else: a full key ran over three lines */
export const shortKeys = (line: string) => line.replace(/[1-9A-HJ-NP-Za-km-z]{32,}/g, (k) => `${k.slice(0, 6)}…${k.slice(-6)}`)

/** Lines a program or a client printed, in a well */
export function Well({ lines, className }: { lines: string[]; className?: string }) {
  return (
    <div className={cn("rounded-control bg-surface-well px-3 py-2.5 font-mono text-13 leading-5 break-words", className)}>
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
  return <div className="border-l-2 border-error/40 pl-3 font-mono text-13 leading-[1.6] break-words text-foreground/90">{children}</div>
}

/** A live card's foot: its button, and the fields it sends, on the panel's grey under a hairline, out to
 * the card's edges, as the tutorial's cards set theirs. Beside the words, the button centred on a block
 * that kept room for a two line description and stood off the title (Almaz, 10 Nov). Left aligned on a
 * desktop, full width under a thumb */
export const FOOT = "-mx-4 -mb-4 mt-1 flex flex-col items-start gap-3 border-t border-border bg-surface-panel px-4 py-3 max-sm:items-stretch"

/** A suggested question: the chip of the row over the composer (ui/ChipRow.tsx) */
export { CHIP as CHIP_BUTTON } from "../../../ui/ChipRow"

/** A way on from a done card: icon, words, chevron */
export function NextRow({ icon: Icon, label, onClick }: { icon: LucideIcon; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("group flex h-10 w-full items-center gap-3 rounded-lg px-2 pointer-coarse:h-11 text-left text-16 font-act text-foreground transition-colors duration-100 hover:bg-surface-hover motion-reduce:transition-none", FOCUS)}
    >
      <Icon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground group-hover:text-foreground" />
    </button>
  )
}

/** A panel's Hide, the same in Files, Terminal and Assistant (Nikita, 20 Nov: a cross, a chevron and
 * nothing at all were three ways to close three panels): a quiet cross, the panel's key in the tip. The
 * head's icon and the key bring it back */
export function PanelHide({ what, keys, onClick, className }: { what: string; keys: string; onClick: () => void; className?: string }) {
  return (
    <Tooltip delayDuration={300}>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={`Hide ${what}`} onClick={onClick} className={cn("shrink-0 text-muted-foreground", className)}>
          <X />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {`Hide ${what}`}
        <Kbd className="ml-1.5">{keys}</Kbd>
      </TooltipContent>
    </Tooltip>
  )
}
