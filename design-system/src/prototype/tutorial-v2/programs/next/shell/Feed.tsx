import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react"

import { cn } from "@/lib/utils"

import { Journal } from "../../../ui/Journal"
import { reducedMotion } from "../../../ui/type"
import { busy, liveTurn, type Act, type Project, type Turn } from "../../store"
import { ActCard } from "./ActCard"
import { OpeningCard } from "./Opening"
import { ReadDone, StopAnswer } from "./Read"
import { JOURNAL, Result } from "./Results"
import { Assistant, Intro, MilestoneTurn, User } from "./Talk"
import { stepOf } from "./util"

/** Marks which edges have text beyond them, for the fade there (prototype.css) */
function edges(el: HTMLElement) {
  el.toggleAttribute("data-more-above", el.scrollTop > 2)
  el.toggleAttribute("data-more-below", el.scrollHeight - el.scrollTop - el.clientHeight > 2)
}

/** A scroll in 320ms on the standard curve, as the lesson's feed glides */
export function glide(el: HTMLElement, top: number) {
  const from = el.scrollTop
  const to = Math.max(0, Math.min(top, el.scrollHeight - el.clientHeight))
  if (reducedMotion() || Math.abs(to - from) < 2) {
    el.scrollTop = to
    return
  }
  const start = performance.now()
  const ease = (t: number) => 1 - Math.pow(1 - t, 4)
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / 320)
    el.scrollTop = from + (to - from) * ease(t)
    if (t < 1) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}

/** What a run going without a live card is: a head Build, Deploy or a panel call after the Guide is done */
function runningAct(p: Project): Act {
  if (p.calling) return p.calling.ix === "client.ts" ? "run" : "call"
  return p.deploy.s === "running" || p.chain ? "deploy" : "build"
}

function TurnView({ p, t, live }: { p: Project; t: Turn; live: boolean }) {
  switch (t.k) {
    case "intro":
      return <Intro p={p} />
    case "act":
      return live ? <ActCard p={p} act={t.act} retry={t.retry} /> : null
    case "user":
      return <User t={t} />
    case "assistant":
      return <Assistant p={p} t={t} />
    case "stop":
      return <StopAnswer p={p} t={t} />
    case "milestone":
      return p.read ? <ReadDone p={p} /> : <MilestoneTurn p={p} />
    default:
      return <Result p={p} t={t} />
  }
}

/** The turns that show, with records that follow each other gathered into one run. An act card that
 * was answered shows nothing, so it doesn't part them */
function runs(p: Project, live: Turn | null) {
  const out: Turn[][] = []
  for (const t of p.feed) {
    if (t.k === "act" && t !== live) continue
    // While it comes in from GitHub only the intro shows, the import's card under it
    if (p.opening && t.k !== "intro") continue
    const last = out[out.length - 1]
    if (last && JOURNAL.includes(t.k) && JOURNAL.includes(last[0].k)) last.push(t)
    else out.push([t])
  }
  return out
}

/** The Guide's one thread: the intro, the live card, results, your questions and the answers, in order.
 * It follows the newest turn to the foot. An act card that was answered leaves no card: its result is
 * its record */
export function Feed({ p, scroller }: { p: Project; scroller: RefObject<HTMLDivElement | null> }) {
  const content = useRef<HTMLDivElement>(null)
  const live = liveTurn(p)
  // Turns from before this mount render whole; newer ones rise in
  const [mountedAt] = useState(() => p.feed.reduce((n, t) => Math.max(n, t.id), 0))
  const near = useRef(true)

  // To the foot on landing, at once
  useLayoutEffect(() => {
    const el = scroller.current
    if (!el) return
    el.scrollTop = el.scrollHeight
    edges(el)
  }, [scroller])

  // A new turn: the feed goes to it
  const count = p.feed.length
  useEffect(() => {
    const el = scroller.current
    if (!el) return
    near.current = true
    requestAnimationFrame(() => glide(el, el.scrollHeight))
  }, [count, scroller])

  // A card that grows while it runs (the deploy's stages) keeps the foot in view, unless you scrolled up to read
  useEffect(() => {
    const el = scroller.current
    const box = content.current
    if (!el || !box) return
    const onScroll = () => {
      near.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120
      edges(el)
    }
    el.addEventListener("scroll", onScroll, { passive: true })
    const ro = new ResizeObserver(() => {
      if (near.current) el.scrollTop = el.scrollHeight
      edges(el)
    })
    ro.observe(box)
    return () => {
      el.removeEventListener("scroll", onScroll)
      ro.disconnect()
    }
  }, [scroller])

  const loose = busy(p) && !live

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div ref={scroller} data-feed-scroller className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-5 pb-4">
        <div ref={content} role="log" aria-live="polite" aria-label="Guide" className="flex flex-col gap-4">
          {runs(p, live).map((ts) => {
            const rise = (t: Turn) => t.id > mountedAt && "animate-rise motion-reduce:animate-none"
            const turn = (t: Turn, rises = true) => (
              <div key={t.id} data-turn={t.id} data-step={stepOf(t) ?? undefined} className={cn("scroll-mt-4", rises && rise(t))}>
                <TurnView p={p} t={t} live={t === live} />
              </div>
            )
            // Records in a row share the journal's box, each still its own turn inside it: the box rises
            // with its first, a row added later rises on its own
            return JOURNAL.includes(ts[0].k) ? (
              <div key={ts[0].id} className={cn(rise(ts[0]))}>
                <Journal>{ts.map((t, i) => turn(t, i > 0))}</Journal>
              </div>
            ) : (
              turn(ts[0])
            )
          })}
          {p.opening && <OpeningCard p={p} />}
          {loose && !p.opening && (
            <div data-step={runningAct(p) === "deploy" ? "deploy" : runningAct(p) === "build" ? "build" : "call"} className="animate-rise motion-reduce:animate-none">
              <ActCard p={p} act={runningAct(p)} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
