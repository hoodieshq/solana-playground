import { useEffect, useState } from "react"
import { BookOpen, ChevronLeft, RotateCcw, X } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { STEPS } from "../data"
import { ExplainSheet } from "../sheets/ExplainSheet"
import { LessonSheet } from "../sheets/LessonSheet"
import { PatchSheet } from "../sheets/PatchSheet"
import { useStore } from "../store"
import { ActionZone } from "../ui/ActionZone"
import { BuildLog } from "../ui/BuildLog"
import { CodeView } from "../ui/CodeView"
import { StepProgress } from "../ui/StepProgress"
import { TopBar } from "../ui/TopBar"

export function StepScreen() {
  const { s, dispatch } = useStore()
  const step = STEPS[s.step]
  const [tab, setTab] = useState<"code" | "build">("code")
  const [lesson, setLesson] = useState(false)

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
        {/* The lesson itself opens in a sheet, so the code stays where it is */}
        <button
          type="button"
          onClick={() => setLesson(true)}
          // 44px to tap, pulled up so the text sits under the task
          className="-mt-[5px] flex min-h-11 items-center gap-1.5 text-caption text-foreground"
        >
          <BookOpen strokeWidth={1.75} className="size-4 shrink-0 text-muted-foreground" />
          <span className="underline decoration-border-strong underline-offset-4">Read the lesson</span>
        </button>
      </section>

      <div className="flex items-center px-4">
        <div role="tablist" aria-label="Views" className="flex gap-1 text-caption">
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
        {/* Undo sits by the code it reverts, away from the main button and big enough to tap */}
        {s.undo && (s.phase === "passed" || s.phase === "failed") && (
          <button
            type="button"
            onClick={undo}
            className="ml-auto flex h-11 items-center gap-1.5 px-1 text-caption text-muted-foreground active:text-foreground"
          >
            <RotateCcw strokeWidth={1.75} className="size-4" />
            Undo patch
          </button>
        )}
      </div>

      {tab === "code" ? (
        <CodeView code={s.files[step.file]} focus={focus} error={s.error?.line ?? null} />
      ) : (
        <BuildLog log={s.log} />
      )}

      <ActionZone onShowBuild={() => setTab("build")} />

      <LessonSheet
        open={lesson}
        onClose={() => setLesson(false)}
        onAsk={() => {
          setLesson(false)
          dispatch({ type: "explain", mode: "step" })
        }}
      />
      <PatchSheet />
      <ExplainSheet />
    </div>
  )
}
