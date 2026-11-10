import { useEffect, useRef, useState } from "react"
import { BookOpen, CircleCheck, Compass, Database, ExternalLink, ListTree, Send, type LucideIcon } from "lucide-react"

import { CodeQuote, CodeQuoteAction, CodeQuoteHeader, CodeQuoteLine, CodeQuoteTitle } from "@/components/ui/code-quote"
import { CopyButton } from "@/components/ui/copy-button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { RunCard, RunCardAction, RunCardContent, RunCardDescription, RunCardHeader, RunCardIcon, RunCardProgress, RunCardTitle } from "@/components/ui/run-card"
import { StatusDot } from "@/components/ui/status-dot"
import { Tag } from "@/components/ui/tag"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

import { bytesOf } from "../../../lessons/common"
import { highlight } from "../../../ui/CodeView"
import { openExplorer } from "../../../ui/explorer"
import { Prose } from "../../../ui/Prose"
import { ACTION_FILL, FOCUS, LISTING, READ, READ_CODE } from "../../../ui/type"
import { view } from "../../../view"
import { CATALOG, ixSignature, type ProgramMeta } from "../../data"
import { STOP_CONTEXT, STOP_LABEL, WHY, accountLine, chipsFor, instructionsLead, isSigner, ixRef, overview, type Part, type Ref } from "../../read"
import { ask, metaOf, openFile, openProgram, refCall, runLive, setNotice, setValue, STAGE_MS, valuesFor, type Project, type Turn } from "../../store"
import { CHIP_BUTTON, NextRow, QUIET, Well } from "./parts"
import { baseName, copyText, flash, flashReadOnly, onFlashReadOnly, onReveal, reveal, saidLines, shortKey } from "./util"

/* Read mode's pieces (CONSENSUS-delta 2.3 to 2.6): the stop cards and their answers, line links and the
   neutral lit range, the call on Solana's copy for memo and noop, the done card, the Read only and devnet
   chips in the workspace head, and the notice a keystroke brings in the read only editor */

const touch = view === "phone" || view === "portrait"

type T<K extends Turn["k"]> = Extract<Turn, { k: K }>

// ----- Line links and the lit range -----------------------------------------------------------------

/** A 44 tall hit layer under a finger, for the small inline controls */
const TOUCH_HIT = "pointer-coarse:after:absolute pointer-coarse:after:-inset-y-2.5 pointer-coarse:after:inset-x-0 pointer-coarse:after:content-['']"

const range = (r: Ref) => (r.to && r.to !== r.from ? `${baseName(r.file)}:${r.from} to ${r.to}` : `${baseName(r.file)}:${r.from}`)

/** Opens the file, brings the range to a third of the height and lights it until the next press */
const show = (p: Project, r: Ref) => {
  openFile(p.id, r.file)
  reveal(r.file, r.from, { to: r.to, lit: true })
}

/** `processor.rs:30 to 34`: mono 13, muted, a button at the end of its sentence */
function LineLink({ p, r }: { p: Project; r: Ref }) {
  return (
    <button
      type="button"
      onClick={() => show(p, r)}
      className={cn("relative rounded-[4px] font-mono text-[0.8125rem] text-muted-foreground underline-offset-[3px] hover:text-foreground hover:underline", TOUCH_HIT, FOCUS)}
    >
      {range(r)}
    </button>
  )
}

/** Words with line links between them */
function Parts({ p, parts }: { p: Project; parts: Part[] }) {
  return (
    <p className={READ}>
      {parts.map((x, i) => (typeof x === "string" ? <Prose key={i} text={x} {...READ_CODE} /> : <LineLink key={i} p={p} r={x} />))}
    </p>
  )
}

/** The range a line link lit in this file: the editor draws it as written lines, in the neutral tint */
export function useLit(file: string) {
  const [lit, setLit] = useState<{ file: string; from: number; to: number; at: number } | null>(null)
  useEffect(() => onReveal((d) => d.lit && setLit({ file: d.file, from: d.line, to: d.to ?? d.line, at: Date.now() })), [])
  if (!lit || lit.file !== file) return { written: [], arrive: 0 }
  return { written: Array.from({ length: lit.to - lit.from + 1 }, (_, i) => lit.from + i), arrive: lit.at }
}

