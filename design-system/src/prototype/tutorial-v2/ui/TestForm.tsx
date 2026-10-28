import { useState, type CSSProperties, type ReactNode } from "react"
import { Check, CircleX, ExternalLink, Play, Send } from "lucide-react"

import { Button } from "@/components/ui/button"
import { CopyButton } from "@/components/ui/copy-button"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Tag } from "@/components/ui/tag"
import { cn } from "@/lib/utils"

import { LESSON, NAME_MAX, TX_FEE } from "../data"
import { idlOf, signature } from "../idl"
import { useStore, type Turn } from "../store"
import { arriving } from "../tx"
import { highlight } from "./CodeView"
import { openExplorer } from "./explorer"
import { HelloSource } from "./HelloPeek"
import { MemoryCard } from "./MemoryCard"
import { LivePlayer } from "./PlayerCard"
import { Prose } from "./Prose"
import { ACTION, ACTION_FILL, READ_CODE } from "./type"

type View = "form" | "idl"
type ResultTurn = Extract<Turn, { kind: "result" }>

// Side notes, kept as one string: cn would drop text-caption next to a text colour. The same goes for
// text-code, so every class list here with a size token and a colour is a plain string
const NOTE = "text-caption text-muted-foreground"
// Every band's content stops here, so long lines stay readable on a wide pane; everything keeps to the left edge
const CAP = "w-full max-w-[720px]"

/** The IDL as JSON, read only, with Copy: what the form is drawn from. It takes the form's place in
 * the panel instead of opening a dialog over it, so the two are one switch apart. It fills the panel's
 * height and scrolls inside it; in the phone's sheet, which has no fixed height, the sheet scrolls */
function IdlView({ json, phone }: { json: string; phone: boolean }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      {/* On the phone Copy stands at the end of this line: inside the well it sat on the program's address */}
      <div className="flex items-start gap-2">
        <p className="min-w-0 flex-1 text-caption text-muted-foreground">The form is built from this IDL, so a new deploy changes both.</p>
        {phone && <CopyButton value={json} label="Copy IDL" className="-my-3 -mr-3 size-11 shrink-0" />}
      </div>
      {/* Copy sits outside the scroller, so it stays put while long lines scroll sideways */}
      <div className="relative flex min-h-0 flex-1 flex-col">
        <div
          tabIndex={0}
          aria-label="IDL JSON, read only"
          className="min-h-0 flex-1 overflow-auto overscroll-contain rounded-control border border-border bg-surface-well py-2 font-mono text-[0.75rem] leading-[1.6] outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          {json.split("\n").map((line, i) => (
            // On a phone a line wraps instead of scrolling sideways: the program's address was cut at the edge
            <div key={i} className={`px-3 text-syntax-plain ${phone ? "text-code whitespace-pre-wrap break-all" : "whitespace-pre"}`}>
              {highlight(line)}
            </div>
          ))}
        </div>
        {!phone && <CopyButton value={json} label="Copy IDL" className="absolute top-1.5 right-1.5 bg-surface-well" />}
      </div>
    </div>
  )
}

/** The account under the program's words, Lumberjack's player or Zero Copy's map: the log's well
 * exactly, with no border at all, a step under it. One answer, not two components; a border, even a
 * transparent one, set its text a pixel in from the log's and read as a mistake */
const UNDER_LOG = "mt-1 border-0"

/** The map a memory lesson's call acted on, as it is now: the board has no card, the map shows its
 * size, the zero copy map its size and what was painted in it */
function PanelMemory({ ix }: { ix: string }) {
  const { s } = useStore()
  const m = s.memory
  if (!m) return null
  if (/big|paint/.test(ix)) return m.big === null ? null : <MemoryCard size={m.big} heap={0} zero painted={m.painted} text={m.text} className={UNDER_LOG} />
  return /map|grow/.test(ix) && m.map > 0 ? <MemoryCard size={m.map} className={UNDER_LOG} /> : null
}

/** The panel's head is just Form | IDL, on the same left edge as everything under it. A title "Call"
 * repeated the tool button lit above it, and tabs pushed to the end of a 720px column floated mid pane
 * on a wide screen, next to nothing. On the phone it is the sheet's own head, under the drag handle */
