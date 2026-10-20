import { useEffect, useState } from "react"
import { BookOpen, ChevronLeft, CircleCheck, CircleDashed, MessageCircle, X } from "lucide-react"
import { toast } from "sonner"

import { BrandButton } from "@/components/ui/brand-button"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

import { STEPS } from "../data"
import { ExplainSheet } from "../sheets/ExplainSheet"
import { LessonSheet } from "../sheets/LessonSheet"
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
  const [lesson, setLesson] = useState(false)
  const busy = s.phase === "building" || s.phase === "deploying"
  const last = s.step === STEPS.length - 1

  useEffect(() => {
    setTab("code")
    setLesson(false)
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
            <ChevronLeft className="size-6" />
          </Button>
        }
        right={
          <Button variant="ghost" size="icon" className="size-11" aria-label="Close tutorial" onClick={() => dispatch({ type: "open", screen: "gallery" })}>
            <X className="size-5" />
          </Button>
        }
      />

      <StepProgress current={s.step} passed={s.passed} onPick={(i) => dispatch({ type: "goto", step: i })} />

      <section className="border-b border-border px-4 pb-1">
        <h2 className="line-clamp-3 text-title">{step.objective}</h2>
        {/* When the step counts. A dashed circle while it waits, a green check once it does */}
        <p className="mt-2 flex items-start gap-1.5 text-caption text-muted-foreground">
          {s.passed[s.step] ? (
            <CircleCheck strokeWidth={1.75} className="mt-px size-4 shrink-0 text-success" />
          ) : (
            <CircleDashed strokeWidth={1.75} className="mt-px size-4 shrink-0" />
          )}
          Done when {step.checkedBy}
        </p>
        {/* The lesson itself opens in a sheet, so the code stays where it is */}
        <button
          type="button"
          onClick={() => setLesson(true)}
          // 44px to tap, pulled up so the text sits 8px under the line above
          className="-mt-[5px] flex min-h-11 items-center gap-1.5 text-caption text-foreground"
        >
          <BookOpen strokeWidth={1.75} className="size-4 shrink-0 text-muted-foreground" />
          <span className="underline decoration-border-strong underline-offset-4">Read the lesson</span>
        </button>
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

      <footer className="flex shrink-0 items-center gap-2 border-t border-border bg-surface-panel px-3 pt-2 pb-[max(var(--safe-bottom),12px)]">
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
            {/* A chat bubble, the same one the assistant's sheets carry, so it's clear who answers.
                It stands in until Sole has a mark of its own (DES-134) */}
            <Button
              variant="secondary"
              className="h-11 gap-2 px-3.5 text-control"
              aria-label="Ask the assistant about this step"
              onClick={() => dispatch({ type: "explain", mode: "step" })}
            >
              <MessageCircle strokeWidth={1.75} className="size-4 text-brand-purple" />
              Ask
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

      <LessonSheet
        open={lesson}
        onClose={() => setLesson(false)}
        onAsk={() => {
          setLesson(false)
          dispatch({ type: "explain", mode: "step" })
        }}
      />
      <PatchSheet />
      <ResultSheet onUndo={undo} />
      <ExplainSheet />
    </div>
  )
}
