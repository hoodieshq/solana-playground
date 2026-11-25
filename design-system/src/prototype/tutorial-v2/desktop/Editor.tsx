import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type MouseEvent, type PointerEvent, type ReactNode, type RefObject } from "react"

import { cn } from "@/lib/utils"

import { highlight } from "../ui/CodeView"

/** A plain editor for the prototype: a textarea over highlighted code, both in the same font and
 * line height, so the caret lands on the letters. The product uses Monaco, as client-v2 does.
 * `written` are the lines the assistant just wrote: green until the next action, and arriving lit
 * one after another each time `arrive` changes (on the write, and on Show in). `landing` is where an
 * open question's answer will go: a dashed purple edge, with a ghost line on an empty one that isn't
 * part of the file. `jump` scrolls a line to a third of the height and can put the caret there.
 * `wrap` soft wraps long lines, for the phone, where a line cut off at the edge can't be read; a wrapped
 * line's number keeps to its first row. `minimap` draws the file an eighth of its size at the right, as
 * Monaco's (on by default unless wrapped, Almaz 25 Nov). `error` is the line a failed build points at, with a wavy line under the token the compiler named;
 * `lit` lights it while its compiler line is hovered. `chip` floats over the code's top right */
export type EditorError = { line: number; column?: number; span?: number }