function Head({ phone, children }: { phone: boolean; children: ReactNode }) {
  return <div className={cn("flex shrink-0", phone ? "px-4 pt-2" : "px-6 pt-4")}>{children}</div>
}

/** What the program said back to the latest call from this panel: the call on its way, or the confirmed
 * transaction. Before the first call there is nothing here at all, so the button is the last thing on the
 * page and nothing waits under it. Older calls stay in the terminal's history, not stacked here. A call
 * the program refuses (no energy left, a grow too big, a paint past the map's end) comes back failed */
function CallResponse({ result, sending, phone }: { result: ResultTurn | undefined; sending: boolean; phone: boolean }) {
  if (sending)
    return (
      <div className="flex items-center gap-2">
        <Spinner className="size-4 text-muted-foreground" />
        <span className="font-heading text-[0.9375rem] font-medium text-foreground">Sending</span>
      </div>
    )
  return result?.tx ? <Confirmed key={result.id} turn={result} phone={phone} /> : null
}

/** A confirmed call in two lines: the status with who paid and the way to Explorer, then the program's
 * words on a well with the line of lib.rs they came from beside them. Time, compute units, the fee in
 * lamports and the signature are the terminal's: a learner can't act on them here. It prints in as the
 * transaction arrives, as the chat's receipt does, and is simply there when you come back to it */
function Confirmed({ turn, phone }: { turn: ResultTurn; phone: boolean }) {
  const tx = turn.tx!
  const [print] = useState(() => arriving(turn.at) !== null)
  const row = (i: number) => ({ "data-print": "", style: { "--i": i } as CSSProperties })
  // A game's call can fail on purpose: the program's own error, by name, is the answer
  const words = tx.error
    ? tx.error.number
      ? `Error ${tx.error.number}: ${tx.error.name}. ${tx.error.message}.`
      : `Error: ${tx.error.message}`
    : tx.said
      ? `Program log: ${tx.said}`
      : `Program log: Instruction: ${tx.instruction.replace(/(^|_)(\w)/g, (_, __, c: string) => c.toUpperCase())}`
  return (
    <div className={cn("flex flex-col gap-2", print && "pg-print")}>
      {/* On the baseline, so the 13px words sit on the status's line rather than centred against it */}
      <div {...row(0)} className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        {tx.error ? (
          <CircleX className="size-4 shrink-0 self-center text-error" aria-hidden="true" />
        ) : (
          <Check className="size-4 shrink-0 self-center text-success" aria-hidden="true" />
        )}
        <span className="font-heading text-[0.9375rem] font-medium text-foreground">{tx.error ? "Failed" : "Confirmed"}</span>
        {!phone && <span className={NOTE}>· Fee {TX_FEE} from your wallet</span>}
        {/* Reaching past the line by its own padding on a phone, so the link is a thumb's height. There it
            stands at the row's far end, and who paid takes a line of its own under the status: the three
            didn't fit one row and left a dot hanging */}
        <button
          type="button"
          onClick={openExplorer}
          title={tx.signature}
          className={`ml-auto flex items-center gap-1 self-center hover:text-foreground ${NOTE}${phone ? " -my-3 min-h-11 py-3" : ""}`}
        >
          Explorer
          <ExternalLink className="size-3" aria-hidden="true" />
        </button>
      </div>
      {phone && <p className={`-mt-2 pl-6 ${NOTE}`}>Fee {TX_FEE} from your wallet</p>}
      {/* No border: the fill sets the line apart, and the source sits on it, beside the words it explains */}
      {tx.said ? (
        <HelloSource
          said={tx.said}
          inline
          className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-control bg-surface-well px-3 py-2.5"
          before={
            <p {...row(1)} className="min-w-0 font-mono text-code break-words text-foreground">
              {words}
            </p>
          }
        />
      ) : (
        <p {...row(1)} className={`rounded-control bg-surface-well px-3 py-2.5 font-mono text-code break-words ${tx.error ? "text-error" : "text-foreground"}`}>
          {words}
        </p>
      )}
      {LESSON.game && <LivePlayer phone={phone} className={UNDER_LOG} />}
      {LESSON.memory && <PanelMemory ix={tx.instruction} />}
    </div>
  )
}

