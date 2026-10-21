import { useEffect, useRef, type KeyboardEvent, type MouseEvent } from "react"

import { cn } from "@/lib/utils"

import { highlight } from "../ui/CodeView"

/** A plain editor for the prototype: a textarea over highlighted code, both in the same font and
 * line height, so the caret lands on the letters. The product uses Monaco, as client-v2 does.
 * `fresh` lines are the ones the last patch added, `focus` where a change will land. `jump` scrolls to
 * a line and puts the caret at its start, once: `onJumped` hands it back, so an editor that mounts
 * again later (after a patch closes) doesn't take the focus a second time. A jump with `caret: false`
 * only scrolls: on a tablet the caret would bring up the keyboard over the code. `placeholder` fills
 * an empty file until the first character. `error` is the line a failed build points at, and the
 * token on it when the compiler names one: a wavy underline draws in under it, left to right, as the
 * failure comes in. `lit` lights the line while its compiler line in the terminal is hovered, and
 * `onPoint` says when the pointer is over the error line, so the terminal can light its own */
export type EditorError = { line: number; column?: number; span?: number }

export function Editor({
  code,
  onChange,
  readOnly = false,
  dim = false,
  error = null,
  lit = false,
  onPoint,
  fresh = [],
  focus = [],
  hint,
  placeholder,
  label,
  jump = null,
  onJumped,
}: {
  code: string
  onChange?: (code: string) => void
  readOnly?: boolean
  dim?: boolean
  error?: EditorError | null
  lit?: boolean
  onPoint?: (line: number | null) => void
  fresh?: number[]
  focus?: number[]
  hint?: string
  placeholder?: string
  label: string
  jump?: { line: number; n: number; caret?: boolean } | null
  onJumped?: () => void
}) {
  const lines = code.split("\n")
  const box = useRef<HTMLDivElement>(null)
  const area = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = area.current
    if (!jump || !el || !box.current) return
    if (jump.caret !== false) {
      const rows = el.value.split("\n")
      const start = rows.slice(0, jump.line - 1).reduce((n, row) => n + row.length + 1, 0)
      const at = start + (rows[jump.line - 1]?.match(/^\s*/)?.[0].length ?? 0)
      el.focus({ preventScroll: true })
      el.setSelectionRange(at, at)
    }
    // The line a third of the way down, so what's above it stays in view
    const height = parseFloat(getComputedStyle(el).lineHeight)
    box.current.scrollTo({ top: Math.max(0, (jump.line - 1) * height - box.current.clientHeight / 3), behavior: "smooth" })
    onJumped?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jump])

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
    if (readOnly || e.target === area.current) return
    e.preventDefault()
    area.current?.focus()
  }

  // Tab writes four spaces, as Rust is indented here. Esc, then Tab leaves the editor, as in
  // CodeMirror, so the keyboard can still reach the buttons under it
  const escaped = useRef(false)
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    const leaving = escaped.current
    escaped.current = e.key === "Escape"
    if (e.key !== "Tab" || e.shiftKey || readOnly || leaving) return
    e.preventDefault()
    const el = e.currentTarget
    const at = el.selectionStart
    onChange?.(code.slice(0, at) + "    " + code.slice(el.selectionEnd))
    requestAnimationFrame(() => {
      el.selectionStart = el.selectionEnd = at + 4
    })
  }

  return (
    <div ref={box} onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseLeave={() => point(null)} className={cn("flex min-h-0 flex-1 flex-col overflow-auto overscroll-contain py-2 font-mono text-code leading-[1.6] has-[textarea:focus-visible]:ring-1 has-[textarea:focus-visible]:ring-inset has-[textarea:focus-visible]:ring-ring/50", dim && "opacity-60")}>
      {/* 58px before the code, the same as the diff's line edge, numbers and marks, so code doesn't shift when a patch shows */}
      {/* Grows to the editor's height, so the textarea in it does too */}
      <div className="grid min-w-max flex-1 grid-cols-[58px_1fr]">
        <div aria-hidden="true" className="pr-6 text-right text-subtle select-none">
          {lines.map((_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>
        <div className="relative">
          <pre ref={pre} aria-hidden="true" className="m-0 font-mono text-code leading-[1.6] whitespace-pre text-syntax-plain">
            {lines.map((line, i) => {
              const n = i + 1
              return (
                <div
                  key={i}
                  className={cn(
                    // The tint runs under the line, the text stays where the textarea's is (margin = border + padding)
                    "-ml-2.5 border-l-2 border-transparent pr-8 pl-2 transition-colors duration-150 ease-standard motion-reduce:transition-none",
                    focus.includes(n) && "border-primary bg-primary/10",
                    fresh.includes(n) && "border-success/50 bg-success/5",
                    error?.line === n && "border-error bg-error/10",
                    error?.line === n && lit && "bg-error/20"
                  )}
                >
                  {highlight(line)}
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
            readOnly={readOnly}
            onChange={(e) => onChange?.(e.target.value)}
            onKeyDown={onKeyDown}
            aria-label={label}
            // The file's own text is transparent over the highlighting, the hint is not
            placeholder={placeholder}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            wrap="off"
            className="absolute inset-0 m-0 size-full resize-none overflow-hidden bg-transparent p-0 font-mono text-code leading-[1.6] whitespace-pre text-transparent caret-brand-purple outline-none selection:bg-primary/30 placeholder:text-muted-foreground read-only:cursor-default"
          />
        </div>
      </div>
      {hint && <p className="mt-3 pl-[58px] font-sans text-caption text-muted-foreground">{hint}</p>}
    </div>
  )
}
