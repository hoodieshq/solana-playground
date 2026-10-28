import { useEffect, useState } from "react"
import { Axe, Check, Droplets, Expand, Hammer, Paintbrush, Play, Rocket, Send, SquarePlus, X, type LucideIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

import { sameCode } from "../../check"
import { BEATS, LIB, shortKey, type Act, type ActBeat, type Chop, type Grow } from "../../data"
import { flashKeys } from "../../desktop/flash"
import { PRIMARY_KEYS } from "../../desktop/keys"
import { stageMs, useStore, type State, type Turn } from "../../store"
import { NameField } from "../NameField"
import { LiveMemory, MemoryCard } from "../MemoryCard"
import { clock, LivePlayer } from "../PlayerCard"
import { Prose } from "../Prose"
import { ACTION_SOFT, PHONE_CTA, READ_CODE, secs } from "../type"

type ActTurn = Extract<Turn, { kind: "act" }>

const ICON: Record<Act, LucideIcon> = {
  build: Hammer,
  deploy: Rocket,
  buildDeploy: Rocket,
  run: Play,
  call: Send,
  chop: Axe,
  grow: Expand,
  send: SquarePlus,
}

/** A send's icon by what it does: one that writes into the account paints, the rest create one */
const iconOf = (turn: ActTurn) => (turn.act === "send" && (BEATS[turn.beat] as ActBeat).ix === "paint" ? Paintbrush : ICON[turn.act])

/** A deploy whose build is behind the file builds first, and says so */
const buildsFirst = (s: State, act: Act) => act === "deploy" && !(s.builtLib !== null && sameCode(s.builtLib, s.files[LIB]))

/** What the act card says, worked out from the state: a deploy after an edit is Build and deploy */
export function actWords(s: State, turn: ActTurn) {
  const beat = BEATS[turn.beat] as ActBeat
  // Put up again after the faucet said no: the same deploy, as a retry
  if (turn.retry) return { title: beat.title, context: "Asks the faucet again, then deploys", button: "Try again" }
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
  if (turn.faucet) return "The faucet was out of SOL"
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
    case "chop": {
      const chops = turn.chops ?? []
      const wood = chops.filter((c) => c.ok).length
      const back = chops.reduce((n, c) => n + c.refilled, 0)
      const out = chops.some((c) => !c.ok)
      return [`Chopped ${chops.length} ${chops.length === 1 ? "time" : "times"}`, `${wood} wood`, back > 0 && `${back} energy came back`, out && "out of energy"].filter(Boolean).join(" · ")
    }
    case "grow": {
      const grows = turn.grows ?? []
      const top = Math.max(0, ...grows.filter((g) => g.ok).map((g) => g.size))
      const out = grows.find((g) => !g.ok)
      const inPlace = grows.length > 0 && grows.every((g) => g.heap === 0)
      return [top > 0 && `Grew to ${top / 1024} KB`, out && `${top > 0 ? "out" : "Out"} of memory at ${out.heap / 1024} KB`, inPlace && "nothing copied"].filter(Boolean).join(" · ")
    }
    case "send":
      return (BEATS[turn.beat] as ActBeat).record ?? `Sent ${(BEATS[turn.beat] as ActBeat).ix} in ${t}`
  }
}

/** One press of Grow on the card: the size it reached and the heap it took, or the heap it ran out of */
function GrowRow({ g }: { g: Grow }) {
  const kb = (n: number) => `${Math.round(n / 1024)} KB`
  return (
    <li className="flex min-w-0 items-center gap-2 text-caption">
      {g.ok ? <Check aria-hidden="true" className="size-3.5 shrink-0 text-success" /> : <X aria-hidden="true" className="size-3.5 shrink-0 text-error" />}
      <span className={cn("min-w-0 truncate", g.ok ? "text-foreground" : "text-error")}>
        {!g.ok ? `Out of memory · ${kb(g.heap)} copy, 32 KB heap` : g.heap === 0 ? `${kb(g.size)} · read in place, nothing copied` : `${kb(g.size)} · copy in heap ${kb(g.heap)} of 32`}
      </span>
      <span className="ml-auto shrink-0 font-mono text-[0.75rem] text-subtle" title={g.tx.signature}>
        {shortKey(g.tx.signature, 4)}
      </span>
    </li>
  )
}

/** One chop on the card: what came back, newest last. A refusal says the error by name, and how long
 * until energy is back once the program refills */
