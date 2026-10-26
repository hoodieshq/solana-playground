import { useEffect, useRef, type CSSProperties, type ReactNode } from "react"

import { cn } from "@/lib/utils"

const TOKEN =
  /(\/\/.*$)|("(?:[^"\\]|\\.)*"|`[^`]*`|'[^']*')|(\b[a-z_]+!)|(#\[[^\]]*\])|\b(use|mod|pub|fn|let|struct|const|await|mut|impl|return|super|self)\b|\b([A-Z][A-Za-z0-9]*)\b|\b(\d+)\b|(->|=>)/g

const CLASS = [
  "",
  "text-syntax-comment",
  "text-syntax-string",
  "text-syntax-function",
  "text-syntax-type",
  "text-syntax-keyword",
  "text-syntax-type",
  "text-syntax-number",
  // Arrows keep their colour but never wrap: text rules allow a break after the hyphen, which
  // left `-` at the end of a line and `>` at the start of the next
  "whitespace-nowrap",
]

/** A soft-wrapped line's rest hangs two characters in from where the line's own code starts, so
 * the wrap reads as the same line going on, never as a new line at the left edge */
export function hang(line: string) {
  const n = (line.match(/^\s*/)?.[0].length ?? 0) + 2
  return { paddingLeft: `${n}ch`, textIndent: `-${n}ch` }
}

export function highlight(line: string): ReactNode[] {
  const out: ReactNode[] = []
  let last = 0
  for (const m of line.matchAll(TOKEN)) {
    const at = m.index ?? 0
    if (at > last) out.push(line.slice(last, at))
    const group = m.findIndex((g, k) => k > 0 && g !== undefined)
    out.push(
      <span key={at} className={CLASS[group]}>
        {m[0]}
      </span>
    )
    last = at + m[0].length
  }
  if (last < line.length) out.push(line.slice(last))
  return out
}

/** The line a failed build points at, and the token the compiler named, as the desktop editor takes it */
export type CodeError = { line: number; column?: number; span?: number }

/** A line with the token the compiler named under a wavy red line: the line wraps here, so the
 * squiggle rides in the text rather than over it */
function marked(line: string, error: CodeError) {
  const from = error.column ? error.column - 1 : (line.match(/^\s*/)?.[0].length ?? 0)
  const to = error.span ? from + error.span : line.trimEnd().length
  if (to <= from) return highlight(line)
  return [
    ...highlight(line.slice(0, from)),
    <span key="bad" className="pg-squiggle underline decoration-error decoration-wavy decoration-1 underline-offset-[3px] [text-decoration-skip-ink:none]">
      {highlight(line.slice(from, to))}
    </span>,
    ...highlight(line.slice(to)),
  ]
}

/** Read only code that wraps, for the phone. `fresh` are the lines the assistant just wrote: tinted
 * green, and arriving lit one after another each time `arrive` changes (on the write, and on Show
 * in). `landing` is where an open question's answer will go: a dashed purple edge, with a ghost
 * line when it lands past the end. `error` is the failed build's line, its token underlined.
 * `jump` brings a line to a third of the height. `hint` sits under a file that is still empty */
export function CodeView({
  code,
  focus = [],
  error = null,
  fresh = [],
  arrive = 0,
  landing = null,
  jump = null,
  hint,
  className,
}: {
  code: string
  focus?: number[]
  error?: CodeError | null
  fresh?: number[]
  arrive?: number
  landing?: { lines: number[]; ghost: boolean } | null
  jump?: { line: number; at: number; top?: boolean } | null
  hint?: string
  className?: string
}) {
  const box = useRef<HTMLPreElement>(null)
  const lines = code.split("\n")
  const ghostAt = landing?.ghost ? landing.lines[0] : null
  const extra = ghostAt !== null && ghostAt > lines.length ? ghostAt - lines.length : 0
  const rows = [...lines, ...Array.from({ length: extra }, () => "")]

  useEffect(() => {
    const el = box.current
    if (!jump || !el) return
    const row = el.querySelector<HTMLElement>(`[data-line="${jump.line}"]`)
    const top = jump.top || !row ? 0 : Math.max(0, row.offsetTop - el.clientHeight / 3)
    el.scrollTo({ top, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jump?.at])

  return (
    <pre ref={box} aria-label="Code, read only" className={cn("min-h-0 flex-1 overflow-y-auto overscroll-contain py-2 font-mono text-code", className)}>
      {rows.map((line, i) => {
        const n = i + 1
        const k = fresh.indexOf(n)
        const lands = landing?.lines.includes(n)
        return (
          <div
            key={k === -1 ? n : `${n}:${arrive}`}
            data-line={n}
            style={k === -1 ? undefined : ({ "--i": k } as CSSProperties)}
            className={cn(
              "flex border-l-2 border-transparent pr-3",
              focus.includes(n) && "border-primary bg-primary/10",
              lands && "border-dashed border-border-strong",
              k !== -1 && "border-foreground/25",
              k !== -1 && arrive > 0 && "pg-arrive",
              error?.line === n && "border-error bg-error/10",
              i >= lines.length && "opacity-60"
            )}
          >
            <span className={cn("w-10 shrink-0 pr-3 text-right text-subtle select-none", k !== -1 && "text-muted-foreground")}>{n}</span>
            <code style={hang(line)} className="min-w-0 flex-1 whitespace-pre-wrap break-words text-syntax-plain">
              {error?.line === n ? marked(line, error) : highlight(line)}
              {lands && landing?.ghost && line === "" && <span className="font-sans text-caption text-subtle select-none">Your answer lands here</span>}
            </code>
          </div>
        )
      })}
      {/* The pre keeps its spaces, so the hint has to ask to wrap: at a large font on a small phone it
          ran past the edge and scrolled the screen sideways */}
      {hint && <p className="mt-3 pr-3 pl-10 font-sans text-caption break-words whitespace-normal text-muted-foreground">{hint}</p>}
    </pre>
  )
}