/** The editor's written lines in a neutral tint: an explanation lights code, it didn't write it, so no green */
export const LIT_CSS = `
.prog-lit pre > div[class~="border-foreground/25"] { background-color: color-mix(in srgb, var(--foreground) 4%, transparent); }
.prog-lit .pg-arrive { animation-name: prog-lit-arrive; }
@keyframes prog-lit-arrive { from { background-color: color-mix(in srgb, var(--foreground) 14%, transparent); } }`

/** Up to three lines of a file, stacked; a longer range quotes its first two */
function Quote({ p, r }: { p: Project; r: Ref }) {
  const all = (p.files[r.file] ?? "").split("\n")
  const to = r.to ?? r.from
  const lines = all.slice(r.from - 1, to - r.from + 1 > 3 ? r.from + 1 : to)
  return (
    <CodeQuote>
      <CodeQuoteHeader>
        <CodeQuoteTitle>{range(r)}</CodeQuoteTitle>
        <CodeQuoteAction onClick={() => show(p, r)}>Show in {baseName(r.file)}</CodeQuoteAction>
      </CodeQuoteHeader>
      {lines.map((l, i) => (
        <CodeQuoteLine key={i}>{highlight(l.trim())}</CodeQuoteLine>
      ))}
    </CodeQuote>
  )
}

// ----- Chips ------------------------------------------------------------------------------------------

/** The turn the reader is on: the last one that isn't a card waiting below it */
const lastSpoken = (p: Project) => [...p.feed].reverse().find((x) => x.k !== "act")

/** Two or three questions under the last answer; a finger gets 44 round each */
export function Chips({ p, chips }: { p: Project; chips: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5 pointer-coarse:gap-y-4">
      {chips.map((c) => (
        <button key={c} type="button" className={cn(CHIP_BUTTON, "relative pointer-coarse:after:absolute pointer-coarse:after:-inset-y-2 pointer-coarse:after:inset-x-0 pointer-coarse:after:content-['']")} onClick={() => ask(p.id, c)}>
          {c}
        </button>
      ))}
    </div>
  )
}

/** The landing's chips, while nothing has been asked or read yet */
export const landingOpen = (p: Project) => lastSpoken(p)?.k === "intro"

// ----- Stop cards ---------------------------------------------------------------------------------------

const STOP_ICON: Record<keyof typeof STOP_CONTEXT, LucideIcon> = { overview: Compass, instructions: ListTree, accounts: Database }

/** A stop's live card, in the Build card's shape: Start on the first, Next after */
export function StopCard({ p, stop }: { p: Project; stop: keyof typeof STOP_CONTEXT }) {
  const Icon = STOP_ICON[stop]
  const first = !p.feed.some((t) => t.k === "stop")
  return (
    <RunCard data-live-card className="mt-2">
      <RunCardHeader>
        <RunCardIcon>
          <Icon />
        </RunCardIcon>
        <RunCardContent>
          <RunCardTitle>{STOP_LABEL[stop]}</RunCardTitle>
          <RunCardDescription className="text-pretty">{STOP_CONTEXT[stop](p.name)}</RunCardDescription>
        </RunCardContent>
      </RunCardHeader>
      <RunCardAction className={ACTION_FILL} onClick={() => runLive(p.id)}>
        {first ? "Start" : "Next"}
      </RunCardAction>
    </RunCard>
  )
}

// ----- Stop answers ---------------------------------------------------------------------------------------

const BOX = "flex flex-col divide-y divide-border overflow-hidden rounded-panel border border-border bg-surface-panel"

function Instructions({ p, meta }: { p: Project; meta: ProgramMeta }) {
  const [all, setAll] = useState(false)
  const rows = all ? meta.ixs : meta.ixs.slice(0, 4)
  return (
    <div className={BOX}>
      {rows.map((ix) => (
        <div key={ix.name} className="flex flex-col gap-1 p-3">
          <p className={cn(LISTING, "break-words text-foreground")}>{highlight(ixSignature(ix))}</p>
          <p className="text-[0.875rem] leading-5 text-muted-foreground">{ix.line}</p>
          <p className="flex flex-wrap items-center gap-x-3 text-[0.8125rem] leading-[1.125rem] text-muted-foreground">
            <span className="tabular-nums">{ix.accounts.length ? `${ix.accounts.length} accounts` : "Signers only · no accounts"}</span>
            <button type="button" onClick={() => show(p, ixRef(meta, ix))} className={cn(QUIET, "ml-auto text-[0.8125rem] pointer-coarse:-my-3.5 pointer-coarse:py-3.5")}>
              Show in code
            </button>
          </p>
        </div>
      ))}
      {meta.ixs.length > 4 && !all && (
        <button type="button" onClick={() => setAll(true)} className={cn(QUIET, "h-10 px-3")}>
          Show all {meta.ixs.length}
        </button>
      )}
    </div>
  )
}

