import { useEffect, useState } from "react"
import { ChevronDown, ChevronLeft, CircleHelp, X } from "lucide-react"
import { toast } from "sonner"

import { BrandButton } from "@/components/ui/brand-button"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

import { STEPS } from "../data"
import { ExplainSheet } from "../sheets/ExplainSheet"
import { PatchSheet } from "../sheets/PatchSheet"
import { ResultSheet } from "../sheets/ResultSheet"
import { useStore } from "../store"
import { BuildLog } from "../ui/BuildLog"
import { CodeView } from "../ui/CodeView"
import { StepProgress } from "../ui/StepProgress"
import { TopBar } from "../ui/TopBar"

export function StepScreen() {
  const { s, dispatch } = useStore()
  const step = STEPS[s.step]
  const [tab, setTab] = useState<"code" | "build">("code")
  const [more, setMore] = useState(false)
  const busy = s.phase === "building" || s.phase === "deploying"
  const last = s.step === STEPS.length - 1

  useEffect(() => {
    setTab("code")
    setMore(false)
  }, [s.step])

  useEffect(() => {
    if (s.phase === "building") {
      const t = window.setTimeout(() => dispatch({ type: "built" }), 2400)
      return () => window.clearTimeout(t)
    }
    if (s.phase === "deploying") {
      const t = window.setTimeout(() => dispatch({ type: "deployStage" }), 1100)
      return () => window.clearTimeout(t)
    }
  }, [s.phase, s.deployStage, dispatch])

  const undo = () => {
    dispatch({ type: "undo" })
    toast("Patch undone", { duration: 4000 })
  }

  const focus = s.phase === "idle" && !s.passed[s.step] && !s.undo ? step.focus : []

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TopBar
        title="Hello Anchor"
        left={
          <Button variant="ghost" size="icon" className="size-11" aria-label="Tutorial overview" onClick={() => dispatch({ type: "open", screen: "overview" })}>
            <ChevronLeft />
          </Button>
        }
        right={
          <Button variant="ghost" size="icon" className="size-11" aria-label="Close tutorial" onClick={() => dispatch({ type: "open", screen: "gallery" })}>
            <X />
          </Button>
        }
      />

      <StepProgress current={s.step} passed={s.passed} onPick={(i) => dispatch({ type: "goto", step: i })} />

      <section className="border-b border-border px-4 pb-1">
        <p className="text-caption tracking-wide text-muted-foreground uppercase">
          Step {s.step + 1} of {STEPS.length}
        </p>
        <h2 className="mt-1 line-clamp-3 text-title">{step.objective}</h2>
        <button
          type="button"
          aria-expanded={more}
          onClick={() => setMore((v) => !v)}
          className="flex min-h-11 w-full items-center gap-1 text-left text-caption text-muted-foreground"
        >
          <span className="flex-1">Checked when {step.checkedBy}</span>
          <ChevronDown className={cn("size-4 shrink-0 transition-transform", more && "rotate-180")} />
        </button>
        {more && <p className="pb-2 text-caption text-muted-foreground">{step.page}</p>}
      </section>

      <div role="tablist" aria-label="Views" className="flex gap-1 px-4 text-caption">
        {(["code", "build"] as const).map((t) => (
          <button
            key={t}
            role="tab"
            type="button"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cn("flex h-11 items-center text-muted-foreground", tab === t && "text-foreground")}
          >
            {/* The pill is what shows, the button around it is the 44px target */}
            <span className={cn("flex h-8 items-center gap-1.5 rounded-control px-3", tab === t && "bg-surface-raised")}>
              {t === "code" ? step.file.split("/").pop() : "Build"}
              {t === "build" && s.log.length > 0 && (
                <span className={cn("size-1.5 rounded-full", s.error ? "bg-error" : "bg-success")} />
              )}
            </span>
          </button>
        ))}
      </div>

      {tab === "code" ? (
        <CodeView code={s.files[step.file]} focus={focus} error={s.error?.line ?? null} />
      ) : (
        <BuildLog log={s.log} />
      )}

      <footer className="flex shrink-0 items-center gap-2 border-t border-border bg-surface-panel px-3 pt-2 pb-[max(env(safe-area-inset-bottom),12px)]">
        {busy ? (
          <p role="status" className="flex h-11 flex-1 items-center justify-center gap-2 text-control text-muted-foreground">
            <Spinner className="size-4" />
            {s.phase === "building"
              ? step.id === "call-client"
                ? "Running client..."
                : "Building..."
              : `${step.deploy?.stages[s.deployStage]}... (${s.deployStage + 1}/${step.deploy?.stages.length})`}
          </p>
        ) : s.phase === "failed" ? (
          <>
            <Button variant="secondary" className="h-11 flex-1" onClick={() => dispatch({ type: "retry" })}>
              Try again
            </Button>
            <BrandButton variant="accent" className="h-11 min-w-0 flex-1 leading-tight whitespace-normal!" onClick={() => dispatch({ type: "explain", mode: "error" })}>
              Explain
            </BrandButton>
          </>
        ) : s.phase === "passed" ? (
          <>
            {s.undo && (
              <Button variant="ghost" className="h-11 text-muted-foreground" onClick={undo}>
                Undo
              </Button>
            )}
            <BrandButton variant="accent" className="h-11 min-w-0 flex-1 leading-tight whitespace-normal!" onClick={() => dispatch({ type: "next" })}>
              {last ? "Finish tutorial" : `Step ${s.step + 2}: ${STEPS[s.step + 1].title}`}
            </BrandButton>
          </>
        ) : (
          <>
            <Button
              variant="secondary"
              size="icon"
              className="size-11"
              aria-label="Explain this step"
              onClick={() => dispatch({ type: "explain", mode: "step" })}
            >
              <CircleHelp />
            </Button>
            <BrandButton
              variant="accent"
              className="h-11 min-w-0 flex-1 leading-tight whitespace-normal!"
              onClick={() => dispatch(step.deploy ? { type: "deploy" } : { type: "askPatch" })}
            >
              {step.cta}
            </BrandButton>
          </>
        )}
      </footer>

      <PatchSheet />
      <ResultSheet onUndo={undo} />
      <ExplainSheet />
    </div>
  )
}
