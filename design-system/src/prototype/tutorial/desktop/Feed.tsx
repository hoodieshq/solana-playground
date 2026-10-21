import { useLayoutEffect, useRef, useState, type RefObject } from "react"
import { ArrowUp } from "lucide-react"

import { Composer, ComposerInput, ComposerSend, ComposerToolbar } from "@/components/ui/composer"
import { cn } from "@/lib/utils"

import type { Chip } from "../data"
import { AssistantHead } from "../ui/AssistantHead"
import { Prose } from "../ui/Prose"
import { Typed } from "../ui/Typed"

export type Quote = { file: string; line: number; code: string }
export type Msg = { id: number; from: "assistant"; text: string; quote?: Quote } | { id: number; from: "you"; text: string }

// Replies that have finished typing. A step's conversation stays when you come back to it, and what
// was said then shouldn't type itself out again
const typed = new Set<number>()

const reduce = window.matchMedia("(prefers-reduced-motion: reduce)")
const EASE = "cubic-bezier(0.2, 0, 0, 1)"
// A question asked with a chip, on its way from the chip into the feed: the chip's box, and when.
// The bubble that lands takes it; until then the answer under it waits
const FLIGHT_MS = 240
let flight: { text: string; from: DOMRect; at: number } | null = null
const launch = (text: string, from: DOMRect) => {
  flight = { text, from, at: performance.now() }
}
const land = () => {
  const f = flight
  flight = null
  return f
}
const inFlight = () => flight !== null

/** The question's bubble, which arrives from the chip that asked it: it starts in the chip's box and
 * shape and settles into its own place (FLIP), so the chip reads as having become the question */
function Question({ text }: { text: string }) {
  const ref = useRef<HTMLParagraphElement>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el || flight?.text !== text) return
    const f = land()
    if (!f || performance.now() - f.at > 500 || reduce.matches) return
    // The column follows new messages to its foot. Done here first, so the place measured is the
    // one the bubble ends up in
    const scroller = el.closest<HTMLElement>("[data-feed-scroller]")
    if (scroller) scroller.scrollTop = scroller.scrollHeight
    const to = el.getBoundingClientRect()
    const dx = f.from.left - to.left
    const dy = f.from.top - to.top
    el.animate(
      [
        { transform: `translate(${dx}px, ${dy}px) scale(${f.from.width / to.width}, ${f.from.height / to.height})`, borderRadius: "9999px" },
        { transform: "none", borderRadius: getComputedStyle(el).borderRadius },
      ],
      { duration: FLIGHT_MS, easing: EASE }
    )
  }, [text])
  return (
    <p ref={ref} className="ml-auto w-fit max-w-[85%] origin-top-left rounded-panel bg-surface-raised px-3 py-2 text-body">
      {text}
    </p>
  )
}

/** What the assistant said on this step and what you asked, under the lesson. Explain lands here
 * too, so the code stays in view while you read it */
export function Feed({ msgs, resolved = false }: { msgs: Msg[]; resolved?: boolean }) {
  // An answer to a question still in flight waits for it to land before it types
  const landing = inFlight() && !reduce.matches
  if (msgs.length === 0) return null
  return (
    <div className="mt-6 flex flex-col gap-5 border-t border-border pt-5">
      {msgs.map((m, i) =>
        m.from === "you" ? (
          <Question key={m.id} text={m.text} />
        ) : (
          <div key={m.id} className="flex flex-col gap-2">
            {/* Replies in a row share one head, as a chat groups them */}
            {msgs[i - 1]?.from !== "assistant" && <AssistantHead />}
            {m.quote && (
              // Red while the error stands. Once the step passes it's history, so it goes quiet
              <div
                className={cn(
                  "rounded-control border px-3 py-2 font-mono text-[0.75rem]",
                  resolved ? "border-border bg-surface-panel text-muted-foreground" : "border-error/40 bg-error/10"
                )}
              >
                <span className="text-muted-foreground">
                  {m.quote.file}:{m.quote.line}
                </span>
                <div className="mt-0.5 break-words whitespace-pre-wrap text-syntax-plain">{m.quote.code}</div>
              </div>
            )}
            {/* The reading weight, the same as the lesson above it */}
            <p className="text-body font-read">
              {typed.has(m.id) ? (
                <Prose text={m.text} />
              ) : (
                <Typed key={m.id} text={m.text} delay={landing && i === msgs.length - 1 ? FLIGHT_MS : 0} onDone={() => typed.add(m.id)} />
              )}
            </p>
          </div>
        )
      )}
    </div>
  )
}

const FREE = "Free chat isn't connected in this prototype. Try a suggestion."