function Accounts({ meta }: { meta: ProgramMeta }) {
  return (
    <div className="flex flex-col gap-3">
      {meta.ixs
        .filter((ix) => ix.accounts.length)
        .map((ix) => (
          <section key={ix.name} aria-label={ix.name} className="flex flex-col gap-1.5">
            <h4 className="font-mono text-[0.8125rem] leading-[1.125rem] text-muted-foreground">{ix.name}</h4>
            <div className={BOX}>
              {ix.accounts.map((a) => (
                <div key={a} className="flex flex-col gap-1 px-3 py-2.5">
                  <p className="flex flex-wrap items-center gap-1.5">
                    <span className="mr-1 font-mono text-[0.8125rem] break-all text-foreground">{a}</span>
                    {isSigner(a) && <Tag>Signer</Tag>}
                    <Tag>Writable</Tag>
                  </p>
                  <p className="text-[0.8125rem] leading-[1.125rem] text-muted-foreground">{accountLine(a)}</p>
                </div>
              ))}
            </div>
          </section>
        ))}
    </div>
  )
}

/** A stop's answer, an assistant turn drawn from the program's data, with its chips while it's the last word */
export function StopAnswer({ p, t }: { p: Project; t: T<"stop"> }) {
  const meta = metaOf(p)
  if (!meta) return null
  const o = overview(meta)
  return (
    <div className="flex flex-col gap-3">
      {t.stop === "overview" && (
        <>
          <Parts p={p} parts={o.parts} />
          <Quote p={p} r={o.quote} />
        </>
      )}
      {t.stop === "instructions" && (
        <>
          <Parts p={p} parts={instructionsLead(meta)} />
          <Instructions p={p} meta={meta} />
        </>
      )}
      {t.stop === "accounts" && (
        <>
          <p className={READ}>An account is where Solana keeps data. A program reads and writes only the accounts a call passes in, and a signer is a wallet that approved the call.</p>
          <Accounts meta={meta} />
        </>
      )}
      {lastSpoken(p) === t && <Chips p={p} chips={chipsFor(t.stop, meta)} />}
    </div>
  )
}

// ----- Call on devnet (memo and noop) ----------------------------------------------------------------------

/** The last stop for memo and noop: Solana's copy on devnet, called with no build. Text in, its bytes under
 * it; noop takes nothing */
export function RefCallCard({ p }: { p: Project }) {
  const meta = metaOf(p)
  if (!meta?.devnetId) return null
  const ix = meta.ixs[0]
  const takesText = ix.args.length > 0
  const text = valuesFor(p, ix.name).text ?? ""
  const running = !!p.calling
  const go = () => !running && refCall(p.id)
  return (
    <RunCard data-live-card orientation="vertical" state={running ? "running" : "idle"} className="mt-2">
      <RunCardHeader>
        <RunCardIcon>
          <Send />
        </RunCardIcon>
        <RunCardContent>
          <RunCardTitle>
            Call <span className="font-mono text-[0.9375rem]">{ix.name}</span> on devnet
          </RunCardTitle>
          <RunCardDescription className="text-pretty">
            {/* The trust line (CONSENSUS-delta row 11) folded into the description: a footer under a hairline said it
                again, with the id the head's chip already shows */}
            {p.calling?.stage ?? (takesText ? `Sends your text to Solana's copy of ${meta.name} on devnet, not code from this page. It logs it back.` : `Sends an empty instruction to Solana's copy on devnet, not code from this page. ${ix.name} does nothing and succeeds.`)}
          </RunCardDescription>
        </RunCardContent>
      </RunCardHeader>
      <div className="flex flex-col gap-3 pl-11 max-sm:pl-0">
        {takesText && (
          <label className="flex flex-col gap-1.5">
            <Input
              value={text}
              onChange={(e) => setValue(p.id, ix.name, "text", e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  go()
                }
              }}
              readOnly={running}
              autoComplete="off"
              data-1p-ignore
              aria-label="text, sent as UTF-8 bytes"
              className={cn("font-mono", touch ? "h-12 text-base" : "h-10 text-[0.8125rem] md:text-[0.8125rem]")}
            />
            <span aria-live="polite" className="font-mono text-[0.75rem] leading-4 break-all text-muted-foreground">
              {bytesOf(text)}
            </span>
          </label>
        )}
        <div className="flex">
          <RunCardAction className={cn(ACTION_FILL, touch && "max-sm:w-full [html.portrait_&]:min-w-60")} onClick={go}>
            Call {ix.name}
          </RunCardAction>
        </div>
      </div>
      {running && <RunCardProgress key={p.calling?.stage} stage={0} stages={1} duration={STAGE_MS} />}
    </RunCard>
  )
}

