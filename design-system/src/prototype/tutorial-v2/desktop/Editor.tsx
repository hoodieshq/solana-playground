import { useEffect, useRef, type CSSProperties, type KeyboardEvent, type MouseEvent, type ReactNode } from "react"

import { cn } from "@/lib/utils"

import { highlight } from "../ui/CodeView"

/** A plain editor for the prototype: a textarea over highlighted code, both in the same font and
 * line height, so the caret lands on the letters. The product uses Monaco, as client-v2 does.
 * `written` are the lines the assistant just wrote: green until the next action, and arriving lit
 * one after another each time `arrive` changes (on the write, and on Show in). `landing` is where an
 * open question's answer will go: a dashed purple edge, with a ghost line on an empty one that isn't
 * part of the file. `jump` scrolls a line to a third of the height and can put the caret there.
 * `error` is the line a failed build points at, with a wavy line under the token the compiler named;
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
      const at = jump.line > all.length ? el.value.length : start + (all[line - 1]?.match(/^\s*/)?.[0].length ?? 0)
      el.focus({ preventScroll: true })
      el.setSelectionRange(at, at)
    }
    const height = parseFloat(getComputedStyle(el).lineHeight)
    const top = jump.top ? 0 : Math.max(0, (jump.line - 1) * height - scroller.clientHeight / 3)
    // No move if the line is already in the middle part of the view
    const y = (jump.line - 1) * height
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

  // Tab writes four spaces, as Rust is indented here. Esc, then Tab leaves the editor, as in
  // CodeMirror, so the keyboard can still reach the buttons
  const escaped = useRef(false)
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    const leaving = escaped.current
    escaped.current = e.key === "Escape"
    if (e.key !== "Tab" || e.shiftKey || locked || leaving) return
    e.preventDefault()
    const el = e.currentTarget
    const at = el.selectionStart
    onChange?.(code.slice(0, at) + "    " + code.slice(el.selectionEnd))
    requestAnimationFrame(() => {
      el.selectionStart = el.selectionEnd = at + 4
    })
  }

  const order = (n: number) => written.indexOf(n)

  return (
    // min-w-0, or the editor grows to its longest line and the page scrolls sideways on a narrow
    // workspace (a portrait tablet), instead of the code scrolling inside its own column
    <div className="relative flex min-h-0 min-w-0 flex-1 flex-col bg-(--code-ground)">
      {chip && (
        <div data-editor-chip className="pointer-events-none absolute top-3 right-4 z-10 [&>*]:pointer-events-auto">
          {chip}
        </div>
      )}
      <div
        ref={box}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseLeave={() => point(null)}
        className={cn(
          "flex min-h-0 flex-1 flex-col overflow-auto overscroll-contain py-2 font-mono text-code leading-[1.6] transition-opacity duration-150 has-[textarea:focus-visible]:ring-1 has-[textarea:focus-visible]:ring-ring/50 has-[textarea:focus-visible]:ring-inset",
          busy && "opacity-60"
        )}
      >
        {/* 58px before the code, numbers and marks */}
        <div className="grid min-w-max flex-1 grid-cols-[58px_1fr]">
          <div aria-hidden="true" className="pr-6 text-right text-subtle select-none">
            {rows.map((_, i) => (
              <div key={i} className={cn(written.includes(i + 1) && "text-muted-foreground", i >= lines.length && "opacity-60")}>
                {i + 1}
              </div>
            ))}
          </div>
          <div className="relative">
            <pre ref={pre} aria-hidden="true" className="m-0 font-mono text-code leading-[1.6] whitespace-pre text-syntax-plain">
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
                      k !== -1 && "border-foreground/25",
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
            {error && token && (
              <span
                key={`${error.line}:${from}:${token}`}
                aria-hidden="true"
                style={{ top: `calc(${error.line - 1} * 1lh)`, left: `${from}ch` }}
                className="pg-squiggle pointer-events-none absolute font-mono text-code leading-[1.6] whitespace-pre text-transparent underline decoration-error decoration-wavy decoration-1 underline-offset-[3px] [text-decoration-skip-ink:none]"
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
              wrap="off"
              style={{ height: `calc(${rows.length} * 1lh)` }}
              className="absolute inset-x-0 top-0 m-0 min-h-full w-full resize-none overflow-hidden bg-transparent p-0 font-mono text-code leading-[1.6] whitespace-pre text-transparent caret-foreground outline-none selection:bg-primary/30 placeholder:font-sans placeholder:text-caption placeholder:text-subtle read-only:cursor-default"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