/** How many of a row's children fit inside it whole. The rest stay in the row, hidden, so the
 * count can grow again when the row widens or a chip before them goes. Measured by layout, not by
 * the box on screen, so a chip still sliding into place counts where it's going */
function useFits(row: RefObject<HTMLDivElement | null>, n: number) {
  const [fits, setFits] = useState(n)
  useLayoutEffect(() => {
    const el = row.current
    if (!el) return
    const measure = () => {
      const kids = [...el.children] as HTMLElement[]
      const i = kids.findIndex((k) => k.offsetLeft + k.offsetWidth > el.clientWidth + 0.5)
      setFits(i === -1 ? kids.length : i)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [row, n])
  return fits
}

/** The product's composer at the foot of the column, kept small: one line while it waits, the
 * full box with its toolbar once it's focused or holds text. Suggestions give the step's prepared
 * answers, one row of them, so the lesson above keeps the room */
export function AskBox({ placeholder, suggestions, onAsk }: { placeholder: string; suggestions: Chip[]; onAsk: (question: string, answer: string) => void }) {
  const [text, setText] = useState("")
  const [focused, setFocused] = useState(false)
  const open = focused || text !== ""
  const input = useRef<HTMLTextAreaElement>(null)
  const row = useRef<HTMLDivElement>(null)
  const fits = useFits(row, suggestions.length)

  // Where each chip stood before one was asked. Once the row has reflowed, every chip that moved
  // slides from there to its new place, so the row closes the gap instead of jumping
  const before = useRef<Map<string, number> | null>(null)
  useLayoutEffect(() => {
    const was = before.current
    const el = row.current
    if (!was || !el) return
    before.current = null
    for (const chip of el.children) {
      const from = was.get((chip as HTMLElement).dataset.label ?? "")
      if (from === undefined) continue
      const dx = from - chip.getBoundingClientRect().left
      if (Math.abs(dx) > 0.5) chip.animate([{ transform: `translateX(${dx}px)` }, { transform: "none" }], { duration: 200, easing: EASE })
    }
  })
  const pick = (chip: Chip, button: HTMLButtonElement) => {
    if (!reduce.matches && row.current) {
      launch(chip.label, button.getBoundingClientRect())
      before.current = new Map([...row.current.children].map((k) => [(k as HTMLElement).dataset.label ?? "", k.getBoundingClientRect().left]))
    }
    onAsk(chip.label, chip.answer)
  }
  return (
    // The column's 20px edge, and the same foot as the tutorial page's Start: 16 above, 20 at the sides and below
    <div className="shrink-0 border-t border-border px-5 pt-4 pb-5">
      {suggestions.length > 0 && (
        // Twice the gap between chips, so they read as suggestions, not part of the field. Positioned,
        // so the chips' offsets are measured from the row
        <div ref={row} className="relative mb-3 flex gap-1.5 overflow-hidden">
          {suggestions.map((c, i) => {
            const hidden = i >= fits
            return (
              <button
                key={c.label}
                type="button"
                data-label={c.label}
                onClick={(e) => pick(c, e.currentTarget)}
                tabIndex={hidden ? -1 : undefined}
                aria-hidden={hidden || undefined}
                className={cn(
                  "h-8 shrink-0 rounded-full border border-border-strong px-3 text-caption whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground pointer-coarse:h-11 pointer-coarse:px-4",
                  hidden && "invisible"
                )}
              >
                {c.label}
              </button>
            )
          })}
        </div>
      )}
      <Composer
        onFocus={() => setFocused(true)}
        onBlur={(e) => {
          if (e.currentTarget.contains(e.relatedTarget)) return
          setFocused(false)
          // The height it grew to while open would hold the one line open
          if (!text && input.current) input.current.style.height = ""
        }}
        onSubmit={() => {
          if (!text.trim()) return
          onAsk(text.trim(), FREE)
          setText("")
          // The composer sizes itself and greys Send out from its own input event, which clearing the
          // value from here doesn't fire. One after the render puts it back to one line and an empty box
          requestAnimationFrame(() => input.current?.dispatchEvent(new Event("input", { bubbles: true })))
        }}
        className={cn(!open && "flex-row items-center")}
      >
        {/* The same quieter hint as the search field */}
        <ComposerInput
          ref={input}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          // The on-screen keyboard's return key reads Send: Enter sends here
          enterKeyHint="send"
          className={cn("placeholder:text-muted-foreground/80!", !open && "min-h-10 pt-2.5 pb-2.5")}
        />
        <ComposerToolbar className={cn(!open && "py-1 pr-1")}>
          <ComposerSend className="pointer-coarse:size-11">
            <ArrowUp />
          </ComposerSend>
        </ComposerToolbar>
      </Composer>
    </div>
  )
}