export function Editor({
  code,
  onChange,
  readOnly = false,
  busy = false,
  error = null,
  lit = false,
  onPoint,
  written = [],
  arrive = 0,
  landing = null,
  placeholder,
  label,
  jump = null,
  chip,
  wrap = false,
  minimap = !wrap,
}: {
  code: string
  onChange?: (code: string) => void
  readOnly?: boolean
  busy?: boolean
  error?: EditorError | null
  lit?: boolean
  onPoint?: (line: number | null) => void
  written?: number[]
  arrive?: number
  landing?: { lines: number[]; ghost: boolean } | null
  placeholder?: string
  label: string
  jump?: { line: number; at: number; caret?: boolean; top?: boolean } | null
  chip?: ReactNode
  wrap?: boolean
  minimap?: boolean
}) {
  const lines = code.split("\n")
  // A ghost line below the end of the file: the rows up to it show, numbered, but aren't text
  const ghostAt = landing?.ghost ? landing.lines[0] : null
  const extra = ghostAt !== null && ghostAt > lines.length ? ghostAt - lines.length : 0
  const rows = [...lines, ...Array.from({ length: extra }, () => "")]
  const box = useRef<HTMLDivElement>(null)
  const area = useRef<HTMLTextAreaElement>(null)
  const locked = readOnly || busy

  useEffect(() => {
    const el = area.current
    const scroller = box.current
    if (!jump || !el || !scroller) return
    if (jump.caret && !locked) {
      const all = el.value.split("\n")
      const line = Math.min(jump.line, all.length)
      const start = all.slice(0, line - 1).reduce((n, row) => n + row.length + 1, 0)
      // On the line the compiler named, the caret goes where it pointed; elsewhere, to the first letter
      const lead = all[line - 1]?.match(/^\s*/)?.[0].length ?? 0
      const col = error && error.line === line && error.column ? Math.min(error.column - 1, all[line - 1]?.length ?? 0) : lead
      const at = jump.line > all.length ? el.value.length : start + col
      el.focus({ preventScroll: true })
      el.setSelectionRange(at, at)
    }
    const height = parseFloat(getComputedStyle(el).lineHeight)
    // A wrapped line above takes more than one row: the line's own row says where it starts
    const row = pre.current?.children[jump.line - 1] as HTMLElement | undefined
    const y = row ? row.offsetTop : (jump.line - 1) * height
    const top = jump.top ? 0 : Math.max(0, y - scroller.clientHeight / 3)
    // No move if the line is already in the middle part of the view
    const inView = y >= scroller.scrollTop + 16 && y <= scroller.scrollTop + scroller.clientHeight - 48
    if (!jump.top && inView) return
    scroller.scrollTo({ top, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jump?.at])

  // Which line the pointer is over, worked out from its height, since the textarea covers them all.
  // Only the error line is worth telling the terminal about
  const pre = useRef<HTMLPreElement>(null)
  const pointed = useRef<number | null>(null)
  const point = (to: number | null) => {
    if (pointed.current === to) return
    pointed.current = to
    onPoint?.(to)
  }
  const onMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const el = pre.current
    if (!error || !el) return point(null)
    const height = parseFloat(getComputedStyle(el).lineHeight)
    const n = Math.floor((e.clientY - el.getBoundingClientRect().top) / height) + 1
    point(n === error.line ? n : null)
  }

  // Where the underline goes: the token the compiler named, or the line's code from its first letter
  const bad = error ? (lines[error.line - 1] ?? "") : ""
  const from = error?.column ? error.column - 1 : (bad.match(/^\s*/)?.[0].length ?? 0)
  const token = error?.span ? bad.slice(from, from + error.span) : bad.slice(from).trimEnd()

  // The textarea covers the code, the blank space under it included. A press on the line numbers
  // lands in it too, so anywhere in the editor is a place to start typing
  const onMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    if (locked || e.target === area.current) return
    if ((e.target as HTMLElement).closest("[data-editor-chip]")) return
    e.preventDefault()
    area.current?.focus()
  }

  // Tab writes four spaces, as Rust is indented here. Enter keeps the line's indent, and one more
  // after an opening brace. Esc leaves the editor for its frame, so Tab goes on to the buttons and
  // plain Enter is the page's again (Start, Next)
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape") {
      e.preventDefault()
      box.current?.focus({ preventScroll: true })
      return
    }
    if (locked || e.altKey || e.metaKey || e.ctrlKey || e.nativeEvent.isComposing) return
    const el = e.currentTarget
    const at = el.selectionStart
    const insert = (text: string) => {
      e.preventDefault()
      onChange?.(code.slice(0, at) + text + code.slice(el.selectionEnd))
      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = at + text.length
      })
    }
    if (e.key === "Tab" && !e.shiftKey) insert("    ")
    else if (e.key === "Enter" && !e.shiftKey) {
      const before = code.slice(code.lastIndexOf("\n", at - 1) + 1, at)
      const indent = before.match(/^\s*/)?.[0] ?? ""
      insert("\n" + indent + (/\{\s*$/.test(before) ? "    " : ""))
    }
  }

  const order = (n: number) => written.indexOf(n)

  // Wrapped, a line can take several rows: each number stands as tall as its line, read off the code
  const [tall, setTall] = useState<number[] | null>(null)
  useLayoutEffect(() => {
    const el = pre.current
    if (!wrap || !el) return setTall(null)
    const measure = () => setTall(Array.from(el.children, (c) => (c as HTMLElement).offsetHeight))
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [wrap, code, extra])

  return (
    // min-w-0, or the editor grows to its longest line and the page scrolls sideways on a narrow
    // workspace (a portrait tablet), instead of the code scrolling inside its own column
    <div className="relative flex min-h-0 min-w-0 flex-1 flex-col bg-(--code-ground)">
      {chip && (
        <div data-editor-chip className="pointer-events-none absolute top-3 right-4 z-10 [&>*]:pointer-events-auto">
          {chip}
        </div>
      )}
      <div className="flex min-h-0 flex-1">
      <div
        ref={box}
        tabIndex={-1}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseLeave={() => point(null)}
        className={cn(
          "flex min-h-0 min-w-0 flex-1 flex-col overflow-auto overscroll-contain py-2 font-mono outline-none focus-visible:ring-1 focus-visible:ring-ring/50 focus-visible:ring-inset text-code leading-5 transition-opacity duration-150 has-[textarea:focus-visible]:ring-1 has-[textarea:focus-visible]:ring-ring/50 has-[textarea:focus-visible]:ring-inset",
          busy && "opacity-60"
        )}
      >
        {/* 58px before the code, numbers and marks */}
        <div className={cn("grid flex-1", wrap ? "min-w-0 grid-cols-[58px_minmax(0,1fr)]" : "min-w-max grid-cols-[58px_1fr]")}>
          <div aria-hidden="true" className="pr-6 text-right text-subtle select-none">
            {rows.map((_, i) => (
              <div key={i} style={tall?.[i] ? { height: tall[i] } : undefined} className={cn(written.includes(i + 1) && "text-muted-foreground", i >= lines.length && "opacity-60")}>
                {i + 1}
              </div>
            ))}
          </div>
          <div className="relative">
            <pre ref={pre} aria-hidden="true" className={cn("m-0 font-mono text-code leading-5 text-syntax-plain", wrap ? "whitespace-pre-wrap [overflow-wrap:anywhere]" : "whitespace-pre")}>
              {rows.map((line, i) => {
                const n = i + 1
                const k = order(n)
                const lands = landing?.lines.includes(n)
                return (
                  <div
                    key={k === -1 ? i : `${i}:${arrive}`}
                    style={k === -1 ? undefined : ({ "--i": k } as CSSProperties)}
                    className={cn(
                      // The tint runs under the line, the text stays where the textarea's is (margin = border + padding)
                      "-ml-2.5 border-l-2 border-transparent pr-8 pl-2 transition-colors duration-150 ease-standard motion-reduce:transition-none",
                      lands && "border-dashed border-border-strong",
                      // The lines a link went to keep a soft ground, no bar: a bar beside one line read as a
                      // stray thick line (Almaz, 10 Nov)
                      k !== -1 && "bg-foreground/[0.05]",
                      k !== -1 && arrive > 0 && "pg-arrive",
                      error?.line === n && "border-error bg-error/10",
                      error?.line === n && lit && "bg-error/20"
                    )}
                  >
                    {highlight(line)}
                    {lands && landing?.ghost && line === "" && <span className="font-sans text-caption text-subtle select-none">Your answer lands here</span>}
                    {line === "" && "​"}
                  </div>
                )
              })}
            </pre>
            {/* The compiler's squiggle, drawn in once per failure: the token's own letters, transparent,
                carry the underline, so it sits exactly under them in the same font */}
            {error && token && !wrap && (
              <span
                key={`${error.line}:${from}:${token}`}
                aria-hidden="true"
                style={{ top: `calc(${error.line - 1} * 1lh)`, left: `${from}ch` }}
                className="pg-squiggle pointer-events-none absolute font-mono text-code leading-5 whitespace-pre text-transparent underline decoration-error decoration-wavy decoration-1 underline-offset-[3px] [text-decoration-skip-ink:none]"
              >
                {token}
              </span>
            )}
            <textarea
              ref={area}
              value={code}
              readOnly={locked}
              onChange={(e) => onChange?.(e.target.value)}
              onKeyDown={onKeyDown}
              aria-label={label}
              placeholder={landing?.ghost ? undefined : placeholder}
              spellCheck={false}
              autoCapitalize="off"
              autoComplete="off"
              autoCorrect="off"
              wrap={wrap ? "soft" : "off"}
              style={{ height: wrap ? "100%" : `calc(${rows.length} * 1lh)` }}
              className={cn(
                "absolute inset-x-0 top-0 m-0 min-h-full w-full resize-none overflow-hidden bg-transparent p-0 font-mono text-code leading-5 text-transparent caret-foreground outline-none selection:bg-primary/30 placeholder:font-sans placeholder:text-caption placeholder:text-subtle read-only:cursor-default",
                // The pre's lines keep 32 clear at their right: wrapped, the textarea breaks at the same place
                wrap ? "pr-8 whitespace-pre-wrap [overflow-wrap:anywhere]" : "whitespace-pre"
              )}
            />
          </div>
        </div>
      </div>
      {minimap && <Minimap rows={rows} scroller={box} />}
      </div>
    </div>
  )
}