function ChopRow({ c }: { c: Chop }) {
  return (
    <li className="flex min-w-0 items-center gap-2 text-caption">
      {c.ok ? <Check aria-hidden="true" className="size-3.5 shrink-0 text-success" /> : <X aria-hidden="true" className="size-3.5 shrink-0 text-error" />}
      <span className={cn("min-w-0 truncate", c.ok ? "text-foreground" : "text-error")}>
        {c.ok
          ? `${c.refilled > 0 ? `+${c.refilled} energy while you were away · ` : ""}+1 wood · ${c.energy} energy left`
          : `NotEnoughEnergy · error 6000${c.wait !== undefined ? ` · next energy in ${clock(c.wait)}` : ""}`}
      </span>
      <span className="ml-auto shrink-0 font-mono text-[0.75rem] text-subtle" title={c.tx.signature}>
        {shortKey(c.tx.signature, 4)}
      </span>
    </li>
  )
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

  // Chop until out of energy, Grow until out of memory: once you've made the move by hand, the rest go
  // one after another on their own, each still a transaction on the card, until the program refuses or
  // runs out. That stops it, and so does Stop
  const [auto, setAuto] = useState(false)
  const done = turn.state === "done"
  const moves: { ok: boolean }[] = (turn.act === "chop" ? turn.chops : turn.grows) ?? []
  const refused = moves.some((m) => !m.ok)
  useEffect(() => {
    if (!auto || done) return
    if (refused) return setAuto(false)
    if (s.phase !== "idle") return
    // A beat between moves, so each one lands on the card before the next goes
    const t = window.setTimeout(() => dispatch({ type: "act", act: turn.act }), 250)
    return () => window.clearTimeout(t)
  }, [auto, done, refused, s.phase, dispatch, turn.act])

  if (turn.state === "done") {
    const record = (
      <div className="flex h-9 items-center gap-2 px-3 text-caption text-muted-foreground">
        {turn.faucet ? (
          <Droplets className="size-3.5 text-subtle" aria-hidden="true" />
        ) : turn.failed ? (
          <Hammer className="size-3.5 text-subtle" aria-hidden="true" />
        ) : (
          <Check className="size-3.5 text-success" aria-hidden="true" />
        )}
        <span className="truncate">{actRecord(turn)}</span>
      </div>
    )
    // A grow keeps the map as its last press left it: the copy run red past the heap, or the zero copy
    // map at 40 KB with nothing in the heap. That moment is the step's, so it doesn't fold away
    // 12 on every side of it, as the live card has round its map: 10 over it and 12 under read as a slip
    const last = turn.act === "grow" ? turn.grows?.at(-1) : undefined
    return (
      <div className="rounded-control border border-border bg-(--card-ground)">
        {record}
        {last && <MemoryCard size={last.size} heap={last.heap} zero={last.heap === 0} phone={phone} flat className="border-t border-border p-3" />}
      </div>
    )
  }

  const words = actWords(s, turn)
  const Icon = iconOf(turn)
  // The zero copy map grows to a size, not to the heap's end: its card ends at 40 KB
  const big = turn.act === "grow" && (BEATS[turn.beat] as ActBeat).ix === "grow_big"
  const running = turn.state === "running"
  const run = running ? s.run : null
  const call = turn.act === "call"
  const chop = turn.act === "chop" || turn.act === "grow"
  const chops = turn.chops ?? []
  const grows = turn.grows ?? []
  // Offered after the first move by hand, while every move so far went through: on the steps that end
  // on the refusal or the out of memory. Where one chop passes the step (the refill), the card is done
  // before it shows
  const untilOut = chop && (auto || (moves.length > 0 && !refused && (turn.act === "grow" || (s.player?.energy ?? 0) > 0)))
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
      className={cn("relative shrink-0 px-3", phone ? cn(PHONE_CTA, "text-[0.9375rem]") : chop ? "self-start" : !call && "grow")}
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
        call || chop || phone ? "flex-col items-stretch" : "flex-wrap items-center",
        phone && "gap-4 p-4"
      )}
    >
      <div className={cn("flex min-w-0 items-center gap-3", call || chop || phone ? "flex-1" : "grow-[999] basis-60")}>
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
      {/* A chop shows the account it acts on, and what the chops so far brought back, the last three */}
      {/* Flat, under a hairline: the card is the one block, the account a part of it */}
      {turn.act === "chop" && <LivePlayer phone={phone} flat className="border-t border-border pt-3" />}
      {turn.act === "grow" && <LiveMemory big={big} phone={phone} flat className="border-t border-border pt-3" />}
      {turn.act === "chop" && chops.length > 0 && (
        <ol aria-label="Chops so far" className="flex flex-col gap-1.5 px-0.5">
          {chops.slice(-3).map((c) => (
            <ChopRow key={c.at} c={c} />
          ))}
        </ol>
      )}
      {turn.act === "grow" && grows.length > 0 && (
        <ol aria-label="Grows so far" className="flex flex-col gap-1.5 px-0.5">
          {grows.slice(-3).map((g) => (
            <GrowRow key={g.at} g={g} />
          ))}
        </ol>
      )}
      {!call && !untilOut && button}
      {untilOut && (
        <div className={cn("flex gap-2", phone ? "flex-col items-stretch" : "flex-wrap items-center")}>
          {button}
          <Button
            size="lg"
            variant="ghost"
            onClick={() => setAuto(!auto)}
            className={cn("shrink-0 px-3", ACTION_SOFT, phone && cn(PHONE_CTA, "text-[0.9375rem]"))}
          >
            {auto ? "Stop" : big ? "Grow to 40 KB" : turn.act === "grow" ? "Grow until out of memory" : "Chop until out of energy"}
          </Button>
        </div>
      )}
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
