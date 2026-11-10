import { useState } from "react"
import { Check, Compass, Database, FileQuestion, Hammer, ListTree, Play, Rocket, Send, SlidersHorizontal, type LucideIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { RunCard, RunCardAction, RunCardContent, RunCardDescription, RunCardHeader, RunCardIcon, RunCardProgress, RunCardTitle } from "@/components/ui/run-card"
import { StatusDot } from "@/components/ui/status-dot"
import { cn } from "@/lib/utils"

import { Prose } from "../../../ui/Prose"
import { ACTION, ACTION_FILL, ACTION_SOFT, READ_CODE } from "../../../ui/type"
import {
  ask,
  BUILD_MS,
  build,
  busy,
  CALL_MS,
  call,
  deploy,
  firstIx,
  ixsOf,
  metaOf,
  runClient,
  setPane,
  setValue,
  SLOW_MS,
  STAGE_MS,
  stale,
  uploadIdl,
  usePrograms,
  blocked,
  valuesFor,
  type Act,
  type Project,
} from "../../store"
import { IdlGuide } from "./IdlGuide"
import { QUIET } from "./parts"
import { QuotaCard, QuotaLine } from "./Quota"
import { RefCallCard, StopCard } from "./Read"
import { baseName, firstChanged } from "./util"

const ICON: Record<Act, LucideIcon> = { build: Hammer, deploy: Rocket, upgrade: Rocket, call: Send, "no-idl": FileQuestion, run: Play, overview: Compass, instructions: ListTree, accounts: Database }

/** The upgrade landed and no call has checked it yet */
const justUpgraded = (p: Project) => p.deploy.s === "ok" && p.deploy.count > 1

/** The deploy's stages as rows inside the card while it runs: done ticks, the running dot, pending rings */
function Stages({ stages, stage }: { stages: string[]; stage: number }) {
  return (
    <ol aria-label="Deploy stages" className="flex flex-col border-t border-border pt-2">
      {stages.map((s, i) => (
        <li key={s} className={cn("flex h-6 items-center gap-2.5 text-[0.8125rem] leading-5", i > stage ? "text-muted-foreground" : "text-foreground")}>
          <span aria-hidden="true" className="grid size-3.5 shrink-0 place-items-center">
            {i < stage ? <Check strokeWidth={2.5} className="size-3.5 text-success" /> : i === stage ? <StatusDot variant="running" size="lg" /> : <span className="size-2.5 rounded-full border border-border-strong" />}
          </span>
          <span className="min-w-0 flex-1 truncate">{s}</span>
        </li>
      ))}
    </ol>
  )
}

/** The Guide's live card: the one primary in the column. Build, Deploy, Build and deploy, Call, No
 * IDL or Run client.ts, from liveAction. Running, the context gives way to the stage and a bar fills
 * along the foot; whatever runs shows here, a head Build or a panel call included */
export function ActCard({ p, act, retry = false }: { p: Project; act: Act; retry?: boolean }) {
  const funded = usePrograms((s) => s.funded)
  const full = usePrograms((s) => blocked(p, s))
  // Read mode: a stop's card, or the call on Solana's copy
  if (p.read) return act === "call" ? <RefCallCard p={p} /> : act === "overview" || act === "instructions" || act === "accounts" ? <StopCard p={p} stop={act} /> : null
  // The first deploy would save an 11th project: the quota card stands in the Deploy card's place
  if (act === "deploy" && full && p.deploy.s !== "running") return <QuotaCard p={p} />
  const running = busy(p)
  const id = p.id
  const name = p.name
  const cost = metaOf(p)?.cost ?? 0.48
  const Icon = ICON[act]

  if (act === "no-idl") return <NoIdlCard p={p} running={running} />

  const ix = firstIx(p) ?? ""
  const ixDef = ixsOf(p).find((i) => i.name === ix)
  const values = valuesFor(p, ix)

  const words = (() => {
    switch (act) {
      case "build":
        return {
          title: "Build",
          context: stale(p) ? `\`${baseName(firstChanged(p))}\` changed since the last build.` : `Compiles ${name} and reads its instructions.`,
          button: retry ? "Try again" : "Build",
          go: () => build(id),
        }
      case "deploy":
        return {
          title: "Deploy to devnet",
          context: funded
            ? `Your Playground wallet pays about ${cost} devnet SOL. It's free test money.`
            : `Your Playground wallet gets free test SOL from the faucet first, then pays about ${cost} for the deploy.`,
          button: "Deploy",
          go: () => deploy(id),
        }
      case "upgrade":
        return {
          title: "Build and deploy",
          context: `\`${baseName(firstChanged(p))}\` changed since the deploy. This builds it and upgrades ${name} in place, with the same program id.`,
          button: "Build and deploy",
          go: () => deploy(id),
        }
      case "run":
        return {
          title: "Run client.ts",
          context: p.ranSrc ? "`client.ts` changed since the last run. Run it again to see what it prints now." : "Calls the Memo program on devnet and prints what comes back.",
          button: "Run client.ts",
          go: () => runClient(id),
        }
      default:
        return {
          title: `Call ${ix}`,
          context: justUpgraded(p) ? "The new code is live. Call it to check." : (ixDef?.line ?? "Sends a transaction and shows what the program logs."),
          button: `Call ${ix}`,
          go: () => call(id, ix, "guide"),
        }
    }
  })()

  // While it runs, the stage takes the context's place. A deploy keeps its context: the stage rows under it
  // already say which stage runs, and a line repeating it with "2 of 3" was the same news twice
  const stageLine = (() => {
    if (p.build.s === "running") return p.build.slow ? "Still compiling. The build server may be busy. It keeps running." : `Compiling ${name}`
    if (p.calling) return p.calling.ix === "client.ts" ? "Running client.ts" : `Sending ${p.calling.ix} to devnet`
    return null
  })()

  const progress =
    p.build.s === "running" ? (
      <RunCardProgress key="build" stage={0} stages={1} duration={p.build.slow || p.force.build === "slow" ? SLOW_MS : BUILD_MS} />
    ) : p.deploy.s === "running" ? (
      <RunCardProgress key="deploy" stage={p.deploy.stage} stages={p.deploy.stages.length} duration={STAGE_MS} />
    ) : p.calling ? (
      <RunCardProgress key="call" stage={0} stages={1} duration={CALL_MS} />
    ) : null

  const isCall = act === "call"
  const button = (
    <RunCardAction
      className={ACTION_FILL}
      onClick={words.go}
      {...(act === "run" ? { "data-oak": "run" } : act === "build" ? { "data-oak": "build-card" } : {})}
    >
      {words.button}
    </RunCardAction>
  )
  const deployish = act === "deploy" || act === "upgrade"

  return (
    <RunCard data-live-card orientation={isCall || deployish ? "vertical" : "horizontal"} state={running ? "running" : "idle"} className="mt-2">
      <RunCardHeader>
        <RunCardIcon>
          <Icon />
        </RunCardIcon>
        <RunCardContent>
          <RunCardTitle>
            {/* The name in the code face without a chip: the chip in a heading read as noise (Almaz, 6 Nov) */}
            {isCall ? (
              <>
                Call <span className="font-mono text-[0.9375rem]">{ix}</span>
              </>
            ) : (
              words.title
            )}
          </RunCardTitle>
          <RunCardDescription className="text-pretty">{stageLine ?? <Prose text={words.context} {...READ_CODE} small />}</RunCardDescription>
        </RunCardContent>
      </RunCardHeader>
      {deployish && p.deploy.s === "running" && <Stages stages={p.deploy.stages} stage={p.deploy.stage} />}
      {act === "deploy" && p.deploy.s !== "running" && <QuotaLine p={p} />}
      {isCall ? (
        <div className="flex flex-col gap-3 pl-11">
          {ixDef?.args.map((a) => (
            <label key={a.name} className="flex flex-col gap-1.5">
              <span className="flex items-baseline gap-2 text-[0.8125rem] leading-5">
                <span className="font-mono text-foreground">{a.name}</span>
                <span className="text-muted-foreground">{a.type}</span>
              </span>
              <Input
                value={values[a.name] ?? ""}
                onChange={(e) => setValue(id, ix, a.name, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !running) {
                    e.preventDefault()
                    words.go()
                  }
                }}
                readOnly={running}
                autoComplete="off"
                data-1p-ignore
                aria-label={`${a.name}, ${a.type}`}
                className="h-9 font-mono text-[0.8125rem] md:text-[0.8125rem]"
              />
            </label>
          ))}
          {/* The panel as a quiet action, like Copy id and Log on the cards above, not an underlined sentence */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {button}
            <button type="button" onClick={() => setPane(id, "call", ix)} className={cn(QUIET, "ml-auto")}>
              <SlidersHorizontal aria-hidden="true" strokeWidth={1.75} className="size-3.5" />
              Call panel
            </button>
          </div>
          {!!ixDef?.accounts.length && <p className="text-[0.8125rem] leading-5 text-muted-foreground">Accounts are filled in: your wallet signs.</p>}
        </div>
      ) : deployish ? (
        <div className="pl-11">{button}</div>
      ) : (
        button
      )}
      {progress}
    </RunCard>
  )
}

/** No IDL: a native program makes none, so it calls through client.ts or an uploaded one; an Anchor
 * program on the new build server makes none either, so the card's primary is the guide to build it
 * locally (the product's "Build the IDL locally"), and Upload IDL beside it */
function NoIdlCard({ p, running }: { p: Project; running: boolean }) {
  const [guide, setGuide] = useState(false)
  const id = p.id
  const Icon = ICON["no-idl"]
  const client = p.framework === "native" && "client/client.ts" in p.files
  const anchor = p.framework !== "native"
  return (
    <RunCard data-live-card orientation="vertical" state={running ? "running" : "idle"} className="mt-2">
      <RunCardHeader>
        <RunCardIcon>
          <Icon />
        </RunCardIcon>
        <RunCardContent>
          <RunCardTitle>{anchor ? "No IDL yet" : client ? "No IDL for this program" : "No call form for this program"}</RunCardTitle>
          <RunCardDescription>
            {running
              ? "Running client.ts"
              : anchor
                ? "The call form is built from an IDL, the list of a program's instructions. Playground's build server doesn't make one yet: build it on your machine, then upload it."
                : client
                  ? "The call form is built from an IDL, the list of a program's instructions. Native programs don't make one when they build."
                  : "The call form is built from an IDL, a list of a program's instructions. Native programs don't make one when they build. Upload one made with Shank or Codama."}
          </RunCardDescription>
        </RunCardContent>
      </RunCardHeader>
      <div className="flex flex-wrap gap-2 pl-11">
        {anchor ? (
          <>
            <RunCardAction className={ACTION_FILL} onClick={() => setGuide(true)}>
              Build the IDL locally
            </RunCardAction>
            <Button variant="ghost" className={cn(ACTION, ACTION_SOFT)} onClick={() => uploadIdl(id)}>
              Upload IDL
            </Button>
          </>
        ) : client ? (
          <>
            <RunCardAction className={ACTION_FILL} onClick={() => runClient(id)}>
              Run client.ts
            </RunCardAction>
            <Button variant="ghost" disabled={running} className={cn(ACTION, ACTION_SOFT)} onClick={() => uploadIdl(id)}>
              Upload IDL
            </Button>
          </>
        ) : (
          <>
            <RunCardAction className={ACTION_FILL} onClick={() => uploadIdl(id)}>
              Upload IDL
            </RunCardAction>
            <Button variant="ghost" className={cn(ACTION, ACTION_SOFT)} onClick={() => ask(id, "What is an IDL?")}>
              Ask the assistant
            </Button>
          </>
        )}
      </div>
      {running && <RunCardProgress stage={0} stages={1} duration={CALL_MS} />}
      {anchor && <IdlGuide p={p} open={guide} onOpenChange={setGuide} />}
    </RunCard>
  )
}