/** The minimap's scale: a 20px line is 2.5px, a 72px column shows 576px of code across */
const MAP_SCALE = 1 / 8

/** The file at an eighth of its size beside the code, in its own colours, as Monaco's minimap (the product
 * has one): its shape tells where you are in it. The light band is the part on screen, shown once the file
 * is taller than the view; a press or a drag on the map scrolls the code there */
function Minimap({ rows, scroller }: { rows: string[]; scroller: RefObject<HTMLDivElement | null> }) {
  const [v, setV] = useState({ top: 0, view: 0, total: 0 })
  useEffect(() => {
    const el = scroller.current
    if (!el) return
    const sync = () => setV({ top: el.scrollTop, view: el.clientHeight, total: el.scrollHeight })
    sync()
    el.addEventListener("scroll", sync, { passive: true })
    const ro = new ResizeObserver(sync)
    ro.observe(el)
    if (el.firstElementChild) ro.observe(el.firstElementChild)
    return () => {
      el.removeEventListener("scroll", sync)
      ro.disconnect()
    }
  }, [scroller])
  const seek = (e: PointerEvent<HTMLDivElement>) => {
    const el = scroller.current
    if (!el) return
    el.scrollTop = (e.clientY - e.currentTarget.getBoundingClientRect().top) / MAP_SCALE - el.clientHeight / 2
  }
  return (
    <div
      aria-hidden="true"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        seek(e)
      }}
      onPointerMove={(e) => e.buttons === 1 && seek(e)}
      className="relative w-[72px] shrink-0 overflow-hidden select-none"
    >
      <pre style={{ transform: `scale(${MAP_SCALE})` }} className="pointer-events-none m-0 origin-top-left py-2 pl-3 font-mono text-code leading-5 whitespace-pre text-syntax-plain opacity-70">
        {rows.map((line, i) => (
          <div key={i}>
            {highlight(line)}
            {line === "" && "​"}
          </div>
        ))}
      </pre>
      {v.total > v.view + 1 && <div style={{ top: v.top * MAP_SCALE, height: v.view * MAP_SCALE }} className="pointer-events-none absolute inset-x-0 bg-foreground/[0.07]" />}
    </div>
  )
}
