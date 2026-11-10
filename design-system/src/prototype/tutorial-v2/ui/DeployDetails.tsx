import { useEffect, useRef, useState } from "react"
import { Check, ChevronDown, Copy, ExternalLink } from "lucide-react"

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"

import { DEPLOY_COST, PROGRAM_ID, UPGRADE_COST, shortKey } from "../data"
import { useStore } from "../store"
import { BuildLog } from "./BuildLog"
import { openExplorer } from "./explorer"
import { Prose } from "./Prose"
import { FOCUS, READ } from "./type"

// The details' quiet controls share one face: caption size, muted, brightening on hover, never broken in two
const QUIET = cn(
  "inline-flex items-center gap-1.5 rounded-sm whitespace-nowrap text-[0.875rem] leading-[1.125rem] text-muted-foreground transition-colors duration-150 ease-standard hover:text-foreground motion-reduce:transition-none",
  FOCUS
)
// Under a finger each row of controls is 44px tall. Reaching into the margins instead let the id's
// actions and the Log toggle overlap, so on a phone the rows take their full height
const THUMB = "min-h-11"
const CHEVRON = "size-3.5 shrink-0 text-muted-foreground transition-transform duration-150 ease-standard group-hover:text-foreground motion-reduce:transition-none"

/** A result's details in plain words, as the assistant would say them: one sentence of what happened,
 * with the one key it names in a code chip, then one row of quiet controls (copy that key and open it in
 * Explorer on the left, the log's toggle on the right), and the raw log shut behind it in a well of its
 * own. The deploy card and a sent transaction's card share it, so every result reads the same way.
 * `copy` is the key the row copies; without one the row holds only the log's toggle */
export function PlainDetails({ text, copy, log, phone, quiet = false }: { text: string; copy?: { label: string; value: string }; log: string[]; phone: boolean; quiet?: boolean }) {
  const { dispatch } = useStore()
  const [logOpen, setLogOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const well = useRef<HTMLDivElement>(null)

  // An opened log is brought into view once it has unfolded: under a sheet's pinned Call button or the
  // feed's end it opened out of sight, and the tap seemed to do nothing. Nearest, so a log already in
  // view doesn't move the page
  useEffect(() => {
    if (!logOpen) return
    const t = setTimeout(() => well.current?.scrollIntoView({ block: "nearest", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }), 220)
    return () => clearTimeout(t)
  }, [logOpen])

  // "Copied" stands in for the label long enough to be read, then the action is offered again
  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 1600)
    return () => clearTimeout(t)
  }, [copied])

  const onCopy = () =>
    copy &&
    navigator.clipboard
      ?.writeText(copy.value)
      .then(() => setCopied(true))
      .catch(() => {})

  return (
    // The Shell keeps 12 under its details; a phone's last row is already a thumb's height
    <div className={cn(phone && "-mb-2")}>
      {/* `quiet` is for a card whose accounts above are the answer, the Call panel's and a records call's:
          the cost is a footnote, set like the controls under it */}
      <p className={quiet ? "text-[0.875rem] leading-5 text-pretty text-muted-foreground" : cn(READ, "text-pretty")}>
        <Prose text={text} />
      </p>

      {/* One row of quiet controls under the sentence, 8 below it: what you can do with the key on the
          left, the log's toggle on the right. Two rows of four alike controls, the terminal's alone at the
          far right, made the eye zigzag and didn't say which went with what */}
      <Collapsible open={logOpen} onOpenChange={setLogOpen}>
        <div className={cn("mt-2 flex items-center gap-4", phone && "mt-0")}>
          {copy && (
            <>
              <button type="button" onClick={onCopy} className={cn(QUIET, phone && THUMB)}>
                {copied ? <Check aria-hidden="true" className="size-3.5" /> : <Copy aria-hidden="true" strokeWidth={1.75} className="size-3.5" />}
                <span aria-live="polite">{copied ? "Copied" : copy.label}</span>
              </button>
              <button type="button" onClick={openExplorer} className={cn(QUIET, phone && THUMB)}>
                <ExternalLink aria-hidden="true" strokeWidth={1.75} className="size-3.5" />
                {/* "Explorer" alone, the arrow says it leaves: "View in Explorer" beside "Copy signature" broke
                    both labels in two in a 270px column */}
                Explorer
              </button>
            </>
          )}
          {/* The raw output, for the curious: shut by default, so the sentence stays the answer */}
          <CollapsibleTrigger className={cn(QUIET, "group ml-auto", phone && THUMB)}>
            Log
            <ChevronDown aria-hidden="true" className={cn(CHEVRON, logOpen && "rotate-180")} />
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent className="overflow-hidden duration-200 ease-standard data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down motion-reduce:animate-none">
          {/* The output in a well of its own, 12 under the controls, a step more than the 8 between the
              sentence and them: on the card's ground it read as more of the card's text. Lines keep to one
              row and scroll, fading at the edge, so a program id isn't broken under a hanging indent. The
              way to the whole output sits in the well's own bar, as a listing's Copy does in Practicum,
              rather than hanging under the card on its own; the terminal is a desktop panel */}
          <div ref={well} className={cn("scroll-mb-4 overflow-hidden rounded-[6px] bg-surface-well", phone ? "mt-1" : "mt-3")}>
            {!phone && (
              <div className="flex justify-end px-3 pt-2">
                <button
                  type="button"
                  title="Terminal ⌘J"
                  onClick={() => dispatch({ type: "terminal", open: true })}
                  className={cn(QUIET, "text-[0.75rem] leading-4")}
                >
                  Open terminal
                </button>
              </div>
            )}
            <BuildLog log={log} inset className={cn("flex-none px-3 pb-3 text-[0.75rem] leading-5", phone ? "pt-3" : "pt-1")} />
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}

/** A deploy's details: where the program lives and what the deploy took, with the program id in the
 * sentence. "Test SOL" says in passing that the cost was free devnet money. Chosen over a receipt list
 * (labels and values) and a list of the deploy's steps: both said the same facts in more lines */
export function DeployDetails({ log, took, upgrade = false, built = false, phone }: { log: string[]; took: string; upgrade?: boolean; built?: boolean; phone: boolean }) {
  const id = `\`${shortKey(PROGRAM_ID)}\``
  const cost = (upgrade ? UPGRADE_COST : DEPLOY_COST).replace(" SOL", "")
  const what = upgrade ? "The upgrade" : built ? "The build and deploy" : "The deploy"
  const where = upgrade ? `Your program at ${id} now runs the new code.` : `Your program now lives on devnet at ${id}.`
  const time = took ? ` took ${took} and` : " took"
  return <PlainDetails text={`${where} ${what}${time} ${cost} test SOL from your wallet.`} copy={{ label: "Copy id", value: PROGRAM_ID }} log={log} phone={phone} />
}
