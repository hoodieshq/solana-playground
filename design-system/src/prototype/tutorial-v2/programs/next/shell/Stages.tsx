import { Play } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Kbd } from "@/components/ui/kbd"
import { Spinner } from "@/components/ui/spinner"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

import { PRIMARY_KEYS } from "../../../desktop/keys"
import { LIT_STROKE } from "../../../desktop/navLit/icons"
import { readPath } from "../../read"
import { behind, build, busy, call, deploy, firstIx, metaOf, onChain, refCall, retryDeploy, runClient, setPane, setTerminal, stale, steps, type Project, type StepState } from "../../store"
import { deployingText, lastResult } from "./util"

/* The project's loop in the bar: Write, Build, Deploy, Interact (the client, 17 Nov: a mid or senior
   engineer should see the whole program at once and know which step is next, as v2's stage bar showed).
   One pattern, the tutorial's (Nikita, 20 Nov: words between slashes read as breadcrumbs, and some ran
   things while others switched the view): the track only says where you are, the button beside it does
   the next thing, and Interact is a view, a tab beside the files */

const mac = /Mac|iPhone|iPad/.test(navigator.userAgent)
export const BUILD_KEYS = mac ? "⌘⇧B" : "Ctrl Shift B"

type Stage = {
  id: "write" | "build" | "deploy" | "call"
  label: string
  /** "off": the stage can't run for this program at all, and says why */
  state: StepState | "off"
  tip: string
  keys?: string
  pressed?: boolean
  disabled?: boolean
  run: () => void
}

/** A run's output is what it printed: the console comes up with it */
const runAndShow = (id: string) => {
  setTerminal(id, true)
  runClient(id)
}


export function stagesOf(p: Project): Stage[] {
  const id = p.id
  const code: Stage = { id: "write", label: p.read ? "Read" : "Write", state: "done", tip: p.read ? "The program's code, read only" : "The code", pressed: p.pane === "code", run: () => setPane(id, "code") }
  const meta = metaOf(p)

  if (p.read && meta) {
    const failed = lastResult(p)?.k === "call-fail"
    // Build and Deploy aren't listed: two stages that can never run said nothing (Almaz, 18 Nov)
    const out: Stage[] = [code]
    if (readPath(meta).includes("call"))
      out.push({
        id: "call",
        label: "Interact",
        state: p.calling ? "running" : p.lastCallOkAt ? "done" : failed ? "failed" : "current",
        tip: failed ? `Call ${meta.first} on Solana's copy again` : `Call ${meta.first} on Solana's copy on devnet`,
        run: () => {
          setTerminal(id, true)
          refCall(id)
        },
      })
    return out
  }

  const list = steps(p)
  if (p.framework === "ts-client") return [code, { id: "call", label: "Run", state: list[0].state, tip: "Run client.ts", keys: BUILD_KEYS, run: () => runAndShow(id) }]

  const [b0, d, c] = list
  const chain = onChain(p)
  // Out of date whenever the code moved, also once deployed: a deploy builds first, and the bar says so
  const b = { ...b0, state: b0.state === "done" && (stale(p) || behind(p)) ? ("stale" as const) : b0.state }
  const built = p.build.s === "ok" && !stale(p)
  // A native starter has no IDL: its client.ts run is the call
  const runs = p.framework === "native" && !p.idl
  return [
    code,
    { id: "build", label: "Build", state: b.state, tip: b.state === "failed" ? "The build failed. Build again" : b.state === "stale" ? "The code changed since the last build" : "Build", keys: BUILD_KEYS, run: () => build(id) },
    {
      id: "deploy",
      label: "Deploy",
      state: d.state,
      tip: d.state === "failed" ? "The deploy failed. Try again" : `${chain ? (d.state === "stale" ? "The code changed. Upgrade on devnet" : "Upgrade on devnet") : "Deploy to devnet"}${built ? "" : ", builds first"}`,
      run: () => (p.deployFailed ? retryDeploy(id) : deploy(id)),
    },
    runs
      ? { id: "call", label: "Run", state: c.state, tip: chain ? "Run client.ts against your program" : "Deploy first: client.ts calls your program on devnet", disabled: !chain, run: () => runAndShow(id) }
      : {
          id: "call",
          label: "Interact",
          state: c.state,
          tip: chain || p.build.s === "ok" ? "Call an instruction" : "Build first: the call form is read from the build",
          pressed: p.pane === "call",
          disabled: !(chain || p.build.s === "ok"),
          // The action calls the first instruction with the form's values and shows the answer in Interact;
          // with no IDL yet there is nothing to call, so it opens the steps to get one
          run: () => {
            const ix = p.ix ?? firstIx(p)
            setPane(id, "call", ix ?? undefined)
            if (p.idl && ix && chain) call(id, ix, "panel")
          },
        },
  ]
}

