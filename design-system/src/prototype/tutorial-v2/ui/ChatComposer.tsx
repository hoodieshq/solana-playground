import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { ArrowUp, ChevronDown } from "lucide-react"

import { Composer, ComposerInput, ComposerSend, ComposerToolbar } from "@/components/ui/composer"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

import { CHANGE_CHIP, EXPLAIN_STEP, NEXT_CHIP, STUCK } from "../answers"
import { LESSON, STEPS } from "../data"
import { liveFail, liveWin, useStore, type State } from "../store"
import { on } from "./events"
import { launch } from "./turns/YouPill"

const CHIP =
  "h-6 shrink-0 rounded-full border border-border-strong px-2.5 text-[0.75rem] whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground outline-none focus-visible:outline-2 focus-visible:outline-brand-purple pointer-coarse:h-11 pointer-coarse:px-4"

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

const MORE_W = 68

// Whether a pointer is down right now, anywhere on the page
let pressing = false
window.addEventListener("pointerdown", () => (pressing = true), { capture: true })
window.addEventListener("pointerup", () => (pressing = false), { capture: true })
window.addEventListener("pointercancel", () => (pressing = false), { capture: true })

/** The one way to talk to the assistant: the chips for the moment and the product's composer under
 * them, one line at rest, the full box once focused or holding text. Enter sends, Shift+Enter is a
 * new line, and it's never disabled. Chips that don't fit fold into More */
export function ChatComposer({ phone = false }: { phone?: boolean }) {
  const { s, dispatch } = useStore()
  const [text, setText] = useState("")
  const [focused, setFocused] = useState(false)
  const open = focused || text !== ""
  const input = useRef<HTMLTextAreaElement>(null)
  const row = useRef<HTMLDivElement>(null)
  const chips = chipsFor(s)
  const placeholder = placeholderFor(s)
  const [fits, setFits] = useState(chips.length)
  // Where More sits: right after the last chip that shows
  const [moreAt, setMoreAt] = useState(0)

  useEffect(() => on("composer:focus", () => input.current?.focus()), [])

  // How many chips fit whole beside More; all of them when they fit without it
  const key = chips.join("|")
  useLayoutEffect(() => {
    const el = row.current
    if (!el || phone) return
    const measure = () => {
      const kids = [...el.querySelectorAll<HTMLElement>("[data-chip]")]
      const room = el.clientWidth
      const end = (k: HTMLElement) => k.offsetLeft + k.offsetWidth
      if (kids.every((k) => end(k) <= room + 0.5)) return setFits(kids.length)
      const i = kids.findIndex((k) => end(k) > room - MORE_W)
      const n = i === -1 ? kids.length : i
      setFits(n)
      setMoreAt(n > 0 ? end(kids[n - 1]) + 6 : 0)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [key, phone])

  // The answers point at where things are, and that differs on a phone
  const send = (q: string) => dispatch({ type: "ask", text: q, phone })
  const pick = (label: string, button?: HTMLElement) => {
    if (button) launch(label, button.getBoundingClientRect())
    send(label)
  }
  const hidden = phone ? [] : chips.slice(fits)

  return (
    <div className={cn("shrink-0 pt-3", phone ? "px-4 pb-[calc(var(--safe-bottom)+12px)]" : "px-5 pb-5")}>
      {/* On a phone the chips scroll sideways under a fade at the right edge, and go while the
          keyboard is up: the field needs the room */}
      {chips.length > 0 && !(phone && focused) && (
        <div
          ref={row}
          className={cn("relative mb-3 flex gap-1.5", phone ? "-mx-4 overflow-x-auto px-4 [scrollbar-width:none] mask-r-from-[calc(100%-2.5rem)]" : "overflow-hidden")}
        >
          {chips.map((c, i) => {
            const out = !phone && i >= fits
            return (
              <button
                key={c}
                type="button"
                data-chip
                onClick={(e) => pick(c, e.currentTarget)}
                tabIndex={out ? -1 : undefined}
                aria-hidden={out || undefined}
                // Kept in the row, unseen, so the row can measure it again when it widens
                className={cn(CHIP, out && "invisible")}
              >
                {c}
              </button>
            )
          })}
          {hidden.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger style={{ left: moreAt }} className={cn(CHIP, "absolute top-0 flex items-center gap-1 bg-surface-base")}>
                More
                <ChevronDown className="size-3" aria-hidden="true" />
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="min-w-52">
                {hidden.map((c) => (
                  <DropdownMenuItem key={c} onSelect={() => pick(c)} className="text-[0.8125rem]">
                    {c}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      )}
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
          // The composer sizes itself and greys Send out from its own input event, which clearing the
          // value from here doesn't fire. One after the render puts it back to one line and an empty box
          requestAnimationFrame(() => input.current?.dispatchEvent(new Event("input", { bubbles: true })))
        }}
        className={cn(!open && "flex-row items-center")}
      >
        <ComposerInput
          ref={input}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          enterKeyHint="send"
          // Four lines at most on a phone, then it scrolls
          className={cn("placeholder:text-muted-foreground/80!", !open && "min-h-10 pt-2.5 pb-2.5", !open && phone && "min-h-11", phone && "max-h-[calc(4lh+1.25rem)]")}
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