/** The Call panel, as one document on the pane: Form | IDL, the request, and the response under it,
 * set apart by space alone (the pane already has its borders), all on one left edge and within 720px. It is drawn
 * from the IDL of the program on devnet, as the old Playground's Test tab and Explorer draw it, and reads
 * what was deployed, never the file being typed, so `name` shows only once the upgrade lands, marked
 * NEW. Only what you fill in is asked: hello takes no accounts and your wallet pays, so those are a caption,
 * not rows. Calling hello passes step 3, and with a name step 4. Form | IDL in the head swaps both
 * bands for the JSON the form is drawn from. `phone` is the sheet's: the rows and the button take a
 * thumb, and the bands scroll under the head */
export function TestForm({ phone = false }: { phone?: boolean }) {
  const { s, dispatch } = useStore()
  const [view, setView] = useState<View>("form")
  const [picked, setPicked] = useState<string | null>(null)
  // What the learner typed into a memory lesson's arguments, by instruction, over the defaults
  const [typed, setTyped] = useState<Record<string, Record<string, string>>>({})
  const pad = phone ? "px-4" : "px-6"

  if (s.deployedLib === null)
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <Empty className="flex-1">
          <EmptyHeader>
            <EmptyMedia className="grid size-12 place-items-center rounded-panel bg-surface-raised text-muted-foreground">
              <Send className="size-6" />
            </EmptyMedia>
            <EmptyTitle>Nothing to call yet</EmptyTitle>
            <EmptyDescription>Deploy the program first. Once it is on devnet, its instructions show up here.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    )

  const idl = idlOf(s.deployedLib)
  const json = JSON.stringify(idl, null, 2)
  // A program with several instructions shows one form at a time, the latest one added by default
  const ix = idl.instructions.find((i) => i.name === picked) ?? idl.instructions[idl.instructions.length - 1]
  const args = ix.args
  const sending = s.phase === "testing"
  const busy = s.phase !== "idle"
  // Hello Anchor's name is typed into the store, for the chat's call too. A memory lesson starts each
  // argument at what its step sends, and the learner can change it: the program answers what was sent
  const filled = LESSON.memory ? { ...LESSON.memory.args(s, ix.name), ...typed[ix.name] } : null
  const empty = !filled && args.length > 0 && !s.testName.trim()
  // A call that would fail on devnet before it did anything isn't sent: a second init, a paint before
  // the map is 40 KB. Nor is an argument the client couldn't encode. The panel says why instead
  const invalid = filled && LESSON.memory ? LESSON.memory.check(filled) : null
  const blocked = LESSON.memory && !invalid ? LESSON.memory.panel(s, ix.name, filled ?? undefined) : null
  const note =
    ix.name === "init_player" && s.player !== null
      ? "Your player already exists. `init` makes an account once, so a second call would fail."
      : (invalid ?? (blocked && "note" in blocked ? blocked.note : null))
  const made = note !== null
  const send = () => {
    if (busy || empty || made) return
    dispatch({ type: "test", ix: ix.name, args: filled ?? undefined })
  }
  // The latest call only: older ones are in the terminal's history of runs, not stacked here
  const result = [...s.thread].reverse().find((t): t is ResultTurn => t.kind === "result" && t.from === "test")
  // A call made before the upgrade answered another signature: next to the new name row it reads as
  // stale. In a game, a call of another instruction than the one shown isn't this form's answer
  // A call answered by the program before its latest deploy was another program's answer: it goes too
  const deployedAt = [...s.thread].reverse().find((t) => t.kind === "result" && t.ok && (t.act === "deploy" || t.act === "buildDeploy"))?.at ?? 0
  const fresh =
    result?.tx && result.at > deployedAt && (LESSON.game || LESSON.memory ? result.tx.instruction === ix.name : args.length > 0 === (result.tx.instruction === "hello(name)"))
      ? result
      : undefined
  // The fields moved on from what the last call sent: its answer stays, dimmed, under what it was sent with
  const stale = !!(filled && fresh?.sent && Object.keys(filled).some((k) => filled[k] !== fresh.sent?.[k]))
  // What the button does, in the client's own words, so the panel teaches the line the client writes
  // "In code", not "In client.ts": the file may still hold the older call, until step 4 passes a name there
  const method = ix.name.replace(/_(\w)/g, (_, c: string) => c.toUpperCase())
  const line = `pg.program.methods.${method}(${args.map((a) => a.name).join(", ")}).rpc()`
  const callButton = (
    <Button disabled={busy || empty || made} onClick={send} className={cn(ACTION, ACTION_FILL, phone && "h-12 w-full pointer-coarse:h-12")}>
      {sending ? <Spinner /> : <Play className="size-3 fill-current" />}
      {sending ? "Calling" : `Call ${ix.name}`}
    </Button>
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Head phone={phone}>
        {/* Claude Code's switch in our palette: a quiet well, the current one lifted on a lighter fill.
            No ring and no shadow: a lit edge read as a glow */}
        <div role="tablist" aria-label="Call panel view" className="flex shrink-0 gap-0.5 rounded-[10px] bg-foreground/[0.04] p-[3px]">
          {(["form", "idl"] as const).map((v) => (
            <button
              key={v}
              type="button"
              role="tab"
              id={`call-tab-${v}`}
              aria-selected={view === v}
              aria-controls="call-panel"
              tabIndex={view === v ? 0 : -1}
              onClick={() => setView(v)}
              onKeyDown={(e) => {
                if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return
                e.preventDefault()
                const next = v === "form" ? "idl" : "form"
                setView(next)
                document.getElementById(`call-tab-${next}`)?.focus()
              }}
              className={cn(
                "h-7 rounded-[7px] px-3 text-[0.8125rem] font-act transition-colors duration-100 outline-none focus-visible:ring-2 focus-visible:ring-ring/50 pointer-coarse:h-10",
                view === v ? "bg-foreground/[0.08] text-foreground" : "text-muted-foreground hover:text-foreground",
                phone && "px-4 pointer-coarse:h-11"
              )}
            >
              {v === "form" ? "Form" : "IDL"}
            </button>
          ))}
        </div>
      </Head>

      {/* The bands scroll under the head, so Form | IDL stays in reach on a short pane and in the sheet */}
      <div
        role="tabpanel"
        id="call-panel"
        aria-labelledby={`call-tab-${view}`}
        className={cn("flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain", phone && view === "idl" && "pb-[max(var(--safe-bottom),16px)]")}
      >
        {view === "idl" ? (
          <div className={cn("flex min-h-0 flex-1 flex-col gap-2.5 py-4", pad)}>
            <div className={`flex min-h-0 flex-1 flex-col ${CAP}`}>
              <IdlView json={json} phone={phone} />
            </div>
          </div>
        ) : (
          // One rhythm: 4 in the heading, 8 inside a unit, 16 between rows, 24 between the request's
          // groups, 32 between request and response. Two sizes: 15 for the heading and the button, 13 for
          // all else, the picker included, so nothing that only chooses is louder than what it chose
          <div className={cn("flex flex-col gap-8 pt-4 pb-8", pad)}>
            <section aria-label="Request" className={`flex flex-col gap-4 ${CAP}`}>
              {/* Several instructions: one at a time, picked here, as Explorer lists them */}
              {idl.instructions.length > 1 && (
                <div role="radiogroup" aria-label="Instruction" className="flex flex-wrap gap-1.5">
                  {idl.instructions.map((i) => (
                    <button
                      key={i.name}
                      type="button"
                      role="radio"
                      aria-checked={i.name === ix.name}
                      onClick={() => setPicked(i.name)}
                      className={`flex h-7 items-center rounded-[7px] border px-3 font-mono text-code transition-colors duration-100 outline-none focus-visible:ring-2 focus-visible:ring-ring/50 pointer-coarse:h-10 ${
                        i.name === ix.name ? "border-border-strong bg-foreground/[0.08] text-foreground" : "border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {i.name}
                      {/* A memory lesson's deploy brings whole instructions: NEW once, on the instruction */}
                      {LESSON.memory && s.idlNew && i.name === ix.name && (
                        <Tag variant="neutral" className="ml-1.5 h-4">
                          New
                        </Tag>
                      )}
                    </button>
                  ))}
                </div>
              )}
              {/* The signature is the request's heading, with the program it belongs to, and under it the
                  same call as client.ts writes it: it describes the call, so it sits with it, not under
                  the button as fine print. The empty parens already say there are no arguments */}
              <div className="mb-2 flex flex-col gap-1">
                <h3 className="font-mono text-[0.9375rem] leading-[1.35] font-medium break-words">
                  <span className="font-normal text-muted-foreground">{LESSON.program}.</span>
                  <span className="text-syntax-function">{ix.name}</span>
                  <span className="text-foreground">{signature(args)}</span>
                </h3>
                {phone ? (
                  // Two lines on purpose on a narrow sheet: a label, then the line itself in the code face. As one
                  // sentence the chip broke off onto its own line anyway, in a third style
                  <div className="flex flex-col gap-0.5">
                    <p className={NOTE}>In code</p>
                    <code className="font-mono text-code break-all text-muted-foreground">{line}</code>
                  </div>
                ) : (
                  // The line itself in the code face, no chip: a chip read as a field, brighter than the real ones
                  <p className={NOTE}>
                    In code <code className="ml-1 font-mono text-code break-words text-foreground/80">{line}</code>
                  </p>
                )}
              </div>
              {args.map((a) => (
                // Label over the field, so the request keeps one left edge
                <label key={a.name} className={cn("flex flex-col gap-2", s.idlNew && "animate-rise", sending && "pointer-events-none opacity-60")}>
                  <span className="flex items-center gap-2">
                    <span className="font-mono text-code text-foreground">{a.name}</span>
                    {s.idlNew && !LESSON.memory && <Tag variant="neutral">New</Tag>}
                  </span>
                  <Input
                    value={filled ? (filled[a.name] ?? "") : s.testName}
                    onChange={(e) =>
                      filled
                        ? setTyped((t) => ({ ...t, [ix.name]: { ...t[ix.name], [a.name]: e.target.value } }))
                        : dispatch({ type: "testName", text: e.target.value })
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        send()
                      }
                    }}
                    readOnly={sending}
                    maxLength={filled ? undefined : NAME_MAX}
                    inputMode={a.type === "string" ? undefined : "numeric"}
                    placeholder={filled ? a.type : "Your name"}
                    autoComplete="off"
                    data-1p-ignore
                    data-lpignore="true"
                    data-bwignore
                    data-form-type="other"
                    aria-label={`${a.name}, ${a.type}`}
                    // A value that goes into the call, so in the code face, at its label's 13px; 16px on a phone, or
                    // iOS zooms the field. A bracket size, since cn drops text-code next to the field's md:text-sm
                    className={cn("min-w-0 font-mono", phone ? "h-12 w-full text-base" : "h-10 w-full max-w-[360px] text-[0.8125rem] md:text-[0.8125rem]")}
                  />
                </label>
              ))}
              {/* Why the call can't go, right over the button it keeps off: one unit, 24 under the fields. The
                  button on the same left edge as the call it sends, and nothing under it. On the phone it
                  stands at the sheet's foot instead, under the thumb (below) */}
              {(made || !phone) && (
                <div className="mt-2 flex flex-col items-start gap-2">
                  {made && (
                    <p className={`${NOTE} max-w-[64ch]`}>
                      <Prose text={note ?? ""} {...READ_CODE} />
                    </p>
                  )}
                  {!phone && callButton}
                </div>
              )}
            </section>

            {/* Space, not a rule, between request and response: the pane has lines enough around it */}
            {/* Narrower than the request's column: what you read stays together, the log beside its source */}
            <section aria-label="Response" aria-live="polite" className="flex w-full max-w-[560px] flex-col gap-2">
              {stale && !sending && fresh?.sent && (
                <p className={NOTE}>
                  Last call, with {Object.entries(fresh.sent).map(([k, v]) => `${k} ${/^\d+$/.test(v) ? v : JSON.stringify(v)}`).join(", ")}
                </p>
              )}
              <div className={cn(stale && !sending && "opacity-60")}>
                <CallResponse result={fresh} sending={sending} phone={phone} />
              </div>
            </section>
          </div>
        )}
      </div>
      {/* The phone's Call at the sheet's foot, as Start is at the screen's: what came back shows above it */}
      {phone && view === "form" && <div className="shrink-0 px-4 pt-3 pb-[max(var(--safe-bottom),16px)]">{callButton}</div>}
    </div>
  )
}
