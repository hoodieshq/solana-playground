import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Drawer, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"

import { STEPS, type Chip } from "../data"
import { useStore } from "../store"
import { AssistantHead } from "../ui/AssistantHead"
import { PatchDiff } from "../ui/PatchDiff"
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
        <p className="text-body">
          <Typed key={text} text={text} onDone={() => setReady(true)} />
        </p>
        {ready && withFix && step.fix && <PatchDiff patch={step.fix} className="mt-3" />}
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
                className="h-9 rounded-full border border-border-strong px-3 text-caption text-muted-foreground"
              >
                {c.label}
              </button>
            ))}
            {!free && (
              <button
                type="button"
                onClick={() => setFree(true)}
                className="h-9 rounded-full border border-border-strong px-3 text-caption text-muted-foreground"
              >
                Ask something else
              </button>
            )}
          </div>
        )}
        {free && (
          <div className="pb-2">
            <Input autoFocus placeholder="Ask about this step..." className="h-11" />
            <p className="mt-1.5 text-caption text-subtle">Free chat is off in this prototype.</p>
          </div>
        )}
      </div>
      <DrawerFooter className="flex-row gap-2 pb-[max(env(safe-area-inset-bottom),16px)]">
        {withFix ? (
          <>
            <Button variant="secondary" className="h-11 flex-1" onClick={() => dispatch({ type: "close" })}>
              Discard
            </Button>
            <Button className="h-11 flex-1" disabled={!ready} onClick={() => dispatch({ type: "apply" })}>
              Apply and build
            </Button>
          </>
        ) : (
          <Button variant="secondary" className="h-11 flex-1" onClick={() => dispatch({ type: "close" })}>
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
      <DrawerContent className="h-[82dvh] max-h-[82dvh]">
        <DrawerHeader className="text-left">
          <DrawerTitle className="sr-only">Assistant explains</DrawerTitle>
          <AssistantHead />
        </DrawerHeader>
        {open && <Body key={`${s.step}-${s.explain}`} mode={s.explain} />}
      </DrawerContent>
    </Drawer>
  )
}
