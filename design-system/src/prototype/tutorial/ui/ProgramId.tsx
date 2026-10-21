import { ExternalLink } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"

import { PROGRAM_ID, TX_SIGNATURE, shortKey } from "../data"

// Copy and Explorer reach past the card's padding, so each is about 44px tall for a finger
const LINK = "-my-3 flex shrink-0 items-center gap-1 py-3 text-muted-foreground hover:text-foreground"

/** A key a run leaves behind, in one line under the log, with Copy and the Explorer link. The log
 * itself cuts it off at the edge */
function KeyRow({ label, value, href, className }: { label: string; value: string; href: string; className?: string }) {
  const copy = () =>
    navigator.clipboard
      ?.writeText(value)
      .then(() => toast(`${label} copied`))
      .catch(() => toast(`Couldn't copy the ${label.toLowerCase()}`))
  return (
    <div className={cn("flex items-center gap-3 rounded-control border border-border bg-surface-panel px-3 py-2 text-caption", className)}>
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <code title={value} className="min-w-0 flex-1 truncate font-mono text-code text-foreground">
        {shortKey(value)}
      </code>
      <button type="button" onClick={copy} className={LINK}>
        Copy
      </button>
      <a href={href} target="_blank" rel="noreferrer" className={LINK}>
        Explorer
        <ExternalLink strokeWidth={1.75} className="size-3.5" />
      </a>
    </div>
  )
}

/** What a deploy leaves behind */
export function ProgramId({ className }: { className?: string }) {
  return <KeyRow label="Program id" value={PROGRAM_ID} href={`https://explorer.solana.com/address/${PROGRAM_ID}?cluster=devnet`} className={className} />
}

/** What the client's call leaves behind: the transaction whose logs show hello ran */
export function Transaction({ className }: { className?: string }) {
  return <KeyRow label="Transaction" value={TX_SIGNATURE} href={`https://explorer.solana.com/tx/${TX_SIGNATURE}?cluster=devnet`} className={className} />
}
