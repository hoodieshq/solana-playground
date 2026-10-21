import { useState } from "react"
import { ArrowUp } from "lucide-react"

import { Composer, ComposerInput, ComposerSend, ComposerToolbar } from "@/components/ui/composer"

import type { Chip } from "../data"
import { AssistantHead } from "../ui/AssistantHead"
import { Typed } from "../ui/Typed"

export type Quote = { file: string; line: number; code: string }
export type Msg = { id: number; from: "assistant"; text: string; quote?: Quote } | { id: number; from: "you"; text: string }

/** What the assistant said on this step and what you asked, under the lesson. Explain lands here
 * too, so the code stays in view while you read it */
export function Feed({ msgs }: { msgs: Msg[] }) {
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
              <div className="rounded-control border border-error/40 bg-error/10 px-3 py-2 font-mono text-[0.75rem]">
                <span className="text-muted-foreground">
                  {m.quote.file}:{m.quote.line}
                </span>
                <div className="mt-0.5 break-words whitespace-pre-wrap text-syntax-plain">{m.quote.code}</div>
              </div>
            )}
            <p className="text-body">
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
    <div className="shrink-0 border-t border-border px-3 pt-3 pb-3">
      {suggestions.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
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
