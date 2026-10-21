import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

const TOKEN =
  /(\/\/.*$)|("(?:[^"\\]|\\.)*"|`[^`]*`|'[^']*')|(\b[a-z_]+!)|(#\[[^\]]*\])|\b(use|mod|pub|fn|let|struct|const|await|mut|impl|return|super|self)\b|\b([A-Z][A-Za-z0-9]*)\b|\b(\d+)\b/g

const CLASS = [
  "",
  "text-syntax-comment",
  "text-syntax-string",
  "text-syntax-function",
  "text-syntax-type",
  "text-syntax-keyword",
  "text-syntax-type",
  "text-syntax-number",
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

/** `fresh` are the lines the last patch added: softly tinted until the next action, so you can
 * still see what is being checked. `hint` sits under a file that is still empty */
export function CodeView({
  code,
  focus = [],
  error = null,
  fresh = [],
  hint,
}: {
  code: string
  focus?: number[]
  error?: number | null
  fresh?: number[]
  hint?: string
}) {
  return (
    <pre aria-label="Code, read only" className="min-h-0 flex-1 overflow-y-auto py-2 font-mono text-code">
      {code.split("\n").map((line, i) => {
        const n = i + 1
        return (
          <div
            key={n}
            className={cn(
              "flex border-l-2 border-transparent pr-3",
              focus.includes(n) && "border-primary bg-primary/10",
              fresh.includes(n) && "border-success/50 bg-success/5",
              error === n && "border-error bg-error/10"
            )}
          >
            <span className="w-10 shrink-0 pr-3 text-right text-subtle select-none">{n}</span>
            <code style={hang(line)} className="min-w-0 flex-1 whitespace-pre-wrap break-words text-syntax-plain">
              {highlight(line)}
            </code>
          </div>
        )
      })}
      {hint && <p className="mt-3 pr-3 pl-10 font-sans text-caption text-muted-foreground">{hint}</p>}
    </pre>
  )
}
