import * as React from "react"
import { Check, ChevronDown, Copy, ExternalLink } from "lucide-react"
import { Collapsible as CollapsiblePrimitive } from "radix-ui"
import { cn } from "@/lib/utils"

import { Prose } from "@/components/ui/prose"
import { useScrollEdges } from "@/hooks/use-scroll-edges"

/* A result's details in plain words, as the assistant would say them: one
   sentence of what happened with the one key it names in a code chip, then
   one row of quiet controls (copy that key and open it in Explorer on the
   left, the log's toggle on the right), and the raw log shut behind it in a
   well of its own. The deploy card and a sent transaction's card share it,
   so every result reads the same way. It replaces the receipt lines under a
   result: a list of labels and values said the same facts in more lines.

   text     the sentence, `ticks` around the key: "Your program now lives on
            devnet at `9hJqVk…zWxCvB`."
   copy     the key the row copies, with its label ("Copy id"). Without it
            the row holds only the log's toggle
   explorer the key on an explorer
   onOpenTerminal  the way to the whole output, at the well's top right.
            The terminal is a desktop panel, so it is not shown under a
            finger
   quiet    the sentence in the controls' own 14/20 and grey, for a tool
            panel such as the Call form, where the account above it is the
            answer and the cost a footnote. At reading size it was the
            loudest text there */

const QUIET =
  "inline-flex items-center gap-1.5 rounded-sm whitespace-nowrap text-[0.875rem] leading-[1.125rem] text-muted-foreground outline-none transition-colors duration-150 ease-standard hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring pointer-coarse:min-h-11 motion-reduce:transition-none"

/* A line the program itself logged, other than Anchor's own "Instruction:"
   line: what msg! said, in the text's ink on a plate inside the well. Run
   edge to edge, a band near the panel's own colour cut the small well in two */
const said = (line: string) =>
  line.startsWith("Program log: ") && !line.startsWith("Program log: Instruction:") && !line.startsWith("Program log: AnchorError")

function tone(line: string) {
  if (line.startsWith("error")) return "text-error"
  if (/successful|finished$|success$/i.test(line)) return "text-success"
  if (said(line)) return "-mx-1.5 rounded-[4px] bg-foreground/[0.08] px-1.5 text-foreground"
  return "text-muted-foreground"
}

function ResultDetails({
  className,
  text,
  copy,
  explorer,
  log,
  onOpenTerminal,
  defaultLogOpen = false,
  quiet = false,
  ...props
}: Omit<React.ComponentProps<"div">, "children"> & {
  text: string
  copy?: { label: string; value: string }
  explorer?: string
  log: string[]
  onOpenTerminal?: () => void
  defaultLogOpen?: boolean
  quiet?: boolean
}) {
  const [logOpen, setLogOpen] = React.useState(defaultLogOpen)
  const [copied, setCopied] = React.useState(false)
  const [scroller] = useScrollEdges<HTMLPreElement>([logOpen, log])
  const well = React.useRef<HTMLDivElement>(null)
  const opened = React.useRef(defaultLogOpen)

  // A log opened by a tap is brought into view once it has unfolded: under a sheet's pinned button or a
  // feed's end it opened out of sight and the tap seemed to do nothing. Nearest, so a log already in view
  // doesn't move the page; one open from the start stays where the page put it
  React.useEffect(() => {
    if (!logOpen || opened.current === logOpen) {
      opened.current = logOpen
      return
    }
    opened.current = logOpen
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const t = window.setTimeout(() => well.current?.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" }), 220)
    return () => window.clearTimeout(t)
  }, [logOpen])

  // "Copied" stands in for the label long enough to be read, then the action is offered again
  React.useEffect(() => {
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
    // Under a finger the last row is already a thumb's height, so it gives back some of the card's 12 under it
    <div data-slot="result-details" className={cn("pointer-coarse:-mb-2", className)} {...props}>
      <p className={quiet ? "text-[0.875rem] leading-5 text-pretty text-muted-foreground" : "text-[1rem] leading-[1.5rem] font-read text-pretty text-foreground/80"}>
        <Prose text={text} />
      </p>

      {/* One row under the sentence, 8 below it, never wrapping: what you can do with the key on the
          left, the log's toggle pushed right. Two rows of alike controls made the eye zigzag and
          didn't say which went with what */}
      <CollapsiblePrimitive.Root open={logOpen} onOpenChange={setLogOpen}>
        <div className="mt-2 flex items-center gap-4 pointer-coarse:mt-0">
          {copy && (
            <button type="button" onClick={onCopy} className={QUIET}>
              {copied ? <Check aria-hidden="true" className="size-3.5" /> : <Copy aria-hidden="true" strokeWidth={1.75} className="size-3.5" />}
              <span aria-live="polite">{copied ? "Copied" : copy.label}</span>
            </button>
          )}
          {explorer && (
            <a href={explorer} target="_blank" rel="noreferrer" className={QUIET}>
              <ExternalLink aria-hidden="true" strokeWidth={1.75} className="size-3.5" />
              {/* "Explorer" alone, the arrow says it leaves: "View in Explorer" beside "Copy signature"
                  broke both labels in two in a 270px column */}
              Explorer
            </a>
          )}
          {/* The raw output, for the curious: shut by default, so the sentence stays the answer */}
          <CollapsiblePrimitive.Trigger className={cn(QUIET, "group/result-details-log ml-auto")}>
            Log
            <ChevronDown
              aria-hidden="true"
              className="size-3.5 shrink-0 transition-transform duration-150 ease-standard group-data-[state=open]/result-details-log:rotate-180 motion-reduce:transition-none"
            />
          </CollapsiblePrimitive.Trigger>
        </div>
        <CollapsiblePrimitive.Content className="overflow-hidden duration-200 ease-standard data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down motion-reduce:animate-none">
          {/* A well of its own, 12 under the controls, a step more than the 8 above them: on the card's
              ground the output read as more of the card's text. Lines keep to one row and scroll, fading
              at the edge, so a program id isn't broken under a hanging indent */}
          <div ref={well} className="mt-3 scroll-mb-4 overflow-hidden rounded-[6px] bg-surface-well pointer-coarse:mt-1">
            {onOpenTerminal && (
              <div className="flex justify-end px-3 pt-2 pointer-coarse:hidden">
                <button type="button" title="Terminal ⌘J" onClick={onOpenTerminal} className={cn(QUIET, "text-[0.75rem] leading-4")}>
                  Open terminal
                </button>
              </div>
            )}
            <pre
              ref={scroller}
              className={cn(
                "fade-edges overflow-x-auto px-3 pt-3 pb-3 font-mono text-[0.75rem] leading-5 whitespace-pre [--fade-size:1.5rem]",
                onOpenTerminal && "pt-1 pointer-coarse:pt-3"
              )}
            >
              {log.map((line, i) => (
                <div key={i} className={tone(line)}>
                  {line}
                </div>
              ))}
            </pre>
          </div>
        </CollapsiblePrimitive.Content>
      </CollapsiblePrimitive.Root>
    </div>
  )
}

export { ResultDetails }
