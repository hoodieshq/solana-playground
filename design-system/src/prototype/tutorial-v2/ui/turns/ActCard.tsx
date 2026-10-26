import { useEffect, useState } from "react"
import { CircleCheck, Hammer, Play, Rocket, Send, type LucideIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

import { sameCode } from "../../check"
import { BEATS, LIB, type Act, type ActBeat } from "../../data"
import { flashKeys } from "../../desktop/flash"
import { PRIMARY_KEYS } from "../../desktop/keys"
import { stageMs, useStore, type State, type Turn } from "../../store"
import { NameField } from "../NameField"
import { Prose } from "../Prose"
import { PHONE_CTA, READ_CODE, secs } from "../type"

type ActTurn = Extract<Turn, { kind: "act" }>

const ICON: Record<Act, LucideIcon> = {
  build: Hammer,
  deploy: Rocket,
  buildDeploy: Rocket,
  run: Play,
  call: Send,
}

/** A deploy whose build is behind the file builds first, and says so */
const buildsFirst = (s: State, act: Act) => act === "deploy" && !(s.builtLib !== null && sameCode(s.builtLib, s.files[LIB]))

/** What the act card says, worked out from the state: a deploy after an edit is Build and deploy */
export function actWords(s: State, turn: ActTurn) {
  const beat = BEATS[turn.beat] as ActBeat
  if (buildsFirst(s, turn.act))
    return {
      title: "Build and deploy",
      context: beat.context,
      button: "Build and deploy",
    }
  return { title: beat.title, context: beat.context, button: beat.button }
}

/** The record an act leaves once it ran, in one line */
export function actRecord(turn: ActTurn) {
  const t = turn.took ? secs(turn.took) : ""
  if (turn.via === "test") return "Skipped, called from the Call panel"
  if (turn.failed) return turn.act === "run" ? `Ran client.ts in ${t}` : `Ran the build in ${t}`
  switch (turn.act) {
    case "build":
      return `Built in ${t}`
    case "deploy":
      return `Deployed in ${t}`
    case "buildDeploy":
      return `Built and upgraded in ${t}`
    case "run":
      return `Ran client.ts in ${t}`
    case "call":
      return `Called hello as ${turn.name ?? "you"}`
  }
}

/** The run's progress along the card's foot: a stage at a time, each filling its share over the
 * time it takes, so a deploy reads 1 of 3, 2 of 3, 3 of 3. Determinate: the stages are known */
function RunBar({ stage, stages }: { stage: number; stages: string[] }) {
  const n = stages.length
  const [to, setTo] = useState(stage / n)
  useEffect(() => {
    setTo(stage / n)
    const f = requestAnimationFrame(() => setTo((stage + 0.92) / n))
    return () => cancelAnimationFrame(f)
  }, [stage, n])
  const growing = to > stage / n
  return (
    <span
      aria-hidden="true"
      style={{
        transform: `scaleX(${to})`,
        transitionDuration: growing ? `${stageMs(stages[stage])}ms` : "0ms",
      }}
      className="absolute inset-x-0 bottom-0 h-0.5 origin-left bg-foreground/30 transition-transform ease-linear motion-reduce:transition-none"
    />
  )
}

/** Something to run, with the button on the right: Build, Deploy, Run, Call hello. Running, the
 * button gives way to the stage and its count, and a bar fills along the foot. Once it ran it's one
 * line, with no button, ever. The call carries the name field on a second row. On a phone the button
 * goes full width under the text, 48px, and the card takes the question card's inset and title size */
export function ActCard({ turn, phone = false }: { turn: ActTurn; phone?: boolean }) {
  const { s, dispatch } = useStore()

  if (turn.state === "done")
    return (
      <div className="flex h-9 items-center gap-2 rounded-control border border-border bg-(--card-ground) px-3 text-caption text-muted-foreground">
        {turn.failed ? <Hammer className="size-3.5 text-subtle" aria-hidden="true" /> : <CircleCheck className="size-3.5 text-success" aria-hidden="true" />}
        <span className="truncate">{actRecord(turn)}</span>
      </div>
    )

  const words = actWords(s, turn)
  const Icon = ICON[turn.act]
  const running = turn.state === "running"
  const run = running ? s.run : null
  const call = turn.act === "call"
  const empty = call && !s.draft.trim()
  const disabled = s.phase !== "idle" || empty
  const go = () => {
    if (disabled) return
    flashKeys(PRIMARY_KEYS)
    dispatch({ type: "act", act: turn.act })
  }
  // While it runs, the stage takes the subtitle's place and the button keeps its size, so the title
  // and the text beside it never get squeezed
  const context = run ? (
    <span className="flex items-center gap-1.5">
      {run.stages[run.stage]}
      {run.stages.length > 1 && (
        <span className="text-subtle tabular-nums">
          · {run.stage + 1} of {run.stages.length}
        </span>
      )}
    </span>
  ) : turn.state === "interrupted" ? (
    <span className="text-warning-ink">Interrupted by a reload. Run it again.</span>
  ) : call && empty ? (
    "Type any name"
  ) : (
    <Prose text={words.context} {...READ_CODE} />
  )

  const button = (
    <Button
      size="lg"
      disabled={disabled || !!run}
      onClick={go}
      aria-busy={!!run || undefined}
      className={cn("relative shrink-0 px-3", phone ? cn(PHONE_CTA, "text-[0.9375rem]") : !call && "grow")}
    >
      {/* Running, the label holds the width and a spinner sits over it */}
      <span className={cn(run && "invisible")}>{words.button}</span>
      {run && <Spinner className="absolute inset-0 m-auto size-4" />}
    </Button>
  )

  return (
    // The button sits beside the text while the text keeps 15rem, and wraps under it, full width, once
    // it wouldn't: a long label (Build and deploy) in the desktop chat squeezed the title and the program
    // id into a word a line. The text grows first, so the button only fills a line of its own
    <div
      data-live-card
      className={cn(
        "relative flex gap-3 overflow-hidden rounded-panel border border-border bg-(--card-ground) p-3",
        call || phone ? "flex-col items-stretch" : "flex-wrap items-center",
        phone && "gap-4 p-4"
      )}
    >
      <div className={cn("flex min-w-0 items-center gap-3", call || phone ? "flex-1" : "grow-[999] basis-60")}>
        <span
          aria-hidden="true"
          className={cn(
            "grid size-8 shrink-0 place-items-center rounded-lg transition-colors duration-150 [&>svg]:size-4",
            running ? "bg-surface-hover text-foreground" : "bg-surface-raised text-muted-foreground"
          )}
        >
          <Icon />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className={cn("text-[0.875rem] font-label text-foreground", phone && "text-[0.9375rem]")}>{words.title}</span>
          <span role={run ? "status" : undefined} className="text-caption text-muted-foreground">
            {context}
          </span>
        </span>
      </div>
      {!call && button}
      {call && (
        <div className={cn("flex gap-2", phone ? "flex-col items-stretch" : "items-center")}>
          {/* flex-1 in the phone's column took the field down to its text's height, so there it's sized outright */}
          <NameField className={phone ? "h-12" : "h-9 flex-1"} onEnter={go} phone={phone} />
          {button}
        </div>
      )}
      {run && <RunBar key={run.at} stage={run.stage} stages={run.stages} />}
    </div>
  )
}
