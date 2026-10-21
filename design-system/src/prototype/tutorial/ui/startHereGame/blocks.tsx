import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react"

import { cn } from "@/lib/utils"

import { PROGRAM_ID, shortKey } from "../../data"
import { highlight } from "../CodeView"
import { EASE_OUT, reducedMotion } from "./motion"
import { CodeCard, ContextLine, Gutter, Reply } from "./parts"
import type { PlayProps } from "./types"

/* The block puzzle: the four lines every Anchor program starts from, as blocks. Each block's tab
   only fits the notch of its own slot, so a wrong one can't go in, and println! has msg!'s shape:
   the one block you have to read. The idea is the shape of a program: imports, its id, the
   #[program] module, and msg! inside it */

type Shape = "round" | "point" | "square" | "wave"
type Piece = { id: string; code: string; shape: Shape; color: string }

const PIECES: Record<string, Piece> = {
  use: { id: "use", code: "use anchor_lang::prelude::*;", shape: "round", color: "var(--syntax-keyword)" },
  id: { id: "id", code: `declare_id!("${shortKey(PROGRAM_ID, 4)}");`, shape: "point", color: "var(--syntax-type)" },
  program: { id: "program", code: "#[program]", shape: "square", color: "var(--brand-periwinkle)" },
  msg: { id: "msg", code: 'msg!("Hello, World!");', shape: "wave", color: "var(--brand-green)" },
  println: { id: "println", code: 'println!("Hello, World!");', shape: "wave", color: "var(--brand-green)" },
}

const SLOTS = [
  { piece: "use", hint: "imports", line: 1, indent: 0 },
  { piece: "id", hint: "program id", line: 2, indent: 0 },
  { piece: "program", hint: "program attribute", line: 3, indent: 0 },
  { piece: "msg", hint: "log line", line: 6, indent: 8 },
]

// The lines around the slots, there for context: after slot 3, and after slot 4
const AFTER: Record<number, [number, string][]> = {
  2: [
    [4, "pub mod hello_anchor {"],
    [5, "    pub fn hello(_ctx: Context<Hello>) -> Result<()> {"],
  ],
  3: [
    [7, "        Ok(())"],
    [8, "    }"],
    [9, "}"],
  ],
}

// The tray's order: shuffled once by hand, println! next to the block it imitates
const TRAY = ["msg", "use", "println", "program", "id"]

/** A block's tab, or a slot's notch when `notch`: four shapes on a 12 by 16 grid */
function Tab({ shape, color, notch = false }: { shape: Shape; color: string; notch?: boolean }) {
  const paint = notch ? { fill: "var(--surface-well)", stroke: color, strokeWidth: 1.25, strokeDasharray: "2 1.5" } : { fill: color }
  return (
    <svg viewBox="0 0 12 16" aria-hidden="true" className="pointer-events-none absolute top-1/2 -left-[7px] h-4 w-3 -translate-y-1/2 overflow-visible">
      {shape === "round" && <circle cx="6" cy="8" r="5" {...paint} />}
      {shape === "point" && <path d="M1 8 L11 2.5 L11 13.5 Z" strokeLinejoin="round" {...paint} />}
      {shape === "square" && <rect x="1.5" y="3.5" width="9" height="9" rx="1.5" {...paint} />}
      {shape === "wave" && (
        <>
          <circle cx="6" cy="4.5" r="3.25" {...paint} />
          <circle cx="6" cy="11.5" r="3.25" {...paint} />
        </>
      )}
    </svg>
  )
}

// A block's own colours: its hue faint over the raised grey, a firmer edge of it
const tint = (p: Piece): CSSProperties => ({
  backgroundColor: `color-mix(in oklab, ${p.color} 14%, var(--surface-raised))`,
  borderColor: `color-mix(in oklab, ${p.color} 45%, transparent)`,
})

