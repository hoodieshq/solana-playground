import { Fragment } from "react"
import { Check, X } from "lucide-react"

import { Kbd } from "@/components/ui/kbd"
import { Spinner } from "@/components/ui/spinner"
import { StatusDot } from "@/components/ui/status-dot"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

import { PRIMARY_KEYS } from "../../../desktop/keys"
import { FOCUS } from "../../../ui/type"
import { readPath } from "../../read"
import { behind, build, busy, call, deploy, firstIx, metaOf, onChain, refCall, retryDeploy, runClient, setPane, setTerminal, stale, steps, type Project, type StepState } from "../../store"
import { lastResult } from "./util"

/* The project's loop in the bar: Write, Build, Deploy, Interact (the client, 17 Nov: a mid or senior
   engineer should see the whole program at once and know which step is next, as v2's stage bar showed).
   The path names the stages and marks the done ones; the next one is the button, in the path itself */

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
          run: () => setPane(id, p.pane === "call" ? "code" : "call"),
        },
  ]
}

const NEXT: (StepState | "off")[] = ["current", "stale"]

/** The stage to do now: the first one waiting, or the one that failed */
const nextOf = (list: Stage[]) => list.find((s) => (NEXT.includes(s.state) || s.state === "failed") && !s.disabled)

/** ⌘↵ from anywhere but the composer */
export function runNext(p: Project) {
  if (busy(p)) return
  const next = nextOf(stagesOf(p))
  // With the Call panel open the key is the panel's: it sends the picked instruction, it doesn't close the panel
  if (next?.id === "call" && next.pressed) {
    const ix = p.ix ?? firstIx(p)
    if (p.idl && ix) call(p.id, ix, "panel")
    return
  }
  next?.run()
}

/** The stage to do now, for the assistant's note */
export const nextStageOf = (p: Project) => nextOf(stagesOf(p))

/** Where the project is and what to do next, in words beside the stages: a colour and a dot alone left
 * it to be guessed (research/programs-ide, 18 Nov) */
export function stageHint(p: Project): string | null {
  if (p.opening) return null
  if (p.build.s === "running") return p.chain ? "Building, then deploying" : "Building"
  if (p.deploy.s === "running") return `Deploying · ${p.deploy.stages[p.deploy.stage]}`
  if (p.calling) return p.calling.ix === "client.ts" ? "Running client.ts" : `Calling ${p.calling.ix}`
  const list = stagesOf(p)
  const next = nextOf(list)
  // All done: the way on, where the feed's closing card used to say it. A read program says why there is no next step
  if (!next) return p.read ? "Read only: Playground can't build Native programs yet" : p.framework === "ts-client" ? "Change client.ts and run it again" : "Live on devnet. Change the code to upgrade it"
  if (p.read) return next.state === "failed" ? "The call failed. Try again" : `Call ${metaOf(p)?.first ?? "it"} on Solana's copy`
  if (p.framework === "ts-client") return next.state === "stale" ? "client.ts changed. Run it again" : "Run client.ts to see what it prints"
  const chain = onChain(p)
  switch (next.id) {
    case "build":
      return next.state === "failed" ? "Build failed. Fix the line and build again" : next.state === "stale" ? (chain ? "Code changed since the deploy. Build it" : "Code changed since the last build") : "Build to check the code"
    case "deploy":
      return next.state === "failed" ? "Deploy failed. Try again" : chain ? "Built. Deploy to upgrade it on devnet" : "Built. Deploy it to devnet"
    default:
      return next.label === "Run" ? "On devnet. Run client.ts to call it" : p.idl ? "On devnet. Call an instruction" : "On devnet. The call form needs its IDL"
  }
}

/** A stage's mark before its name: a tick once done, a cross when it failed, a dot when the code moved
 * on since. One waiting has none: its place in the path says it */
function Mark({ state }: { state: Stage["state"] }) {
  if (state === "running") return <Spinner className="size-3" />
  if (state === "failed") return <X aria-hidden="true" strokeWidth={2.5} className="size-3 text-error" />
  if (state === "stale") return <StatusDot variant="warning" />
  if (state === "done") return <Check aria-hidden="true" strokeWidth={2.5} className="size-3 text-success" />
  return null
}

/** The path, and the one thing to do now inside it: the stages as words in a row, the next one on a soft
 * purple tint, the same height as the rest, its key in the tip. A solid brand button with a key cap in it
 * stood on the row like a part from another screen (Almaz, 18 Nov). Every stage is the same box, so the
 * words keep one step from slash to slash whether or not a box is tinted. No second button at the bar's other end (Almaz, 18 Nov: the path should say
 * the next step by itself). The rest stay quiet words: a done one ticked, still a way back to its pane or
 * to run it again */
export function StageBar({ p, className }: { p: Project; className?: string }) {
  const list = stagesOf(p)
  const next = nextOf(list)
  const running = busy(p)
  if (list.length < 2) return null
  return (
    <nav aria-label="Stages" className={cn("flex shrink-0 items-center gap-1.5", className)}>
      {list.map((s, i) => {
        // Open on Interact, the next thing is in the panel (its Call button), not this word again
        const here = s.id === "call" && !!s.pressed
        const lit = s === next && !running && !here
        const off = s.state === "off" || !!s.disabled
        return (
          <Fragment key={s.id}>
            {i > 0 && (
              <span aria-hidden="true" className="text-[0.875rem] text-subtle">
                /
              </span>
            )}
            <Tooltip delayDuration={300}>
              <TooltipTrigger asChild>
                {/* A span keeps the tip on a stage that can't run */}
                <span className="inline-flex">
                  <button
                    type="button"
                    data-oak={s.id}
                    disabled={off || (running && s.id !== "write")}
                    aria-pressed={s.pressed}
                    aria-current={lit || s.state === "running" ? "step" : undefined}
                    aria-busy={s.state === "running" || undefined}
                    onClick={s.run}
                    className={cn(
                      "relative flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-[0.875rem] whitespace-nowrap transition-colors duration-100 motion-reduce:transition-none pointer-coarse:h-9 pointer-coarse:after:absolute pointer-coarse:after:-inset-y-1 pointer-coarse:after:inset-x-0 pointer-coarse:after:content-['']",
                      FOCUS,
                      lit
                        ? "bg-primary/20 font-medium text-foreground hover:bg-primary/30"
                        : s.state === "running"
                          ? "font-medium text-foreground"
                          : here
                            ? "bg-surface-hover font-medium text-foreground"
                            : off
                              ? "text-subtle"
                              : "text-muted-foreground enabled:hover:bg-surface-hover enabled:hover:text-foreground"
                    )}
                  >
                    <Mark state={s.state} />
                    {s.label}
                  </button>
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {s.tip}
                {(lit || s.keys) && <Kbd className="ml-1.5">{lit ? PRIMARY_KEYS : s.keys}</Kbd>}
              </TooltipContent>
            </Tooltip>
          </Fragment>
        )
      })}
    </nav>
  )
}

/** Where the project stands and what the lit stage does, in words beside the path. A read only program
 * has no stage to run: the line says why */
export function StageNote({ p, className }: { p: Project; className?: string }) {
  const hint = stageHint(p)
  if (p.opening || !hint) return null
  return (
    /* A caption, not a fifth stage: a size down from the path's words (Almaz, 18 Nov: in the same grey at
       nearly the same size it read as one more step after Interact) */
    <p role="status" className={cn("min-w-0 truncate text-[0.75rem] leading-4 text-muted-foreground", className)}>
      {hint}
    </p>
  )
}
