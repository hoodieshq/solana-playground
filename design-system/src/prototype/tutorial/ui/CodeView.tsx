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

function highlight(line: string): ReactNode[] {
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

export function CodeView({ code, focus = [], error = null }: { code: string; focus?: number[]; error?: number | null }) {
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
              error === n && "border-error bg-error/10"
            )}
          >
            <span className="w-10 shrink-0 pr-3 text-right text-subtle select-none">{n}</span>
            <code className="min-w-0 flex-1 whitespace-pre-wrap break-words text-syntax-plain">{highlight(line)}</code>
          </div>
        )
      })}
    </pre>
  )
}