const NEXT: (StepState | "off")[] = ["current", "stale"]

/** The stage to do now: the first one waiting, or the one that failed */
const nextOf = (list: Stage[]) => list.find((s) => (NEXT.includes(s.state) || s.state === "failed") && !s.disabled)

/** ⌘↵ from anywhere but the composer: the button's action */
export function runNext(p: Project) {
  if (!busy(p)) nextOf(stagesOf(p))?.run()
}

/** The stage to do now, for the assistant's note */
export const nextStageOf = (p: Project) => nextOf(stagesOf(p))

/** Where the project is and what to do next, in words beside the stages: a colour and a dot alone left
 * it to be guessed (research/programs-ide, 18 Nov) */
export function stageHint(p: Project): string | null {
  if (p.opening) return null
  if (p.build.s === "running") return p.chain ? "Building, then deploying" : "Building"
  if (p.deploy.s === "running") return deployingText(p.deploy)
  if (p.calling) return p.calling.ix === "client.ts" ? "Running client.ts" : `Calling ${p.calling.ix}`
  const list = stagesOf(p)
  const next = nextOf(list)
  // All done: the way on, where the feed's closing card used to say it. A read program says why there is no next step
  if (!next) return p.read ? "Read only: Playground can't build Native programs yet" : p.framework === "ts-client" ? "Change client.ts and run it again" : "Live on devnet"
  if (p.read) return next.state === "failed" ? "The call failed. Try again" : `Call ${metaOf(p)?.first ?? "it"} on Solana's copy`
  if (p.framework === "ts-client") return next.state === "stale" ? "client.ts changed. Run it again" : "Run client.ts to see what it prints"
  const chain = onChain(p)
  switch (next.id) {
    case "build":
      return next.state === "failed" ? "Build failed. Fix the line and build again" : next.state === "stale" ? (chain ? "Code changed since the deploy. Build it" : "Code changed since the last build") : "Not built yet"
    case "deploy":
      return next.state === "failed" ? "Deploy failed. Try again" : chain ? "Built. Deploy to upgrade it on devnet" : "Built. Deploy it to devnet"
    default:
      return next.label === "Run" ? "On devnet. Run client.ts to call it" : p.idl ? "On devnet. Call an instruction" : "On devnet. The call form needs its IDL"
  }
}

/** One segment a stage, the tutorial's 4px bar: done ones lit in one sweep of the brand's gradient, a
 * failed one red, one the code moved past amber */
/** The stages as one ring before the words: a whole grey track, and an arc over it as long as the share of
 * stages done. One continuous ring, not an arc a stage: four pieces read as four things (Almaz, 20 Nov).
 * The arc takes the colour of what stands: red after a failure, amber when the code changed after a build */
function StageRing({ list }: { list: Stage[] }) {
  const r = 8
  const c = 2 * Math.PI * r
  const done = list.filter((s) => s.state === "done").length
  const tone = list.some((s) => s.state === "failed") ? "stroke-error" : list.some((s) => s.state === "stale") ? "stroke-warning" : "stroke-muted-foreground"
  const running = list.some((s) => s.state === "running")
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" width={16} height={16} className="shrink-0 -rotate-90">
      <circle cx="10" cy="10" r={r} fill="none" strokeWidth={LIT_STROKE} className="stroke-border-strong" />
      {done > 0 && (
        <circle
          cx="10"
          cy="10"
          r={r}
          fill="none"
          strokeWidth={LIT_STROKE}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - done / list.length)}
          className={cn(tone, running && "animate-pulse", "transition-[stroke-dashoffset] duration-500 ease-out motion-reduce:transition-none")}
        />
      )}
    </svg>
  )
}

/** Where the project is, as the tutorial shows its steps: the ring, then "Step 2 of 4 · Build", on one line.
 * It only shows; nothing in it runs or switches the view */