// ----- Done ------------------------------------------------------------------------------------------------

/** The read path's end, in the milestone's shape. With a call, what Solana's copy logged and its id */
export function ReadDone({ p }: { p: Project }) {
  const meta = metaOf(p)
  if (!meta) return null
  const call = [...p.feed].reverse().find((x): x is T<"call-ok"> => x.k === "call-ok")
  const next = CATALOG[(CATALOG.findIndex((x) => x.slug === meta.slug) + 1) % CATALOG.length]
  return (
    <div className="flex flex-col gap-3">
      <section aria-label="Done" className="flex flex-col overflow-hidden rounded-panel border border-border bg-(--card-ground)">
        <div className="flex flex-col p-4">
          <div className="flex items-center gap-2.5">
            <CircleCheck aria-hidden="true" className="size-5 shrink-0 text-success" />
            <h3 className="font-heading text-[1.125rem] leading-6 font-medium text-foreground">{call ? `${p.name} answered on devnet` : `You've read ${p.name}`}</h3>
          </div>
          {call && <Well lines={saidLines(call.log)} className="mt-3 border border-border bg-surface-panel" />}
        </div>
        {/* No program id row (the head's devnet chip has it with Copy) and no Ask row: the chips and the
            composer sit right under the card */}
        <div className="flex flex-col border-t border-border bg-surface-panel p-1.5">
          <NextRow icon={BookOpen} label={`Read ${next.name}`} onClick={() => openProgram(next.slug)} />
          {meta.devnetId && <NextRow icon={ExternalLink} label="View on Explorer" onClick={openExplorer} />}
        </div>
      </section>
      {call && lastSpoken(p)?.k === "milestone" && <Chips p={p} chips={chipsFor("call", meta)} />}
    </div>
  )
}

// ----- The workspace head's chips ----------------------------------------------------------------------------

const CHIP = "flex h-7 shrink-0 items-center gap-1.5 rounded-lg border border-border bg-surface-panel text-[0.75rem] leading-4"

/** Solana's copy on devnet with Copy, or "Not on devnet". Never "your program" */
export function DevnetChip({ meta }: { meta: ProgramMeta }) {
  const id = meta.devnetId
  if (!id)
    return (
      <div className={cn(CHIP, "px-2.5")}>
        <StatusDot variant="idle" />
        <span className="text-muted-foreground">Not on devnet</span>
      </div>
    )
  return (
    <div className={cn(CHIP, "pr-1 pl-2.5")}>
      <StatusDot variant="success" />
      <span className="text-muted-foreground">Devnet</span>
      <span aria-hidden="true" className="text-subtle">
        ·
      </span>
      <DropdownMenu>
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger className="rounded-sm font-mono text-[0.75rem] text-foreground outline-none hover:text-foreground/80 focus-visible:ring-2 focus-visible:ring-ring">{shortKey(id)}</DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom">Solana's copy on devnet</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="end" className="min-w-48">
          <DropdownMenuItem onSelect={() => copyText(id, "Program id")}>Copy program id</DropdownMenuItem>
          <DropdownMenuItem onSelect={openExplorer}>Open in Explorer</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <CopyButton value={id} label="Copy program id" className="size-6" />
    </div>
  )
}

