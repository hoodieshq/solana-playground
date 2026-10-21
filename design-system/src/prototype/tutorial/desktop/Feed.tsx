import { useState } from "react"
import { ArrowUp } from "lucide-react"

import { Composer, ComposerInput, ComposerSend, ComposerToolbar } from "@/components/ui/composer"
import { cn } from "@/lib/utils"

import type { Chip } from "../data"
import { AssistantHead } from "../ui/AssistantHead"
import { Typed } from "../ui/Typed"

export type Quote = { file: string; line: number; code: string }
export type Msg = { id: number; from: "assistant"; text: string; quote?: Quote } | { id: number; from: "you"; text: string }

/** What the assistant said on this step and what you asked, under the lesson. Explain lands here
 * too, so the code stays in view while you read it */
export function Feed({ msgs, resolved = false }: { msgs: Msg[]; resolved?: boolean }) {
  if (msgs.length === 0) return null
  return (
    <div className="mt-6 flex flex-col gap-5 border-t border-border pt-5">
      {msgs.map((m) =>
        m.from === "you" ? (
          <p key={m.id} className="ml-auto w-fit max-w-[85%] rounded-panel bg-surface-raised px-3 py-2 text-body">
            {m.text}
          </p>
        ) : (
          <div key={m.id} className="flex flex-col gap-2">
            <AssistantHead />
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
              <Typed key={m.id} text={m.text} />
            </p>
          </div>
        )
      )}
    </div>
  )
}

const FREE = "Free chat isn't connected in this prototype. Try one of the suggestions above the box."

/** The product's composer at the foot of the column. Suggestions give the step's prepared answers */
export function AskBox({ placeholder, suggestions, onAsk }: { placeholder: string; suggestions: Chip[]; onAsk: (question: string, answer: string) => void }) {
  const [text, setText] = useState("")
  return (
    // The column's 20px edge, and the same foot as the tutorial page's Start: 16 above, 20 at the sides and below
    <div className="shrink-0 border-t border-border px-5 pt-4 pb-5">
      {suggestions.length > 0 && (
        // Twice the gap between chips, so they read as suggestions, not part of the field
        <div className="mb-3 flex flex-wrap gap-1.5">
          {suggestions.map((c) => (
            <button
              key={c.label}
              type="button"
              onClick={() => onAsk(c.label, c.answer)}
              className="h-8 rounded-full border border-border-strong px-3 text-caption text-muted-foreground transition-colors hover:text-foreground"
            >
              {c.label}
            </button>
          ))}
        </div>
      )}
      <Composer
        onSubmit={() => {
          if (!text.trim()) return
          onAsk(text.trim(), FREE)
          setText("")
        }}
      >
        <ComposerInput value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
        <ComposerToolbar>
          <ComposerSend>
            <ArrowUp />
          </ComposerSend>
        </ComposerToolbar>
      </Composer>
    </div>
  )
}
