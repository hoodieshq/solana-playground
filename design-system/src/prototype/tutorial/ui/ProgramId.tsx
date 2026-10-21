import { Copy, ExternalLink } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"

import { PROGRAM_ID, TX_SIGNATURE, shortKey } from "../data"
import { openExplorer } from "./explorer"

// Copy and Explorer reach past the card's padding, so each is about 44px tall for a finger. On a
// narrow card, where they keep only their icons, each is a 44px square around a small icon
const LINK =
  "-my-3 flex shrink-0 items-center gap-1 py-3 text-muted-foreground hover:text-foreground @max-xs:-mx-1.5 @max-xs:size-11 @max-xs:justify-center @max-xs:py-0"

/** A key a run leaves behind, in one line under the log, with Copy and the Explorer link. The log
 * itself cuts it off at the edge */
function KeyRow({ label, value, className }: { label: string; value: string; className?: string }) {
  const copy = () =>
    navigator.clipboard
      ?.writeText(value)
      .then(() => toast(`${label} copied`))
      .catch(() => toast(`Couldn't copy the ${label.toLowerCase()}`))
  return (
    <div className={cn("@container flex items-center gap-3 rounded-control border border-border bg-surface-panel px-3 py-2 text-caption", className)}>
      {/* On a narrow card the label goes over the key, so the key keeps the room the two 44px
          buttons leave */}
      <span className="flex min-w-0 flex-1 items-center gap-3 @max-xs:flex-col @max-xs:items-start @max-xs:gap-0">
        <span className="shrink-0 text-muted-foreground">{label}</span>
        <code title={value} className="min-w-0 max-w-full flex-1 truncate font-mono text-code text-foreground">
          {/* Shorter on a narrow card, so it ends in its own last characters, not in a cut */}
          <span className="@max-xs:hidden">{shortKey(value)}</span>
          <span className="hidden @max-xs:inline">{shortKey(value, 4)}</span>
        </code>
      </span>
      <button type="button" onClick={copy} className={LINK}>
        <Copy strokeWidth={1.75} className="hidden size-3.5 @max-xs:block" aria-hidden="true" />
        <span className="@max-xs:sr-only">Copy</span>
      </button>
      <button type="button" onClick={openExplorer} className={cn(LINK, "@max-xs:-mr-3")}>
        {/* On a narrow card Copy and Explorer keep only their icons, so the key keeps room to be read */}
        <span className="@max-xs:sr-only">Explorer</span>
        <ExternalLink strokeWidth={1.75} className="size-3.5" />
      </button>
    </div>
  )
}

/** What a deploy leaves behind */
export function ProgramId({ className }: { className?: string }) {
  return <KeyRow label="Program id" value={PROGRAM_ID} className={className} />
}

/** What the client's call leaves behind: the transaction whose logs show hello ran */
export function Transaction({ className }: { className?: string }) {
  return <KeyRow label="Transaction" value={TX_SIGNATURE} className={className} />
}
