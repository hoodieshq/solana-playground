import { useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { Drawer, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"

import { STEPS, type Chip } from "../data"
import { fixFor, useStore } from "../store"
import { AssistantHead } from "../ui/AssistantHead"
import { Typed } from "../ui/Typed"

function Body({ mode }: { mode: "step" | "error" }) {
  const { s, dispatch } = useStore()
  const step = STEPS[s.step]
  const withFix = mode === "error" && !!fixFor(s)
  const [ready, setReady] = useState(false)
  const [asked, setAsked] = useState<Chip[]>([])
  const [free, setFree] = useState(false)
  const text = withFix ? s.error?.explain ?? step.explainError ?? "" : step.explainStep
  // About the error while explaining it. Otherwise about the lesson, with the error's questions first
  // once a build of the step has failed, the planned failure on step 1 too, as on desktop
  const chips = withFix ? (step.errorChips ?? step.chips) : [...(s.failedOnce[s.step] ? (step.errorChips ?? []) : []), ...step.chips]
  const left = chips.filter((c) => !asked.includes(c))
  // A chip's question and its answer come in under what's there: bring the question to the top of
  // the sheet, so the answer types out in view instead of below the fold. Scrolled by hand, not by
  // scrollIntoView, which would move the page around the device frame too. The question can only
  // reach the top once there's enough under it, so the sheet follows the answer as it types
  const scroller = useRef<HTMLDivElement>(null)
  const latest = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const box = scroller.current
    const el = latest.current
    if (!box || !el || asked.length === 0) return
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const follow = (behavior: ScrollBehavior) => {
      const top = box.scrollTop + el.getBoundingClientRect().top - box.getBoundingClientRect().top - 8
      if (top > box.scrollTop + 1) box.scrollTo({ top, behavior })
    }
    follow(smooth ? "smooth" : "auto")
    const ro = new ResizeObserver(() => follow("auto"))
    ro.observe(el)
    return () => ro.disconnect()
  }, [asked.length])

  return (
    <>
      <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto px-4">
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
        <p className="text-body font-read">
          <Typed key={text} text={text} onDone={() => setReady(true)} />
        </p>
        {asked.map((c, i) => (
          <div key={c.label} ref={i === asked.length - 1 ? latest : undefined} className="mt-4">
            <p className="ml-auto w-fit max-w-[85%] rounded-panel bg-surface-raised px-3 py-2 text-body">{c.label}</p>
            <p className="mt-2 text-body font-read">
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
            <Input autoFocus placeholder="Ask about this step" className="h-11" />
            <p className="mt-1.5 text-caption text-muted-foreground">Free chat isn't connected in this prototype. Try a suggestion.</p>
          </div>
        )}
      </div>
      <DrawerFooter className="flex-row gap-2 pb-[max(var(--safe-bottom),16px)]">
        {withFix ? (
          <>
            <Button variant="secondary" className="h-14 flex-1" onClick={() => dispatch({ type: "close" })}>
              Close
            </Button>
            {/* The fix opens in the code, the same way the step's own patch does */}
            <Button className="h-14 flex-1" disabled={!ready} onClick={() => dispatch({ type: "reviewFix" })}>
              Review the fix
            </Button>
          </>
        ) : (
          <Button variant="secondary" className="h-14 flex-1" onClick={() => dispatch({ type: "close" })}>
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
