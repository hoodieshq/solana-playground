import { useId, useState } from "react"

import { cn } from "@/lib/utils"

import { CodeCard, ContextLine, Gutter, Reply } from "./parts"
import type { PlayProps } from "./types"

/* Type your name: the one idea is that msg! writes whatever string you give it to the program log.
   The name stays in this component's state only, nothing stores or sends it */

const MAX = 24

// A quote or a backslash would end or escape the string, and braces are msg!'s own placeholders,
// so they're left out as you type. Anything else is fine, emoji included
const UNSAFE = /["\\{}]/g

export function NameGame({ onSolved, onRun, locked, announce }: PlayProps) {
  const id = useId()
  const [name, setName] = useState("")
  const [stripped, setStripped] = useState(false)

  const change = (raw: string) => {
    const kept = raw.replace(UNSAFE, "")
    if (kept !== raw) {
      setStripped(true)
      announce("Quotes and braces stay out of the string")
    }
    const next = [...kept].slice(0, MAX).join("")
    setName(next)
    onSolved(next.trim() ? next.trim() : null)
  }

  return (
    <CodeCard reply={stripped && <Reply>quotes and braces stay out, they would end the string</Reply>}>
      <ContextLine n={1}>{"pub fn hello(_ctx: Context<Hello>) -> Result<()> {"}</ContextLine>
      {/* The line you write in. A long name on a narrow phone wraps it, and what wraps starts at
          the line's own indent, so it still reads as the one line */}
      <div className="flex min-h-11 items-start py-1.5 text-syntax-plain">
        <span className="flex h-8 items-center">
          <Gutter n={2} />
        </span>
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-y-1 pl-[4ch]">
          <span className="flex h-8 items-center whitespace-pre">
            <span className="text-syntax-function">msg!</span>(<span className="text-syntax-string">{'"Hello, '}</span>
          </span>
          {/* The field and the end of the line stay together, so a wrap moves both */}
          <span className="flex min-w-0 max-w-full items-center">
            <label htmlFor={id} className="sr-only">
              Name for msg! to greet
            </label>
            <input
              id={id}
              value={name}
              readOnly={locked}
              placeholder="World"
              autoComplete="off"
              autoCapitalize="words"
              spellCheck={false}
              enterKeyHint="go"
              onChange={(e) => change(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onRun()
              }}
              // Its own width, a character more than the name, so the closing quote follows the text
              style={{ width: `${Math.max([...name].length, 5) + 1}ch` }}
              className={cn(
                // 16px on touch screens, or iOS zooms the page in when the field takes the focus
                "h-8 max-w-full min-w-[4ch] shrink rounded-sm border-b border-dashed border-syntax-string/60 bg-syntax-string/8 px-[0.5ch] font-mono text-syntax-string outline-none placeholder:text-syntax-string/45 focus-visible:ring-2 focus-visible:ring-ring/60 pointer-coarse:text-base",
                locked && "border-transparent bg-transparent"
              )}
            />
            <span className="shrink-0 whitespace-pre">
              <span className="text-syntax-string">{'!"'}</span>);
            </span>
          </span>
        </div>
      </div>
      <ContextLine n={3}>{"    Ok(())"}</ContextLine>
      <ContextLine n={4}>{"}"}</ContextLine>
    </CodeCard>
  )
}
