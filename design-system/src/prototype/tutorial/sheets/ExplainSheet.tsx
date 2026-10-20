import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Drawer, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"

import { STEPS, type Chip } from "../data"
import { useStore } from "../store"
import { AssistantHead } from "../ui/AssistantHead"
import { Typed } from "../ui/Typed"

function Body({ mode }: { mode: "step" | "error" }) {
  const { s, dispatch } = useStore()
  const step = STEPS[s.step]
  const withFix = mode === "error" && !!step.fix
  const [ready, setReady] = useState(false)
  const [asked, setAsked] = useState<Chip[]>([])
  const [free, setFree] = useState(false)
  const text = withFix ? step.explainError ?? "" : step.explainStep
  const left = step.chips.filter((c) => !asked.includes(c))

  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto px-4">
        {withFix && s.error && (
          <div className="mb-3 rounded-control border border-error/40 bg-error/10 px-3 py-2 font-mono text-[0.75rem]">
            <span className="text-muted-foreground">
              {step.file}:{s.error.line}
            </span>
            <div className="mt-0.5 break-words whitespace-pre-wrap text-syntax-plain">
              {s.files[step.file].split("\n")[s.error.line - 1]?.trim()}
            </div>
          </div>
        )}
        <p className="text-body">
          <Typed key={text} text={text} onDone={() => setReady(true)} />
        </p>
        {asked.map((c) => (
          <div key={c.label} className="mt-4">
            <p className="ml-auto w-fit max-w-[85%] rounded-panel bg-surface-raised px-3 py-2 text-body">{c.label}</p>
            <p className="mt-2 text-body">
              <Typed key={c.answer} text={c.answer} />
            </p>
          </div>
        ))}
        {ready && (
          <div className="mt-4 flex flex-wrap gap-2 pb-2">
            {left.map((c) => (
              <button
                key={c.label}
                type="button"
                onClick={() => setAsked((a) => [...a, c])}
                className="h-11 rounded-full border border-border-strong px-4 text-caption text-muted-foreground"
              >
                {c.label}
              </button>
            ))}
            {!free && (
              <button
                type="button"
                onClick={() => setFree(true)}
                className="h-11 rounded-full border border-border-strong px-4 text-caption text-muted-foreground"
              >
                Ask something else
              </button>
            )}
          </div>
        )}
        {free && (
          <div className="pb-2">
            <Input autoFocus placeholder="Ask about this step..." className="h-11" />
            <p className="mt-1.5 text-caption text-muted-foreground">Free chat is off in this prototype.</p>
          </div>
        )}
      </div>
      <DrawerFooter className="flex-row gap-2 pb-[max(var(--safe-bottom),16px)]">
        {withFix ? (
          <>
            <Button variant="secondary" className="h-14 flex-1 text-control" onClick={() => dispatch({ type: "close" })}>
              Close
            </Button>
            {/* The fix opens in the code, the same way the step's own patch does */}
            <Button className="h-14 flex-1 text-control" disabled={!ready} onClick={() => dispatch({ type: "reviewFix" })}>
              Review the fix
            </Button>
          </>
        ) : (
          <Button variant="secondary" className="h-14 flex-1 text-control" onClick={() => dispatch({ type: "close" })}>
            Got it
          </Button>
        )}
      </DrawerFooter>
    </>
  )
}

export function ExplainSheet() {
  const { s, dispatch } = useStore()
  const open = s.phase === "explain" && s.sheet
  return (
    <Drawer open={open} onOpenChange={(o) => !o && dispatch({ type: "close" })}>
      <DrawerContent className="max-h-[82dvh]">
        <DrawerHeader className="text-left">
          <DrawerTitle className="sr-only">Assistant explains</DrawerTitle>
          <AssistantHead />
        </DrawerHeader>
        {open && <Body key={`${s.step}-${s.explain}`} mode={s.explain} />}
      </DrawerContent>
    </Drawer>
  )
}
