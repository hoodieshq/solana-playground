import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react"
import { ArrowDown, ArrowUp } from "lucide-react"

import { cn } from "@/lib/utils"

import { BEATS } from "../data"
import type { Ask } from "../lessons/types"
import { liveCard, useStore, type Turn } from "../store"
import { on } from "./events"
import { Journal } from "./Journal"
import { LOADED_AT, reducedMotion } from "./type"
import { ActCard } from "./turns/ActCard"
import { ApplyCard } from "./turns/ApplyCard"
import { AskCard } from "./turns/AskCard"
import { FinishCard } from "./turns/FinishCard"
import { IntroCard } from "./turns/IntroCard"
import { ResultCard } from "./turns/ResultCard"
import { Say } from "./turns/Say"
import { StepDivider } from "./turns/StepDivider"
import { WinCard } from "./turns/WinCard"
import { WroteCard } from "./turns/WroteCard"
import { YouPill } from "./turns/YouPill"

// Turns already on screen once, and says that finished typing: coming back to the tutorial finds
// them where they were, and nothing types or rises a second time
const shown = new Set<number>()
const typed = new Set<number>()

const isNew = (t: Turn) => t.at > LOADED_AT && !shown.has(t.id)

type Group = { kind: "assistant"; turns: Turn[] } | { kind: "you"; turn: Turn } | { kind: "anchor"; turn: Turn }

/** Consecutive assistant turns share one head, as a chat groups them; a divider or your pill ends a group */
function groups(thread: Turn[]): Group[] {
  const out: Group[] = []
  // The last question answered right and the option it took: that pick already shows in the folded
  // question, so its pill isn't repeated, even with a hint asked for in between
  let picked: string | null = null
  thread.forEach((t) => {
    // Once started the header names the tutorial, so the folded intro isn't shown
    if (t.kind === "intro" && t.done) return
    if (t.kind === "ask") {
      const ask = BEATS[t.beat] as Ask | undefined
      picked = t.done === "right" && ask ? ask.options[ask.answer] : null
    }
    if (t.kind === "you" && picked !== null && t.text === picked) {
      picked = null
      return
    }
    if (t.kind === "you" || t.kind === "anchor") {
      out.push({ kind: t.kind, turn: t })
      return
    }
    const last = out[out.length - 1]
    if (last?.kind === "assistant") last.turns.push(t)
    else out.push({ kind: "assistant", turns: [t] })
  })
  return out
}

/** A result that went through: these share the journal's box. A failure stands as its own card */
const journaled = (t: Turn) => t.kind === "result" && t.ok

/** A reply's turns with the results that follow each other gathered, each with where it starts */
function runs(turns: Turn[]) {
  const out: { ts: Turn[]; i: number }[] = []
  turns.forEach((t, i) => {
    const last = out[out.length - 1]
    if (last && journaled(t) && journaled(last.ts[0])) last.ts.push(t)
    else out.push({ ts: [t], i })
  })
  return out
}

/** Whether a turn stands 24 off the one before it in a reply, as text does after a listing. A listing
 * or a quoted line closes its text; a card closes its own, so text resuming after one starts a new
 * thought. Text into a card, and cards stacked as records, keep the reply's 15 */
const afterBlock = (prev: Turn | undefined, t: Turn) => {
  if (!prev) return false
  // An open quiz keeps its own 40 above (AskCard), counted from the 15
  if (t.kind === "ask" && t.done === null) return false
  if (prev.kind === "wrote") return true
  if (prev.kind === "say") return !!prev.quote && !prev.follow
  return t.kind === "say"
}

/** One turn's box. Whether it's new is read once, as it mounts, so a render a moment later doesn't
 * cut its rise or its typing short */
function Rise({ turn, className, children }: { turn: Turn; className?: string; children: (fresh: boolean) => ReactNode }) {
  const [fresh] = useState(() => isNew(turn))
  useEffect(() => {
    shown.add(turn.id)
  }, [turn.id])
  // With reduced motion a new turn still fades in, only nothing moves and nothing types: shown whole at
  // once, a reply landed with no sign it was new, and a fade is no motion to anyone who asked for less
  return <div className={cn(className, fresh && "animate-rise motion-reduce:animate-[pg-fade_240ms_var(--ease-out-value)_both]")}>{children(fresh)}</div>
}

/** The live card: the last one, since a finish stays live above a later nudge */
const liveIn = (el: HTMLElement) => {
  const all = el.querySelectorAll<HTMLElement>("[data-live-card]")
  return all.length ? all[all.length - 1] : null
}