export function StageTrack({ p, className }: { p: Project; className?: string }) {
  const list = stagesOf(p)
  if (list.length < 2) return null
  const at = list.find((s) => s.state === "running") ?? nextOf(list)
  const n = at ? list.indexOf(at) + 1 : list.length
  const word = at ? (at.state === "failed" ? `${at.label} failed` : at.state === "stale" ? `${at.label} · code changed` : at.label) : p.read || p.framework === "ts-client" ? null : "Live on devnet"
  return (
    <div role="status" aria-label={at ? `Step ${n} of ${list.length}, ${word}` : "Every step done"} className={cn("flex min-w-0 items-center gap-2", className)}>
      <StageRing list={list} />
      <span className="flex min-w-0 items-center gap-1.5 text-13 leading-4 whitespace-nowrap">
        <span className="text-muted-foreground tabular-nums">{at ? `Step ${n} of ${list.length}` : "Done"}</span>
        {word && (
          <>
            <span aria-hidden="true" className="text-subtle">
              ·
            </span>
            <span className={cn("truncate font-act", at?.state === "failed" ? "text-error" : "text-foreground")}>{word}</span>
          </>
        )}
      </span>
    </div>
  )
}

/** The next step's own words on its button */
function actionWord(p: Project, s: Stage): string {
  switch (s.id) {
    case "build":
      return s.state === "failed" ? "Build again" : "Build"
    case "deploy":
      return s.state === "failed" ? "Deploy again" : onChain(p) ? "Upgrade" : "Deploy"
    case "call":
      if (s.label === "Run") return "Run client.ts"
      if (p.read) return `Call ${metaOf(p)?.first ?? "it"}`
      return p.idl ? `Call ${p.ix ?? firstIx(p) ?? "it"}` : "Get the IDL"
    default:
      return s.label
  }
}

/** What runs now, in a word, while it runs */
const runningWord = (p: Project) => (p.build.s === "running" ? "Building" : p.deploy.s === "running" ? "Deploying" : p.calling?.ix === "client.ts" ? "Running" : "Calling")

/** The one action: the next step, named for what it does, as the tutorial's card button is. While a run
 * goes, it holds its place with a spinner. Every step done, there's nothing to press */
export function StageAction({ p, className }: { p: Project; className?: string }) {
  const next = nextOf(stagesOf(p))
  const running = busy(p) && !p.opening
  // On Interact, the next thing is the panel's own button (Call, or the IDL's steps): not a second one here
  if ((!next || (next.id === "call" && p.pane === "call")) && !running) return null
  const label = running ? runningWord(p) : actionWord(p, next!)
  return (
    <Tooltip delayDuration={300}>
      <TooltipTrigger asChild>
        <Button data-oak={next?.id} size="sm" disabled={running} aria-busy={running || undefined} onClick={() => next?.run()} className={cn("relative shrink-0 gap-1.5", className)}>
          {running && <Spinner className="size-3.5" />}
          {label}
        </Button>
      </TooltipTrigger>
      {!running && next && (
        <TooltipContent side="bottom">
          {next.tip}
          <Kbd className="ml-1.5">{PRIMARY_KEYS}</Kbd>
        </TooltipContent>
      )}
    </Tooltip>
  )
}

/** Interact as a view: a tab after the files, the form and the IDL in place of the code. Only for a
 * program called from the form (a native starter runs client.ts instead) */
export function InteractTab({ p, className }: { p: Project; className?: string }) {
  const stage = stagesOf(p).find((s) => s.id === "call" && s.label === "Interact")
  if (!stage || p.opening) return null
  const on = p.pane === "call"
  const tab = (
    <button
      type="button"
      role="tab"
      aria-selected={on}
      disabled={stage.disabled}
      onClick={() => setPane(p.id, "call")}
      className={cn(
        "flex h-full shrink-0 items-center gap-1.5 px-3 text-13 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset disabled:text-subtle",
        on ? "bg-(--code-ground) text-foreground" : "text-muted-foreground enabled:hover:text-foreground",
        className
      )}
    >
      <Play aria-hidden="true" strokeWidth={1.75} className="size-3.5" />
      Interact
    </button>
  )
  if (!stage.disabled) return tab
  return (
    <Tooltip delayDuration={300}>
      <TooltipTrigger asChild>
        <span className="flex h-full">{tab}</span>
      </TooltipTrigger>
      <TooltipContent side="bottom">{stage.tip}</TooltipContent>
    </Tooltip>
  )
}
