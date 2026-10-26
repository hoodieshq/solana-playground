import { useRef, useState } from "react"
import { ChevronRight, Play } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { NEXT_TUTORIAL, shortKey } from "../../data"
import { useStore } from "../../store"
import { lastTx } from "../../tx"
import { FinishBadge, LearnedList } from "../FinishParts"
import { Prose } from "../Prose"
import { PrintedReceipt } from "../Receipt"
import { ACTION, ACTION_FILL, ACTION_SOFT, HEADING, PHONE_CTA, READ, READ_CODE, reducedMotion } from "../type"

/** "6 min 40 s" from start to finish */
function span(from: number | null, to: number | null) {
  if (from === null || to === null) return null
  const t = Math.max(1, Math.round((to - from) / 1000))
  const m = Math.floor(t / 60)
  return m ? `${m} min ${t % 60} s` : `${t} s`
}

/* The intro card's scale, so the tutorial opens and closes in one voice: the display headline, headings
   at 16, the reading text at 15 and one grey note at 13. NOTE is joined as a plain string, never
   through cn, which would drop text-caption next to a colour */
const NOTE = "text-caption text-muted-foreground tabular-nums"

/** The tutorial's end, as the last turn of the conversation: the badge, what came back from devnet
 * with the name in it and how long it took, what was learned and two ways on, the next tutorial or
 * the list. Nothing sits in a card: the chat's column is the only frame. The receipt waits under one
 * quiet row: the headline already says what it proves, the full record is for whoever wants it, and
 * it prints in as it opens. It stays live: the composer and the Call panel keep working under it.
 * On a phone the two ways on stack at the full width, and the receipt scrolls up into view as it opens:
 * under the chips and the composer it printed in out of sight */
export function FinishCard({ phone = false }: { phone?: boolean }) {
  const { s, dispatch } = useStore()
  const tx = lastTx(s)
  const time = span(s.startedAt, s.finishedAt)
  const [receipt, setReceipt] = useState(false)
  const record = useRef<HTMLDivElement>(null)
  const toggle = () => {
    setReceipt(!receipt)
    if (phone && !receipt) requestAnimationFrame(() => record.current?.scrollIntoView({ block: "start", behavior: reducedMotion() ? "auto" : "smooth" }))
  }
  return (
    // data-finish: the feed glides this to the top of the view as it arrives. It doesn't pop itself, so
    // its box on screen is where it stands; the section inside does
    <div data-finish className="flex flex-col gap-6">
      <section data-live-card aria-label="Tutorial finished" className="flex animate-pop flex-col gap-6">
        {/* From the left edge, as the headline under it: the column would otherwise stretch it and centre the medal */}
        {/* On a phone the badge's glow spilled past the feed's edge and was cut: it steps in a little */}
        <FinishBadge className={cn("mx-0 self-start", phone && "ml-2")} />
        <div>
          <h3 className="font-heading text-display text-foreground">You built and called your first Solana program.</h3>
          <p className={`mt-2 ${READ}`}>
            <Prose text={`\`${tx.said}\` came back from devnet in a transaction Kora paid for.`} {...READ_CODE} />
          </p>
          <p className={`mt-2 ${NOTE}`}>4 steps · 0 SOL spent{time ? ` · ${time}` : ""}</p>
        </div>
        <section aria-labelledby="learned-title">
          <h4 id="learned-title" className={HEADING}>
            What you learned
          </h4>
          {/* The reading text, as the intro's How it goes: the list is the lesson's summary, not a side note */}
          <LearnedList className="mt-2 gap-1.5 [&>li]:text-[0.9375rem] [&>li]:leading-[1.6] [&>li]:text-foreground/80 [&>li>svg]:mt-[0.3rem]" />
        </section>
        {/* One way on, filled, and one way back beside it, as Claude Code pairs them */}
        <div className={cn("flex gap-2", phone ? "flex-col items-stretch" : "flex-wrap")}>
          <Button className={cn(ACTION, ACTION_FILL, phone && PHONE_CTA)} onClick={() => toast("Only Hello Anchor is in this prototype")}>
            <Play className="fill-current" />
            Next: {NEXT_TUTORIAL.name}
          </Button>
          <Button variant="ghost" className={cn(ACTION, ACTION_SOFT, phone && PHONE_CTA)} onClick={() => dispatch({ type: "open", screen: "gallery" })}>
            All tutorials
          </Button>
        </div>
      </section>

      <div ref={record} className={cn(phone && "scroll-mt-10")}>
        <button
          type="button"
          aria-expanded={receipt}
          onClick={toggle}
          className="group/rec flex min-h-11 w-full items-center gap-2 rounded-control border border-border px-3 text-left text-caption hover:border-border-strong"
        >
          <span className="shrink-0 text-foreground">Transaction details</span>
          <span className="min-w-0 truncate text-subtle">
            · <span className="font-mono">{shortKey(tx.signature)}</span> · 0 SOL
          </span>
          <ChevronRight
            aria-hidden="true"
            className={cn(
              "ml-auto size-3.5 shrink-0 text-subtle transition-transform duration-150 group-hover/rec:text-foreground motion-reduce:transition-none",
              receipt && "rotate-90"
            )}
          />
        </button>
        {receipt && <PrintedReceipt tx={tx} when={s.finishedAt} titled={false} className="mt-2" />}
      </div>
    </div>
  )
}