/** A scroll of the feed in 320ms on the standard curve, the same however far it goes. The browser's
 * own smooth scroll takes longer the further it goes */
/** Marks which edges have text beyond them, for the fade there (prototype.css) */
function edges(el: HTMLElement) {
  el.toggleAttribute("data-more-above", el.scrollTop > 2)
  el.toggleAttribute("data-more-below", el.scrollHeight - el.scrollTop - el.clientHeight > 2)
}

function glide(el: HTMLElement, top: number) {
  const from = el.scrollTop
  const to = Math.max(0, Math.min(top, el.scrollHeight - el.clientHeight))
  if (reducedMotion() || Math.abs(to - from) < 2) {
    el.scrollTop = to
    return
  }
  const start = performance.now()
  // cubic-bezier(0.2, 0, 0, 1), close enough for a scroll
  const ease = (t: number) => 1 - Math.pow(1 - t, 4)
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / 320)
    el.scrollTop = from + (to - from) * ease(t)
    if (t < 1) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}

/** How far up the learner may read before the feed stops following new turns */
const FOLLOW_PX = 120

/** A step the bar asked to show: its heading lands 22px under the feed's top, as the first one sits and lights once */
export type Jump = { step: number; n: number } | null

/** The conversation, which is the lesson: the intro, a divider per step and the assistant's turns
 * under it, your pills between. Shared by desktop and phone. It follows new turns to the foot unless
 * you've scrolled up to read, says which step you're reading for the step bar, and shows Back to
 * step N while the live card is out of view */
