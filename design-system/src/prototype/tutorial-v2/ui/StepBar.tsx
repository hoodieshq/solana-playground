import { Fragment, useEffect, useRef, useState } from "react"

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

import { STEPS } from "../data"
import { liveAsk, useStore } from "../store"
import { NAV_ICONS } from "./navIcons"

/** How far through the tutorial: the passed steps, and the live step's share by its beats done */
export function progress(s: ReturnType<typeof useStore>["s"]) {
  const done = s.passed.filter(Boolean).length
  if (!s.started || done === STEPS.length) return done / STEPS.length
  const step = STEPS[s.step]
  const total = step.beats.length + (s.cursor[s.step].fail ? (step.onFail?.length ?? 0) : 0) + 1
  const at = Math.max(0, s.cursor[s.step].at - (liveAsk(s) ? 1 : 0)) + (s.cursor[s.step].fail ? step.beats.length : 0)
  return (done + Math.min(0.9, at / total)) / STEPS.length
}

/** A step's mark, all in greys: its number on a grey disc, a lighter disc while current, a check
 * once done. No mark for a deploy that's behind lib.rs: the chat says so where Build and deploy is.
 * The bar and the phone's steps drawer share it. `className` lets the drawer lift a disc off its grey panel */
export function StepGlyph({ i, done, current, looking = false, className }: { i: number; done: boolean; current: boolean; looking?: boolean; className?: string }) {
  return (
    <span
      className={cn(
        // A filled disc with room round the figure, as Vercel numbers its steps: no ring, only tone
        "relative grid size-5 shrink-0 place-items-center rounded-full text-[0.6875rem] font-act lining-nums tabular-nums leading-none",
        done ? "bg-surface-hover text-muted-foreground" : current ? "bg-foreground/20 text-foreground" : "bg-surface-hover text-subtle",
        // The step being read back: a thin ring round the disc itself, round on round, never a box under it
        looking && "text-foreground ring-1 ring-foreground/45 ring-offset-2 ring-offset-background",
        className
      )}
    >
      {done ? <span className="flex size-3 [&>svg]:size-full">{NAV_ICONS.check}</span> : i + 1}
    </span>
  )
}

/** The tutorial's four steps across the top of the chat, and the anchors into it: a done or current
 * step scrolls the conversation back to its divider, nothing resets. The step you're reading, when
 * it isn't the live one, has its disc ringed. No lines round the bar: the feed's fade parts it from the text */
export function StepBar({ viewing, onPick }: { viewing: number | null; onPick: (step: number) => void }) {
  const { s } = useStore()
  const bar = useRef<HTMLElement>(null)
  // Under 380px of chat the labels go, and each segment names itself in a tip
  const [narrow, setNarrow] = useState(false)
  useEffect(() => {
    const el = bar.current
    if (!el) return
    // The bar's whole width, padding in, so it reads as the chat's width: 400 at 1280 keeps them
    const ro = new ResizeObserver(() => setNarrow(el.offsetWidth < 380))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <nav ref={bar} aria-label="Tutorial steps" className="relative flex h-10 shrink-0 items-center px-3">
      {STEPS.map((step, i) => {
        const done = s.passed[i]
        const current = s.started && i === s.step && !done
        const reached = s.started && (done || i <= s.step)
        const looking = viewing !== null && viewing === i && viewing !== s.step && s.started
        const segment = (
          <button
            type="button"
            disabled={!reached}
            onClick={() => onPick(i)}
            aria-current={looking ? "location" : current ? "step" : undefined}
            aria-label={`Step ${i + 1}, ${step.title}${done ? ", done" : ""}`}
            className={cn(
              "relative flex h-7 shrink-0 items-center gap-1.5 rounded-[6px] px-2 text-[0.8125rem] font-label transition-colors duration-100 outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-border-strong disabled:cursor-default motion-reduce:transition-none",
              done ? "text-muted-foreground hover:text-foreground" : current || looking ? "text-foreground" : "text-subtle"
            )}
          >
            <StepGlyph i={i} done={done} current={current} looking={looking} />
            {!narrow && <span>{step.short}</span>}
          </button>
        )
        return (
          <Fragment key={step.id}>
            {/* Without labels the four marks span the chat, edge to edge with the text: only the lines between them stretch */}
            {i > 0 && (
              <span
                aria-hidden="true"
                className={cn("h-px min-w-2 flex-1 transition-colors duration-200", !narrow && "max-w-6", s.passed[i - 1] ? "bg-border-strong" : "bg-border")}
              />
            )}
            {narrow ? (
              <Tooltip>
                <TooltipTrigger asChild>{segment}</TooltipTrigger>
                <TooltipContent side="bottom">
                  Step {i + 1} · {step.title}
                </TooltipContent>
              </Tooltip>
            ) : (
              segment
            )}
          </Fragment>
        )
      })}
    </nav>
  )
}
