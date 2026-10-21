import type { KeyboardEvent } from "react"

import { cn } from "@/lib/utils"

import { highlight } from "../ui/CodeView"

/** A plain editor for the prototype: a textarea over highlighted code, both in the same font and
 * line height, so the caret lands on the letters. The product uses Monaco, as client-v2 does.
 * `fresh` lines are the ones the last patch added, `focus` where a change will land */
export function Editor({
  code,
  onChange,
  readOnly = false,
  dim = false,
  error = null,
  fresh = [],
  focus = [],
  hint,
  label,
}: {
  code: string
  onChange?: (code: string) => void
  readOnly?: boolean
  dim?: boolean
  error?: number | null
  fresh?: number[]
  focus?: number[]
  hint?: string
  label: string
}) {
  const lines = code.split("\n")

  // Tab writes four spaces, as Rust is indented here
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Tab" || e.shiftKey || readOnly) return
    e.preventDefault()
    const el = e.currentTarget
    const at = el.selectionStart
    onChange?.(code.slice(0, at) + "    " + code.slice(el.selectionEnd))
    requestAnimationFrame(() => {
      el.selectionStart = el.selectionEnd = at + 4
    })
  }

  return (
    <div className={cn("min-h-0 flex-1 overflow-auto py-3 font-mono text-code leading-[1.6]", dim && "opacity-60")}>
      <div className="grid min-w-max grid-cols-[3rem_1fr]">
        <div aria-hidden="true" className="pr-4 text-right text-subtle select-none">
          {lines.map((_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>
        <div className="relative">
          <pre aria-hidden="true" className="m-0 font-mono text-code leading-[1.6] whitespace-pre text-syntax-plain">
            {lines.map((line, i) => {
              const n = i + 1
              return (
                <div
                  key={i}
                  className={cn(
                    // The tint runs under the line, the text stays where the textarea's is (margin = border + padding)
                    "-ml-2.5 border-l-2 border-transparent pr-8 pl-2",
                    focus.includes(n) && "border-primary bg-primary/10",
                    fresh.includes(n) && "border-success/50 bg-success/5",
                    error === n && "border-error bg-error/10"
                  )}
                >
                  {highlight(line)}
                  {line === "" && "​"}
                </div>
              )
            })}
          </pre>
          <textarea
            value={code}
            readOnly={readOnly}
            onChange={(e) => onChange?.(e.target.value)}
            onKeyDown={onKeyDown}
            aria-label={label}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            wrap="off"
            className="absolute inset-0 m-0 size-full resize-none overflow-hidden bg-transparent p-0 font-mono text-code leading-[1.6] whitespace-pre text-transparent caret-brand-purple outline-none selection:bg-primary/30 read-only:cursor-default"
          />
        </div>
      </div>
      {hint && <p className="mt-3 pl-12 font-sans text-caption text-muted-foreground">{hint}</p>}
    </div>
  )
}