export function Conversation({
  jump,
  onViewing,
  className,
  foot,
  phone = false,
}: {
  jump?: Jump
  onViewing?: (step: number | null) => void
  className?: string
  foot?: ReactNode
  /** The phone's deltas in the cards (spec 11): thumb sized rows and buttons, full width actions, no way to type the code */
  phone?: boolean
}) {
  const { s } = useStore()
  const scroller = useRef<HTMLDivElement>(null)
  const content = useRef<HTMLDivElement>(null)
  const near = useRef(true)
  // Before Start the intro reads from its top: nothing pulls the feed to the foot
  const started = useRef(s.started)
  started.current = s.started
  const [, setTick] = useState(0)
  const [liveOff, setLiveOff] = useState(false)
  // Which way the live card lies when it's out of view, so the pill's arrow points where it takes you
  const [liveAbove, setLiveAbove] = useState(false)
  const live = liveCard(s)
  // A finish already in the thread on open (a reload, a view switch) isn't an arrival: no glide
  const finishSeen = useRef(s.thread.some((t) => t.kind === "finish"))
  const finishHold = useRef(false)
  // Your next message after the finish lets the feed follow again
  const sent = s.thread.filter((t) => t.kind === "you").length
  useEffect(() => {
    finishHold.current = false
    if (content.current) content.current.style.paddingBottom = ""
  }, [sent])

  // Where the reading is: near the foot follows, further up stays put. And which step's divider is
  // the last one above the top of the view, for the step bar's "viewing" state
  useEffect(() => {
    const el = scroller.current
    if (!el) return
    const onScroll = () => {
      near.current = el.scrollHeight - el.scrollTop - el.clientHeight < FOLLOW_PX
      edges(el)
      const anchors = [...el.querySelectorAll<HTMLElement>("[data-step-anchor]")]
      const top = el.getBoundingClientRect().top + 60
      const above = anchors.filter((a) => a.getBoundingClientRect().top <= top)
      const at = above.length ? Number(above[above.length - 1].dataset.stepAnchor) : null
      // Reading another step only counts while the live card is out of view
      const card = liveIn(el)
      const box = el.getBoundingClientRect()
      const r = card?.getBoundingClientRect()
      const liveShown = !!r && r.bottom > box.top + 20 && r.top < box.bottom - 20
      onViewing?.(liveShown ? null : at)
    }
    onScroll()
    el.addEventListener("scroll", onScroll, { passive: true })
    return () => el.removeEventListener("scroll", onScroll)
  }, [onViewing])

  // New turns, and says typing out, grow the feed: it follows them while you're near the foot. The
  // finish is the exception: as it arrives its badge glides to the top of the view, so the moment is
  // read from its start, and the feed holds there while the receipt prints in under it, until you
  // send something
  useEffect(() => {
    const el = scroller.current
    const box = content.current
    if (!el || !box) return
    let height = box.offsetHeight
    // While the finish settles (step 4's win folds to a line above it as it lands) it's held to the
    // top on every resize; after that the feed is left where it is
    let settleUntil = 0
    const pin = (finish: HTMLElement, smooth: boolean) => {
      // Clear of the 32px fade the feed draws at its top once there's text above (prototype.css), with
      // the badge's glow, which spills past its box
      const top = finish.getBoundingClientRect().top - el.getBoundingClientRect().top + el.scrollTop - 48
      // A short finish leaves too little below it to reach the top: room is made under it, as a chat
      // leaves space under the newest message, and taken back with your next message
      box.style.paddingBottom = ""
      const short = top + el.clientHeight - el.scrollHeight
      if (short > 0) box.style.paddingBottom = `${short}px`
      if (smooth) glide(el, top)
      else el.scrollTop = top
    }
    const ro = new ResizeObserver(() => {
      const finish = box.querySelector<HTMLElement>("[data-finish]")
      if (finish && !finishSeen.current) {
        finishSeen.current = true
        finishHold.current = true
        settleUntil = performance.now() + 1200
        pin(finish, true)
      } else if (finish && finishHold.current && performance.now() < settleUntil) pin(finish, false)
      else if (box.offsetHeight > height && near.current && started.current && !finishHold.current) el.scrollTop = el.scrollHeight
      height = box.offsetHeight
      edges(el)
    })
    ro.observe(box)
    return () => ro.disconnect()
  }, [])

  // Opening the tutorial lands on the live card, or the foot. Before Start, on the intro's top
  useLayoutEffect(() => {
    const el = scroller.current
    if (!el) return
    const card = liveIn(el)
    if (!s.started) el.scrollTop = 0
    else if (card && card.offsetTop + card.offsetHeight > el.clientHeight) el.scrollTop = Math.max(0, card.offsetTop - el.clientHeight + card.offsetHeight + 24)
    else el.scrollTop = el.scrollHeight
    near.current = true
  }, [])

  // A step from the bar: its divider under the bar, lit once. Nothing resets
  useEffect(() => {
    const el = scroller.current
    if (!jump || !el) return
    const anchor = el.querySelector<HTMLElement>(`[data-step-anchor="${jump.step}"]`)
    if (!anchor) return
    // The feed's own top padding, so a jumped to heading sits where the first one does on load
    const top = anchor.getBoundingClientRect().top - el.getBoundingClientRect().top + el.scrollTop - 22
    near.current = false
    glide(el, top)
    anchor.classList.remove("pg-anchor-flash")
    void anchor.offsetWidth
    anchor.classList.add("pg-anchor-flash")
  }, [jump])

  // Whether the live card is in view, for Back to step N
  useEffect(() => {
    const el = scroller.current
    const card = el ? liveIn(el) : null
    if (!el || !card) {
      setLiveOff(false)
      return
    }
    const io = new IntersectionObserver(
      ([e]) => {
        setLiveOff(!e.isIntersecting)
        setLiveAbove(!!e.rootBounds && e.boundingClientRect.bottom <= e.rootBounds.top)
      },
      { root: el, threshold: 0.05 }
    )
    io.observe(card)
    return () => io.disconnect()
  })

  const toLive = () => {
    const el = scroller.current
    const card = el ? liveIn(el) : null
    if (!el || !card) return
    const top = card.getBoundingClientRect().top - el.getBoundingClientRect().top + el.scrollTop - Math.max(12, (el.clientHeight - card.offsetHeight) / 2)
    glide(el, top)
    near.current = true
    window.setTimeout(() => card.querySelector<HTMLElement>("button:not(:disabled), input")?.focus({ preventScroll: true }), 340)
  }
  useEffect(() => on("feed:live", toLive))

  // A call from the Call panel shows its result there, once: the chat carries only the step's win. An
  // act that ran gives way to its result right under it: one line per action, not a record and then a
  // card saying the same, and the time it took moves into the card. A grow or a chop keeps its card,
  // which is its result
  const chat = s.thread.filter((t) => !(t.kind === "result" && t.from === "test"))
  const feed = chat.filter(
    (t, i) => !(t.kind === "act" && t.state === "done" && !t.grows?.length && !t.chops?.length && chat[i + 1]?.kind === "result")
  )
  // What a run printed stays out while nothing has come back after it. The finish counts, since it
  // says the answer again; a win doesn't, so the answer stays over it
  const tail = [...feed].reverse().find((t) => t.kind === "result" || t.kind === "finish")?.id
  const latestOfKind = (t: Turn) => t.kind === "result" && t.id === tail

  const render = (t: Turn, fresh: boolean): ReactNode => {
    const keys = (k: typeof live) => live === k
    switch (t.kind) {
      case "intro":
        return <IntroCard phone={phone} />
      case "say": {
        const typing = fresh && !typed.has(t.id) && !reducedMotion()
        return (
          <Say
            turn={t}
            typing={typing}
            passed={s.passed[t.step] ?? false}
            phone={phone}
            onTyped={() => {
              typed.add(t.id)
              setTick((n) => n + 1)
            }}
          />
        )
      }
      case "ask":
        return (
          <div data-open-ask={t.done === null || undefined}>
            <AskCard turn={t} keys={keys("ask") && t.done === null} busy={s.phase !== "idle"} arriving={fresh} phone={phone} />
          </div>
        )
      case "wrote":
        return <WroteCard turn={t} phone={phone} />
      case "act":
        return <ActCard turn={t} phone={phone} />
      case "result":
        return <ResultCard turn={t} latest={!!latestOfKind(t)} phone={phone} />
      case "win":
        return <WinCard turn={t} phone={phone} />
      case "apply":
        return <ApplyCard turn={t} />
      case "finish":
        return <FinishCard phone={phone} />
      default:
        return null
    }
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div ref={scroller} data-feed data-feed-scroller className={cn("min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-[22px] pb-3", className)}>
        <div ref={content} role="log" aria-live="polite" aria-label="Conversation" className="flex flex-col gap-6">
          {groups(feed).map((g) =>
            g.kind === "you" ? (
              <Rise key={g.turn.id} turn={g.turn}>
                {() => g.turn.kind === "you" && <YouPill text={g.turn.text} code={g.turn.code} />}
              </Rise>
            ) : g.kind === "anchor" ? (
              // A step's heading belongs to the text under it, as Practicum's do: 30 above, 9 under,
              // where the turns around it stand 24 apart
              <Rise key={g.turn.id} turn={g.turn} className={cn("-mb-[15px]", g.turn.step > 0 && "mt-1.5")}>
                {() => <StepDivider step={g.turn.step} />}
              </Rise>
            ) : (
              // Paragraph to paragraph 15, Practicum's rhythm at 400px
              <div key={g.turns[0].id} className="flex flex-col gap-[15px]">
                {/* A file the assistant wrote out is the reply's listing: 9 under the text it follows, 24 over
                    what comes after it, as Practicum sets its code blocks. A quote or a card closes its text
                    the same way: at 15 a card under a quote read as stacked on it, and text after a card as
                    a caption to it */}
                {runs(g.turns).map(({ ts, i }) => {
                  const t = ts[0]
                  const at = cn(t.kind === "wrote" && i > 0 && "-mt-1.5", afterBlock(g.turns[i - 1], t) && "mt-[9px]")
                  // Results in a row share the journal's box: it rises with its first, a row added later
                  // rises on its own
                  return journaled(t) ? (
                    <Rise key={t.id} turn={t} className={at}>
                      {() => (
                        <Journal>
                          {ts.map((r, j) =>
                            j === 0 ? (
                              <div key={r.id}>{render(r, false)}</div>
                            ) : (
                              <Rise key={r.id} turn={r}>
                                {(fresh) => render(r, fresh)}
                              </Rise>
                            )
                          )}
                        </Journal>
                      )}
                    </Rise>
                  ) : (
                    <Rise key={t.id} turn={t} className={at}>
                      {(fresh) => render(t, fresh)}
                    </Rise>
                  )
                })}
              </div>
            )
          )}
          {foot}
        </div>
      </div>
      {/* After the finish there's no step to go back to: reading the receipt under it raised a pill that
          pointed at the end you were already at */}
      {liveOff && live !== null && s.finishedAt === null && (
        <button
          type="button"
          onClick={toLive}
          className={cn(
            "absolute bottom-3 left-1/2 z-10 flex h-7 -translate-x-1/2 animate-menu-in items-center gap-1 rounded-full border border-border-strong bg-surface-raised pr-3 pl-2.5 text-[0.75rem] font-act text-foreground shadow-panel",
            // A thumb's height on a phone, where it's the way back to the card that waits
            phone && "h-11 pr-4 pl-3.5 text-[0.8125rem]"
          )}
        >
          {liveAbove ? <ArrowUp className="size-3.5" aria-hidden="true" /> : <ArrowDown className="size-3.5" aria-hidden="true" />}
          {s.started ? `Back to step ${s.step + 1}` : "Back to the start"}
        </button>
      )}
    </div>
  )
}