export function BlocksGame({ onSolved, locked, announce }: PlayProps) {
  const helpId = useId()
  const [placed, setPlaced] = useState<Record<number, string>>({})
  const [held, setHeld] = useState<string | null>(null)
  const [misses, setMisses] = useState<Record<string, number>>({})
  const [reply, setReply] = useState<string | null>(null)
  const blocks = useRef<Record<string, HTMLButtonElement | null>>({})
  const slots = useRef<Record<number, HTMLButtonElement | null>>({})
  const card = useRef<HTMLDivElement>(null)
  // Where a block was the moment it fitted, to fly it from there into its slot
  const flight = useRef<{ piece: string; from: DOMRect } | null>(null)
  const drag = useRef<{ piece: string; x: number; y: number; moved: boolean; el: HTMLButtonElement } | null>(null)
  const dragged = useRef(false)

  const solved = SLOTS.every((s, i) => placed[i] === s.piece)
  const free = SLOTS.map((_, i) => i).filter((i) => placed[i] === undefined)
  const tray = TRAY.filter((p) => !Object.values(placed).includes(p))

  // Where the focus goes once the next render is in: the slot after a pick, the next block after a
  // fit, the block again after a miss. Kept for the effect below rather than a frame, which a
  // background tab may never run
  const pendingFocus = useRef<(() => HTMLElement | null | undefined) | null>(null)
  const focusSoon = (el: () => HTMLElement | null | undefined) => {
    pendingFocus.current = el
  }
  useEffect(() => {
    const el = pendingFocus.current?.()
    pendingFocus.current = null
    el?.focus({ preventScroll: true })
  })

  // A wrong block goes back where it came from, quickly and without a bounce
  const springBack = (el: HTMLElement) => {
    const from = el.style.transform
    el.style.transform = ""
    el.style.zIndex = ""
    if (!from || reducedMotion()) return
    el.animate([{ transform: from }, { transform: "none" }], { duration: 220, easing: EASE_OUT })
  }

  // The slot gives a small shake of its own, 3px, so it's the slot saying no, not the block
  const nudge = (slot: number) => {
    const el = slots.current[slot]
    if (!el || reducedMotion()) return
    el.animate([{ transform: "none" }, { transform: "translateX(3px)" }, { transform: "translateX(-2px)" }, { transform: "none" }], { duration: 220, easing: EASE_OUT })
  }

  const attempt = (piece: string, slot: number) => {
    const el = blocks.current[piece]
    if (placed[slot] !== undefined || !el) return
    const target = SLOTS[slot]
    setHeld(null)

    if (target.piece === piece) {
      flight.current = { piece, from: el.getBoundingClientRect() }
      const next = { ...placed, [slot]: piece }
      setPlaced(next)
      setReply(null)
      const left = SLOTS.filter((_, i) => next[i] === undefined).length
      if (left === 0) {
        onSolved("World")
        announce(`Placed in slot ${slot + 1}. All four are in, Run is ready.`)
        focusSoon(() => card.current?.closest("section")?.querySelector<HTMLElement>("[data-run]"))
      } else {
        announce(`Placed in slot ${slot + 1}. ${left} to go.`)
        focusSoon(() => blocks.current[TRAY.find((p) => p !== piece && !Object.values(next).includes(p)) ?? ""])
      }
      return
    }

    springBack(el)
    nudge(slot)
    let text: string
    if (piece === "println" && target.piece === "msg") {
      text = "Close. On Solana, msg! writes to the program log."
    } else {
      const miss = (misses[piece] ?? 0) + 1
      setMisses({ ...misses, [piece]: miss })
      const home = SLOTS.findIndex((s) => s.piece === piece)
      text = `Doesn't fit slot ${slot + 1}. Slot ${slot + 1} takes the ${target.hint}.`
      // Two misses with the same block, and its slot shows itself, so everyone gets to Run
      if (miss >= 2 && home !== -1) text += ` This one goes in slot ${home + 1}.`
    }
    setReply(text)
    announce(text)
    focusSoon(() => blocks.current[piece])
  }

  const pick = (piece: string) => {
    if (locked || solved) return
    if (held === piece) {
      setHeld(null)
      return
    }
    setHeld(piece)
    announce(`Picked ${PIECES[piece].code}. Choose a slot.`)
    focusSoon(() => slots.current[free[0]])
  }

  // A fitted block flies from where it was let go into its slot, and lands with a small settle
  useLayoutEffect(() => {
    const f = flight.current
    flight.current = null
    if (!f || reducedMotion()) return
    const el = card.current?.querySelector<HTMLElement>(`[data-placed="${f.piece}"]`)
    if (!el) return
    const to = el.getBoundingClientRect()
    el.animate([{ transform: `translate(${f.from.left - to.left}px, ${f.from.top - to.top}px)` }, { transform: "none" }], { duration: 240, easing: EASE_OUT })
  }, [placed])

  // Once all four are in, the blocks give way to plain numbered code: the program you built
  useLayoutEffect(() => {
    if (!solved || !card.current || reducedMotion()) return
    const runs = [...card.current.querySelectorAll<HTMLElement>("[data-built]")].map((row, i) =>
      row.animate([{ opacity: 0.2 }, { opacity: 1 }], { duration: 260, delay: i * 50, easing: EASE_OUT, fill: "backwards" })
    )
    return () => runs.forEach((r) => r.cancel())
  }, [solved])

  // The mouse can drag a block too. Touch taps instead, so a drag never fights the page's scroll
  const down = (e: PointerEvent<HTMLButtonElement>, piece: string) => {
    if (e.pointerType !== "mouse" || e.button !== 0 || locked) return
    drag.current = { piece, x: e.clientX, y: e.clientY, moved: false, el: e.currentTarget }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const move = (e: PointerEvent<HTMLButtonElement>) => {
    const d = drag.current
    if (!d) return
    const dx = e.clientX - d.x
    const dy = e.clientY - d.y
    if (!d.moved && Math.hypot(dx, dy) < 4) return
    d.moved = true
    d.el.style.transform = `translate(${dx}px, ${dy}px)`
    d.el.style.zIndex = "20"
  }
  const up = (e: PointerEvent<HTMLButtonElement>) => {
    const d = drag.current
    drag.current = null
    if (!d?.moved) return
    // The click that may follow a drag isn't a pick. Not every browser sends one after a drag, so
    // the flag clears itself once this event is over instead of waiting for it
    dragged.current = true
    setTimeout(() => (dragged.current = false), 0)
    const slot = free.find((i) => {
      const r = slots.current[i]?.getBoundingClientRect()
      return r && e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom
    })
    if (slot === undefined) springBack(d.el)
    else attempt(d.piece, slot)
  }

  const slotKeys = (e: KeyboardEvent, slot: number) => {
    if (e.key === "Escape" && held) {
      e.preventDefault()
      const back = held
      setHeld(null)
      announce("Put back")
      focusSoon(() => blocks.current[back])
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault()
      const at = free.indexOf(slot)
      const next = free[(at + (e.key === "ArrowDown" ? 1 : free.length - 1)) % free.length]
      slots.current[next]?.focus()
    }
  }

  const block = (p: Piece, props: { placed?: boolean } = {}) => (
    <span className="relative flex h-11 min-w-0 items-center rounded-control border pr-3 pl-4 whitespace-pre text-syntax-plain" style={tint(p)}>
      <Tab shape={p.shape} color={p.color} />
      <span className={cn("truncate", props.placed && "overflow-visible")}>{highlight(p.code)}</span>
    </span>
  )

  return (
    <div className="@container/blocks">
      <CodeCard reply={reply && <Reply>{reply}</Reply>}>
        <div ref={card} role="list" aria-label="Program slots">
          {SLOTS.map((s, i) => {
            const piece = placed[i] ? PIECES[placed[i]] : null
            const shown = PIECES[s.piece]
            // After two misses with this slot's own block, the slot shows itself in that block's colour
            const showMe = !piece && (misses[s.piece] ?? 0) >= 2
            return (
              <div key={i}>
                {solved ? (
                  <div data-built="" role="listitem" className="flex min-h-5 whitespace-pre text-syntax-plain">
                    <Gutter n={s.line} />
                    {/* One span: a flex row drops a text node of spaces on its own */}
                    <span>
                      {" ".repeat(s.indent)}
                      {highlight(shown.code)}
                    </span>
                  </div>
                ) : (
                  <div role="listitem" className="flex items-center py-0.5">
                    <Gutter n={s.line} />
                    <button
                      ref={(el) => {
                        slots.current[i] = el
                      }}
                      type="button"
                      tabIndex={held && !piece ? 0 : -1}
                      aria-disabled={!held || !!piece}
                      aria-label={piece ? `Slot ${i + 1}: ${piece.code}` : `Slot ${i + 1}, ${s.hint}, empty${showMe ? ", your block goes here" : ""}`}
                      onClick={() => held && !piece && attempt(held, i)}
                      onKeyDown={(e) => slotKeys(e, i)}
                      // The indent gives way on a narrow phone, so the slot keeps room for its words. The
                      // highlight that helps after two misses: the block's colour on a solid edge, and the
                      // words in the slot say it too
                      style={{ marginLeft: `min(${s.indent}ch, 18%)`, ...(showMe && { borderColor: shown.color, borderStyle: "solid" }) }}
                      className={cn(
                        "relative flex min-h-11 min-w-0 flex-1 items-center rounded-control text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                        !piece && "border border-dashed pl-4 transition-colors duration-150 motion-reduce:transition-none",
                        !piece && (held ? "border-border-strong bg-surface-raised/40" : "border-border"),
                        held && !piece && "cursor-pointer"
                      )}
                    >
                      {piece ? (
                        <span data-placed={piece.id} className="flex min-w-0 flex-1">
                          {block(piece, { placed: true })}
                        </span>
                      ) : (
                        <>
                          {/* The notch in its block's colour, dimmer until it's the one to look at */}
                          <Tab shape={shown.shape} color={showMe ? shown.color : `color-mix(in oklab, ${shown.color} 55%, var(--border-strong))`} notch />
                          <span className="truncate text-muted-foreground">
                            <span className="text-syntax-comment">//</span> {showMe ? `${s.hint}: this one` : s.hint}
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                )}
                {AFTER[i]?.map(([n, code]) => (
                  <div key={n} data-built="">
                    <ContextLine n={n}>{code}</ContextLine>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      </CodeCard>

      {!solved && (
        <>
          <p id={helpId} className="sr-only">
            Pick a block, then a slot. With a keyboard, Enter picks a block, the arrow keys move between slots, Enter puts it in and Escape puts it back.
          </p>
          {/* A row that scrolls sideways on a phone, a wrapping tray where there's room */}
          <ul
            aria-label="Blocks"
            aria-describedby={helpId}
            className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pt-1 pb-2 pl-3 @min-[20rem]/blocks:flex-wrap @min-[20rem]/blocks:overflow-visible"
          >
            {tray.map((id) => {
              const p = PIECES[id]
              return (
                <li key={id} className="shrink-0">
                  <button
                    ref={(el) => {
                      blocks.current[id] = el
                    }}
                    type="button"
                    disabled={locked}
                    aria-pressed={held === id}
                    onClick={() => {
                      if (dragged.current) {
                        dragged.current = false
                        return
                      }
                      pick(id)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Escape" && held === id) {
                        setHeld(null)
                        announce("Put back")
                      }
                    }}
                    onPointerDown={(e) => down(e, id)}
                    onPointerMove={move}
                    onPointerUp={up}
                    onPointerCancel={(e) => {
                      drag.current = null
                      springBack(e.currentTarget)
                    }}
                    className={cn(
                      "relative block rounded-control font-mono text-[0.75rem]/[1.25rem] outline-none transition-transform duration-220 ease-standard select-none focus-visible:ring-2 focus-visible:ring-ring/60 motion-reduce:transition-none pointer-fine:cursor-grab!",
                      held === id && "-translate-y-0.5 ring-2 ring-[var(--ring-color)]"
                    )}
                    style={{ "--ring-color": p.color } as CSSProperties}
                  >
                    {block(p)}
                  </button>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </div>
  )
}
