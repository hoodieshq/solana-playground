import { ExternalLink } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"

import { PROGRAM_ID, shortKey } from "../data"

// Copy and Explorer reach past the card's padding, so each is about 44px tall for a finger
const LINK = "-my-3 flex shrink-0 items-center gap-1 py-3 text-muted-foreground hover:text-foreground"

/** What a deploy leaves behind: the program id in one line, with Copy and the Explorer link */
export function ProgramId({ className }: { className?: string }) {
  const copy = () =>
    navigator.clipboard
      ?.writeText(PROGRAM_ID)
      .then(() => toast("Program id copied"))
      .catch(() => toast("Couldn't copy the program id"))
  return (
    <div className={cn("flex items-center gap-3 rounded-control border border-border bg-surface-panel px-3 py-2 text-caption", className)}>
      <span className="shrink-0 text-muted-foreground">Program id</span>
      <code title={PROGRAM_ID} className="min-w-0 flex-1 truncate font-mono text-code text-foreground">
        {shortKey(PROGRAM_ID)}
      </code>
      <button type="button" onClick={copy} className={LINK}>
        Copy
      </button>
      <a href={`https://explorer.solana.com/address/${PROGRAM_ID}?cluster=devnet`} target="_blank" rel="noreferrer" className={LINK}>
        Explorer
        <ExternalLink strokeWidth={1.75} className="size-3.5" />
      </a>
    </div>
  )
}