/** Where Build and Deploy were: "Read only", with the reason when the head has room. A press asks why */
export function ReadOnlyChip({ p, reason }: { p: Project; reason: boolean }) {
  const ref = useRef<HTMLButtonElement>(null)
  useEffect(() => onFlashReadOnly(() => flash(ref.current)), [])
  return (
    <button
      ref={ref}
      type="button"
      aria-label="Read only. Why?"
      onClick={() => ask(p.id, WHY)}
      className={cn(CHIP, "relative px-2.5 hover:bg-surface-hover pointer-coarse:after:absolute pointer-coarse:after:-inset-y-2 pointer-coarse:after:inset-x-0 pointer-coarse:after:content-['']", FOCUS)}
    >
      <BookOpen aria-hidden="true" className="size-3.5 text-muted-foreground" />
      <span className="text-foreground">Read only</span>
      {reason && (
        <>
          <span aria-hidden="true" className="text-subtle">
            ·
          </span>
          <span className="text-muted-foreground">Native Rust can't be built yet</span>
        </>
      )}
    </button>
  )
}

/** The phone's mark at the Code row's end: a tap asks why and slides to the Guide */
export function ReadOnlyMark({ p, onAsk }: { p: Project; onAsk: () => void }) {
  const ref = useRef<HTMLButtonElement>(null)
  useEffect(() => onFlashReadOnly(() => flash(ref.current)), [])
  return (
    <button
      ref={ref}
      type="button"
      aria-label="Read only. Why?"
      onClick={() => {
        ask(p.id, WHY)
        onAsk()
      }}
      className={cn("-mr-2 ml-auto flex h-11 shrink-0 items-center gap-1.5 rounded-lg px-2 text-[0.8125rem] text-muted-foreground active:bg-surface-hover", FOCUS)}
    >
      <BookOpen aria-hidden="true" className="size-3.5" />
      Read only
    </button>
  )
}

// ----- The typing notice -----------------------------------------------------------------------------------

/** A keystroke in the read only editor: the notice floats in the editor's chip slot (pinned under the Code
 * row on a phone) and leaves on the next click elsewhere; the head's mark flashes once */
export function ReadNotice({ p, phone = false, onAsk }: { p: Project; phone?: boolean; onAsk?: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const shown = p.notice === "read"
  useEffect(() => {
    if (!shown) return
    const away = (e: PointerEvent) => {
      // The phone's switch to Code is how you get to the notice, so it doesn't count as elsewhere
      if (!ref.current?.contains(e.target as Node) && !(e.target as Element).closest?.("[data-keep-notice]")) setNotice(p.id, null)
    }
    document.addEventListener("pointerdown", away)
    return () => document.removeEventListener("pointerdown", away)
  }, [shown, p.id])
  if (!shown) return null
  return (
    <div
      ref={ref}
      role="status"
      className={cn(
        "flex items-start gap-2 text-[0.8125rem] leading-[1.125rem] text-foreground/80 animate-in fade-in-0 duration-[120ms]",
        phone ? "min-h-11 border-b border-border bg-surface-raised px-4 py-2.5 [html.portrait_&]:px-8" : "max-w-[360px] rounded-[10px] border border-border-strong bg-surface-raised px-3 py-2 shadow-md"
      )}
    >
      <BookOpen aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
      <p className="min-w-0 flex-1">
        Read only. Playground can't build Native programs yet, so changes here couldn't run.{" "}
        <button
          type="button"
          onClick={() => {
            setNotice(p.id, null)
            ask(p.id, WHY)
            onAsk?.()
          }}
          className={cn(QUIET, "text-[0.8125rem] text-foreground underline underline-offset-[3px] pointer-coarse:-my-3.5 pointer-coarse:py-3.5")}
        >
          Ask why
        </button>
      </p>
    </div>
  )
}

/** The read only editor's keys: a printing key, Delete or a paste shows the notice. Select and copy work */
export function onReadOnlyKey(p: Project, e: { key: string; metaKey: boolean; ctrlKey: boolean; altKey: boolean }) {
  if (!p.read || e.metaKey || e.ctrlKey || e.altKey) return
  if (e.key.length !== 1 && e.key !== "Backspace" && e.key !== "Delete" && e.key !== "Enter") return
  setNotice(p.id, "read")
  flashReadOnly()
}
