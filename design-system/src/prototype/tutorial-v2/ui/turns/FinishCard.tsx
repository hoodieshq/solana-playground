import { useRef, useState } from "react"
import { ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { LESSON, NEXT_TUTORIAL } from "../../data"
import { useOpenTutorial } from "../../host"
import { LiveBigMemory } from "../MemoryCard"
import { LivePlayer } from "../PlayerCard"
import { LiveRecords } from "../RecordsCard"
import { useStore } from "../../store"
import { lastTx } from "../../tx"
import { FinishBadge, LearnedList } from "../FinishParts"
import { Prose } from "../Prose"
import { PrintedReceipt } from "../Receipt"
import { ACTION, ACTION_FILL, ACTION_SOFT, HEADING, PHONE_CTA, PHONE_STACK, READ_CODE, reducedMotion } from "../type"

/** The tutorial's end, as the last turn of the conversation: the badge, what came back from devnet
 * with the name in it, what was learned and two ways on, the next tutorial or
 * the list. Nothing sits in a card: the chat's column is the only frame. The receipt waits under one
 * quiet row: the headline already says what it proves, the full record is for whoever wants it, and
 * it prints in as it opens. It stays live: the composer and the Call panel keep working under it.
 * On a phone the two ways on stack at the full width, and the receipt scrolls up into view as it opens:
 * under the chips and the composer it printed in out of sight */
export function FinishCard({ phone = false }: { phone?: boolean }) {
  const { s, dispatch } = useStore()
  const openTutorial = useOpenTutorial()
  const tx = lastTx(s)
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
          {/* 28/32 at the headings' 500, as the step wins: the display size's regular and 32.2 line set it apart */}
          <h3 className="font-heading text-[1.75rem] leading-8 font-medium tracking-[-0.02em] text-foreground">{LESSON.headline}</h3>
          {/* The headline, then what came back, in the full text colour. No line of run facts under it: the
              steps are in the bar above and devnet is in the line itself */}
          {/* The reading text's size and face in the full text colour: at READ's 80% it was the note's grey */}
          {/* 9 under the headline, as under any heading */}
          <p className="mt-[9px] font-read text-[1rem] leading-[1.5rem] text-foreground">
            <Prose text={LESSON.proofLine(tx, s)} {...READ_CODE} />
          </p>
        </div>
        {/* A game's proof is its player, live: the energy ticking back with no transaction */}
        {LESSON.game && <LivePlayer phone={phone} />}
        {LESSON.memory && <LiveBigMemory phone={phone} />}
        {LESSON.records && <LiveRecords phone={phone} />}
        {/* A heading has 30 over it: the column's 24 and 6 of its own. 9 under it, to the list it heads */}
        <section aria-labelledby="learned-title" className="mt-1.5">
          <h4 id="learned-title" className={HEADING}>
            What you learned
          </h4>
          {/* The reading text, as the intro's How it goes: the list is the lesson's summary, not a side note.
              The tick on the first line's middle: (24 - 16) / 2 */}
          <LearnedList className="mt-[9px] gap-1.5 [&>li]:text-[1rem] [&>li]:leading-[1.5rem] [&>li]:text-foreground/80 [&>li>svg]:mt-1" />
        </section>
        {/* One way on, filled, and one way back beside it, as Claude Code pairs them */}
        <div className={cn("flex gap-2", phone ? PHONE_STACK : "flex-wrap")}>
          {/* The last tutorial of its level has no next one: the way back to the list is the only way on */}
          {NEXT_TUTORIAL && LESSON.next && (
            <Button className={cn(ACTION, ACTION_FILL, phone && PHONE_CTA)} onClick={() => openTutorial(LESSON.next!)}>
              Next: {NEXT_TUTORIAL.name}
            </Button>
          )}
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
          {/* The name alone: the signature and who paid are in the receipt it opens */}
          <span className="shrink-0 text-foreground">Transaction details</span>
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
