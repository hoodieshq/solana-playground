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

/** What the assistant said on this step and what you asked, under the lesson. Explain lands here
 * too, so the code stays in view while you read it */
export function Feed({ msgs, resolved = false }: { msgs: Msg[]; resolved?: boolean }) {
  if (msgs.length === 0) return null
  return (
    <div className="mt-6 flex flex-col gap-5 border-t border-border pt-5">
      {msgs.map((m, i) =>
        m.from === "you" ? (
          <p key={m.id} className="ml-auto w-fit max-w-[85%] rounded-panel bg-surface-raised px-3 py-2 text-body">
            {m.text}
          </p>
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
              {typed.has(m.id) ? <Prose text={m.text} /> : <Typed key={m.id} text={m.text} onDone={() => typed.add(m.id)} />}
            </p>
          </div>
        )
      )}
    </div>
  )
}

const FREE = "Free chat isn't connected in this prototype. Try a suggestion."

/** How many of a row's children fit inside it whole. The rest stay in the row, hidden, so the
 * count can grow again when the row widens or a chip before them goes */
function useFits(row: RefObject<HTMLDivElement | null>, n: number) {
  const [fits, setFits] = useState(n)
  useLayoutEffect(() => {
    const el = row.current
    if (!el) return
    const measure = () => {
      const edge = el.getBoundingClientRect().right
      const kids = [...el.children]
      const i = kids.findIndex((k) => k.getBoundingClientRect().right > edge + 0.5)
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
  return (
    // The column's 20px edge, and the same foot as the tutorial page's Start: 16 above, 20 at the sides and below
    <div className="shrink-0 border-t border-border px-5 pt-4 pb-5">
      {suggestions.length > 0 && (
        // Twice the gap between chips, so they read as suggestions, not part of the field
        <div ref={row} className="mb-3 flex gap-1.5 overflow-hidden">
          {suggestions.map((c, i) => {
            const hidden = i >= fits
            return (
              <button
                key={c.label}
                type="button"
                onClick={() => onAsk(c.label, c.answer)}
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
