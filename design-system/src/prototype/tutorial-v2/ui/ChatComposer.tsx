import { useEffect, useRef, useState } from "react"
import { ArrowUp } from "lucide-react"

import { Composer, ComposerInput, ComposerSend, ComposerToolbar } from "@/components/ui/composer"
import { cn } from "@/lib/utils"

import { CHANGE_CHIP, EXPLAIN_STEP, NEXT_CHIP, STUCK } from "../answers"
import { LESSON, STEPS } from "../data"
import { LimitNotice } from "../desktop/navLit/LimitNotice"
import { liveFail, liveWin, useStore, type State } from "../store"
import { ChipRow } from "./ChipRow"
import { on } from "./events"
import { launch } from "./turns/YouPill"

/** The chips for the moment, in order (spec 6.6): after a failure the step's error chips, otherwise
 * its own, then Explain this step; I'm stuck always last. None while a run goes or a win is live,
 * and a chip already asked in the step isn't offered again */
export function chipsFor(s: State): string[] {
  if (!s.started) return []
  if (s.phase !== "idle" || liveWin(s)) return []
  if (s.thread.some((t) => t.kind === "finish")) return LESSON.story ? [CHANGE_CHIP, NEXT_CHIP] : [NEXT_CHIP]
  // During the lesson the card in front of you is the one thing to do: no suggestions beside it
  if (s.started) return []
  const step = STEPS[s.step]
  const failed = !!liveFail(s) || s.cursor[s.step].fail
  const asked = new Set(s.thread.filter((t) => t.kind === "you" && t.step === s.step).map((t) => (t.kind === "you" ? t.text : "")))
  const list = failed && step.errorChips ? [...step.errorChips.map((c) => c.label), EXPLAIN_STEP] : [...step.chips.map((c) => c.label), EXPLAIN_STEP]
  return [...list.filter((c) => !asked.has(c)), STUCK]
}

/** What the field says, for where the tutorial is */
function placeholderFor(s: State) {
  if (s.awaiting === "story") return "Type what hello should say"
  if (!s.started) return "Ask anything"
  if (s.phase !== "idle") return s.phase === "building" || s.phase === "deploying" ? "Ask while it builds" : "Ask while it runs"
  if (s.thread.some((t) => t.kind === "finish")) return "Ask anything"
  // A question waiting on you is the thing to do: the field offers itself as the other way
  if (s.thread.some((t) => t.kind === "ask" && t.done === null)) return "Or ask about this step"
  return "Ask about this step"
}

// Whether a pointer is down right now, anywhere on the page
let pressing = false
window.addEventListener("pointerdown", () => (pressing = true), { capture: true })
window.addEventListener("pointerup", () => (pressing = false), { capture: true })
window.addEventListener("pointercancel", () => (pressing = false), { capture: true })

/** The one way to talk to the assistant: the chips for the moment and the product's composer under
 * them, one line with Send beside it until the words outgrow it, then the full box. Enter sends, Shift+Enter is a
 * new line, and it's never disabled. Chips that don't fit fold into More */
export function ChatComposer({ phone = false }: { phone?: boolean }) {
  const { s, dispatch } = useStore()
  const [text, setText] = useState("")
  const [focused, setFocused] = useState(false)
  // Focus alone moves nothing: Send jumped down on a press (Almaz, 6 Nov). The box opens once the words
  // outgrow the line and stays open until it's empty, or a line that fits the wider box would flip it
  const [open, setOpen] = useState(false)
  const input = useRef<HTMLTextAreaElement>(null)
  const chips = chipsFor(s)
  const placeholder = placeholderFor(s)

  useEffect(() => on("composer:focus", () => input.current?.focus()), [])

  // The answers point at where things are, and that differs on a phone
  const send = (q: string) => dispatch({ type: "ask", text: q, phone })
  const pick = (label: string, button?: HTMLElement) => {
    if (button) launch(label, button.getBoundingClientRect())
    send(label)
  }

  return (
    // In the tablet frame the screen already keeps 20 clear for the home bar, so nothing more: the field
    // ends where the desktop's does, 20 from the edge. 20 more left 40 under it (Almaz, 10 Nov)
    <div className={cn("shrink-0 pt-3", phone ? "px-4 pb-[calc(var(--safe-bottom)+12px)]" : "px-5 pb-5 [html.framed_&]:pb-0")}>
      {!phone && <LimitNotice className="mb-3" />}
      {/* On a phone the chips scroll sideways under a fade at the right edge, and go while the
          keyboard is up: the field needs the room */}
      {!(phone && focused) && <ChipRow chips={chips} phone={phone} onPick={pick} />}
      <Composer
        onFocus={() => setFocused(true)}
        onBlur={(e) => {
          if (e.currentTarget.contains(e.relatedTarget)) return
          // Folding back to one line moves everything above it. A press elsewhere blurs the field
          // on its way down, so the fold waits for the press to end: the button under the pointer
          // stays where it was pressed, and its click lands
          const fold = () => {
            if (input.current === document.activeElement) return
            setFocused(false)
            // The height it grew to while open would hold the one line open
            if (!input.current?.value && input.current) input.current.style.height = ""
          }
          // A tap blurs it later, on the mouse events a touch sends after it lifts: by then the press
          // is over, so the fold waits for the click that follows in the same task
          if (pressing) window.addEventListener("pointerup", () => requestAnimationFrame(fold), { once: true })
          else window.setTimeout(fold, 0)
        }}
        onSubmit={() => {
          if (!text.trim()) return
          send(text.trim())
          setText("")
          setOpen(false)
          // The composer sizes itself and greys Send out from its own input event, which clearing the
          // value from here doesn't fire. One after the render puts it back to one line and an empty box
          requestAnimationFrame(() => input.current?.dispatchEvent(new Event("input", { bubbles: true })))
        }}
        className={cn(!open && "flex-row items-center")}
      >
        <ComposerInput
          ref={input}
          value={text}
          onChange={(e) => {
            const v = e.target.value
            setText(v)
            if (!v) setOpen(false)
            else if (!open && (v.includes("\n") || e.target.scrollHeight > 46)) setOpen(true)
          }}
          placeholder={placeholder}
          aria-label={placeholder}
          enterKeyHint="send"
          // Four lines at most on a phone, then it scrolls
          // A 22 line, not 15 × 1.5: 22.5 made the box 44.5 tall, half a pixel off every edge under it
          className={cn("leading-6 placeholder:text-muted-foreground/80!", !open && "min-h-10 pt-2.5 pb-2.5", !open && phone && "min-h-11", phone && "max-h-[calc(4lh+1.25rem)]")}
        />
        <ComposerToolbar className={cn(!open && "py-1 pr-1")}>
          <ComposerSend className="pointer-coarse:size-11 disabled:bg-surface-hover disabled:text-subtle disabled:opacity-100">
            <ArrowUp />
          </ComposerSend>
        </ComposerToolbar>
      </Composer>
    </div>
  )
}
