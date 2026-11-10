import { useRef, useState, type ReactNode } from "react"
import { ArrowRight, Check, ChevronDown, CircleX, FileQuestion, Hammer } from "lucide-react"

import { Button } from "@/components/ui/button"
import { CopyButton } from "@/components/ui/copy-button"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { Segmented, SegmentedItem } from "@/components/ui/segmented"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { StatusDot } from "@/components/ui/status-dot"
import { cn } from "@/lib/utils"

import { highlight } from "../../../ui/CodeView"
import { ACTION, ACTION_FILL, ACTION_SOFT, FOCUS, secs } from "../../../ui/type"
import { WALLET_KEY, fakeKey, type Ix } from "../../data"
import { CALL_MS, ask, behind, busy, call, deploy, firstIx, ixsOf, onChain, runClient, setPane, setValue, uploadIdl, valuesFor, type Project, type Turn } from "../../store"
import { accountRoles, idlJson } from "./GuideColumn"
import { Actions, QUIET, shortKeys } from "./parts"
import { shortKey } from "./util"

/* The Call panel (research/call-panel-redesign/CONSENSUS.md): a toolbar with Form | IDL, then one
   720 column of cards in the feed's language, parts under hairlines, facts as key and value, actions
   in a foot bar. Form: the picker, the request (arguments with their type, accounts with their
   roles and what fills them, Call), the response in every state. IDL: the schema as readable cards,
   the JSON as the second reading */

type T<K extends Turn["k"]> = Extract<Turn, { k: K }>

const CARD = "flex flex-col overflow-hidden rounded-panel border border-border bg-(--card-ground)"
const HEAD = "flex flex-col gap-1 p-4"
const PART = "flex flex-col gap-3 border-t border-border px-4 py-3"
// A foot holding a primary button stays on the card's ground under its hairline: on the grey the purple
// read as pasted on (Almaz, 6 Nov). Grey is for the bars of quiet actions only
const FOOT = "flex flex-wrap items-center gap-3 border-t border-border px-4 py-3"
const LABEL = "flex items-baseline gap-1.5 text-[0.8125rem] leading-5 font-medium text-muted-foreground"
const COUNT = "text-[0.75rem] font-normal text-muted-foreground/70 tabular-nums"
/* The panel reads its own width (a phone's sheet, a tablet's pane), not the window's: under 560 a label
   goes over its field and an account's value under its name */
const ROW = "grid grid-cols-1 gap-x-4 gap-y-1.5 @min-[560px]/call:grid-cols-[12rem_minmax(0,1fr)]"
/** Two columns at any width: a schema table's name and role */
const PAIR = "grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 @min-[560px]/call:grid-cols-[12rem_minmax(0,1fr)]"
/** A schema table's name, type and example */
const TRIPLE = "grid grid-cols-[minmax(0,1fr)_5rem_minmax(0,1fr)] gap-x-3 @min-[560px]/call:grid-cols-[12rem_6rem_minmax(0,1fr)] @min-[560px]/call:gap-x-4"
/** An account: its name, its roles, then what fills it, each in a column of its own so a name never
 * gives way to its chips */
const ACCOUNT_ROW = "grid min-h-8 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-0.5 py-1.5 @min-[560px]/call:grid-cols-[10rem_8.5rem_minmax(0,1fr)] @min-[560px]/call:py-0"
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`
const CHIP = "inline-flex h-[18px] shrink-0 items-center rounded-[5px] px-1.5 text-[0.75rem] leading-4"
const TYPE_CHIP = cn(CHIP, "bg-surface-raised font-mono text-syntax-type")
const ROLE = cn(CHIP, "border border-border text-muted-foreground")
const NOTE = "text-[0.875rem] leading-5 text-muted-foreground"

/** The compute budget a transaction gets by default, for "4,518 of 200,000" */
const BUDGET = 200_000

const programOf = (p: Project) => (p.slug ?? p.name).replace(/-/g, "_")

// ----- Validation ---------------------------------------------------------------------------------

const RANGE: Record<string, [bigint, bigint, string]> = {
  u8: [0n, 255n, "Whole number from 0 to 255"],
  u32: [0n, 4294967295n, "Whole number from 0 to 4294967295"],
  u64: [0n, 18446744073709551615n, "Whole number, 0 or more"],
  i64: [-9223372036854775808n, 9223372036854775807n, "Whole number, can be negative"],
}

/** What is wrong with a value for its type, or null. Strings and bytes take anything */
function problem(type: string, value: string): string | null {
  const v = value.trim()
  const range = RANGE[type]
  if (range) {
    if (!/^-?\d+$/.test(v)) return range[2]
    const n = BigInt(v)
    return n < range[0] || n > range[1] ? range[2] : null
  }
  if (type === "pubkey") return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(v) ? null : "Not a valid address"
  return null
}

// ----- The panel ----------------------------------------------------------------------------------

export function CallPanel({ p }: { p: Project }) {
  const [view, setView] = useState<"form" | "idl">("form")
  const [reading, setReading] = useState<"schema" | "json">("schema")
  const chain = onChain(p)
  const built = p.build.s === "ok" || !!chain

  if (!p.idl) return <NoIdl p={p} />
  if (!built)
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <Empty className="flex-1">
          <EmptyHeader>
            <EmptyMedia className="grid size-12 place-items-center rounded-panel bg-surface-raised text-muted-foreground">
              <Hammer className="size-6" />
            </EmptyMedia>
            <EmptyTitle>Build to see the instructions</EmptyTitle>
            <EmptyDescription>The form and the IDL come from the build. Once it builds, every instruction shows up here.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    )

  const ixs = ixsOf(p)
  const ix = ixs.find((i) => i.name === p.ix) ?? ixs.find((i) => i.name === firstIx(p)) ?? ixs[0]
  if (!ix) return <NoIdl p={p} />
  const json = idlJson(p)

  return (
    <div className="@container/call flex min-h-0 min-w-0 flex-1 flex-col bg-(--code-ground)">
      <div className="flex h-12 shrink-0 items-center gap-3 border-b border-border px-4 @min-[560px]/call:px-6">
        <Segmented variant="quiet" aria-label="Call panel view" value={view} onValueChange={(v) => v && setView(v as "form" | "idl")}>
          <SegmentedItem value="form" className="cursor-pointer">
            Form
          </SegmentedItem>
          <SegmentedItem value="idl" className="cursor-pointer">
            IDL
          </SegmentedItem>
        </Segmented>
        {view === "idl" && (
          <div className="ml-auto flex items-center gap-2">
            <Segmented aria-label="IDL reading" value={reading} onValueChange={(v) => v && setReading(v as "schema" | "json")}>
              <SegmentedItem value="schema" className="cursor-pointer">
                Schema
              </SegmentedItem>
              <SegmentedItem value="json" className="cursor-pointer">
                JSON
              </SegmentedItem>
            </Segmented>
            <CopyButton value={json} label="Copy IDL" />
          </div>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="flex w-full max-w-[720px] flex-col gap-4 px-4 pt-4 pb-10 @min-[560px]/call:px-6">
          {behind(p) && chain && (
            <div className="flex min-h-10 items-center gap-2.5 rounded-panel border border-border bg-surface-panel px-4 py-2 text-[0.8125rem] leading-5">
              <StatusDot variant="warning" />
              <span className="min-w-0 flex-1 text-foreground/90">The code changed since the last deploy. Calls go to the deployed version.</span>
              <button type="button" onClick={() => deploy(p.id)} disabled={busy(p)} className={QUIET}>
                Deploy again
              </button>
            </div>
          )}
          {view === "form" ? (
            <>
              {ixs.length > 1 && (
                <div className="flex flex-wrap items-center gap-3">
                  <span className={LABEL}>Instruction</span>
                  <Segmented variant="chips" tone="neutral" aria-label="Instruction" value={ix.name} onValueChange={(v) => v && setPane(p.id, "call", v)}>
                    {ixs.map((i) => (
                      <SegmentedItem key={i.name} value={i.name} className="cursor-pointer font-mono text-code">
                        {i.name}
                      </SegmentedItem>
                    ))}
                  </Segmented>
                </div>
              )}
              <Request key={ix.name} p={p} ix={ix} deployed={!!chain} />
              {/* No empty "No response yet" card before the first call: it shows once there is something to show */}
              {chain && (p.calling?.ix === ix.name || latestFor(p, ix.name)) && <Response p={p} ix={ix} />}
            </>
          ) : reading === "schema" ? (
            <Schema
              p={p}
              ixs={ixs}
              picked={ix.name}
              onOpen={(name) => {
                setPane(p.id, "call", name)
                setView("form")
              }}
            />
          ) : (
            <section aria-label="IDL JSON" className={CARD}>
              <div className="flex h-10 items-center px-4 font-mono text-[0.8125rem] text-muted-foreground">{`${programOf(p)}.json`}</div>
              <div tabIndex={0} aria-label="IDL JSON, read only" className={cn("max-h-[calc(100dvh-16rem)] overflow-auto border-t border-border bg-surface-well py-2 font-mono text-[0.75rem] leading-[1.6] outline-none", FOCUS)}>
                {json.split("\n").map((line, i) => (
                  <div key={i} className="flex">
                    <span className="w-10 shrink-0 pr-3 text-right text-syntax-comment select-none">{i + 1}</span>
                    <span className="pr-3 whitespace-pre text-syntax-plain">{highlight(line)}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}

// ----- Request ------------------------------------------------------------------------------------

/** Accounts shown before "Show N more", from five up */
const ACCOUNTS_FIRST = 3

function Request({ p, ix, deployed }: { p: Project; ix: Ix; deployed: boolean }) {
  const id = p.id
  const values = valuesFor(p, ix.name)
  const sending = p.calling?.ix === ix.name
  const running = busy(p)
  // A field speaks up once you've left it, or once Call was pressed
  const [touched, setTouched] = useState<Set<string>>(new Set())
  const [tried, setTried] = useState(false)
  const [allAccounts, setAllAccounts] = useState(false)
  const box = useRef<HTMLElement>(null)
  const errors = Object.fromEntries(ix.args.map((a) => [a.name, problem(a.type, values[a.name] ?? "")]))
  const changed = ix.args.some((a) => (values[a.name] ?? "") !== a.example)
  const many = ix.accounts.length >= 5
  const accounts = many && !allAccounts ? ix.accounts.slice(0, ACCOUNTS_FIRST) : ix.accounts

  const send = () => {
    if (!deployed || running) return
    setTried(true)
    const bad = ix.args.find((a) => errors[a.name])
    if (bad) return box.current?.querySelector<HTMLElement>(`[data-arg="${bad.name}"]`)?.focus()
    call(id, ix.name, "panel")
  }

  return (
    <section
      ref={box}
      aria-label="Request"
      className={CARD}
      onKeyDown={(e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
          e.preventDefault()
          send()
        }
      }}
    >
      <div className={HEAD}>
        <h3 className="font-mono text-[0.9375rem] leading-[1.35] font-medium break-words">
          <span className="font-normal text-muted-foreground">{programOf(p)}.</span>
          <span className="text-syntax-function">{ix.name}</span>
        </h3>
        <p className="text-[0.875rem] leading-5 text-pretty text-foreground/80">{ix.line}</p>
        {!ix.args.length && !ix.accounts.length && <p className={NOTE}>No arguments. Signed by your wallet.</p>}
      </div>

      {ix.args.length > 0 && (
        <div className={cn(PART, sending && "opacity-60")}>
          <span className={LABEL}>Arguments</span>
          {ix.args.map((a) => {
            const value = values[a.name] ?? ""
            const shown = (tried || touched.has(a.name)) && errors[a.name]
            return (
              <div key={a.name} className={cn(ROW, "items-start")}>
                <span className="flex min-w-0 items-center gap-1.5 @min-[560px]/call:pt-2">
                  <span title={a.name} className="truncate font-mono text-[0.8125rem] leading-5 text-foreground">
                    {a.name}
                  </span>
                  <span className={TYPE_CHIP}>{a.type}</span>
                </span>
                <span className="flex min-w-0 flex-col gap-1">
                  {a.type === "bool" ? (
                    <Segmented aria-label={a.name} value={value === "false" ? "false" : "true"} onValueChange={(v) => v && setValue(id, ix.name, a.name, v)} className="h-9">
                      <SegmentedItem value="true" className="cursor-pointer font-mono text-[0.8125rem]">
                        true
                      </SegmentedItem>
                      <SegmentedItem value="false" className="cursor-pointer font-mono text-[0.8125rem]">
                        false
                      </SegmentedItem>
                    </Segmented>
                  ) : (
                    <Input
                      data-arg={a.name}
                      value={value}
                      onChange={(e) => setValue(id, ix.name, a.name, e.target.value)}
                      onBlur={() => setTouched((t) => new Set(t).add(a.name))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.metaKey && !e.ctrlKey) {
                          e.preventDefault()
                          send()
                        }
                      }}
                      readOnly={sending}
                      inputMode={RANGE[a.type] ? "numeric" : undefined}
                      autoComplete="off"
                      data-1p-ignore
                      aria-label={`${a.name}, ${a.type}`}
                      aria-invalid={!!shown || undefined}
                      className="h-9 font-mono text-[0.8125rem] tabular-nums md:text-[0.8125rem]"
                    />
                  )}
                  {/* One line under it at most: what's wrong, or the example once the value moved off it */}
                  {shown ? (
                    <span className="text-[0.75rem] leading-4 text-error">{shown}</span>
                  ) : value !== a.example && a.type !== "bool" ? (
                    <span className="text-[0.75rem] leading-4 text-muted-foreground">
                      Example <span className="font-mono">{a.example}</span>
                    </span>
                  ) : null}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {ix.accounts.length > 0 && (
        <div className={PART}>
          <span className={LABEL}>
            Accounts
            <span className="ml-auto font-normal">Filled in for you</span>
          </span>
          <div className="flex flex-col">
            {accounts.map((name) => {
              const roles = accountRoles(name)
              const key = roles.signer ? WALLET_KEY : fakeKey(`${p.id}:${name}`)
              return (
                <div key={name} className={ACCOUNT_ROW}>
                  <code title={name} className="truncate font-mono text-[0.8125rem] text-foreground">
                    {name}
                  </code>
                  <span className="flex items-center gap-1.5">
                    {roles.signer && <span className={ROLE}>signer</span>}
                    {roles.writable && <span className={ROLE}>writable</span>}
                  </span>
                  <span className="col-span-2 flex min-w-0 items-center gap-2 text-[0.8125rem] @min-[560px]/call:col-span-1">
                    <span className="shrink-0 text-foreground">{roles.signer ? "Your wallet" : "Derived"}</span>
                    <code title={key} className="truncate font-mono text-muted-foreground">
                      {shortKey(key)}
                    </code>
                  </span>
                </div>
              )
            })}
          </div>
          {many && (
            <button type="button" aria-expanded={allAccounts} onClick={() => setAllAccounts(!allAccounts)} className={cn(QUIET, "self-start text-[0.8125rem]")}>
              {allAccounts ? "Show less" : `Show ${ix.accounts.length - ACCOUNTS_FIRST} more`}
              <ChevronDown aria-hidden="true" className={cn("size-3.5 transition-transform duration-150 motion-reduce:transition-none", allAccounts && "rotate-180")} />
            </button>
          )}
        </div>
      )}

      <div className={FOOT}>
        {deployed ? (
          <>
            <Button disabled={running} onClick={send} className={cn(ACTION, ACTION_FILL)}>
              {sending && <Spinner />}
              {sending ? "Calling" : `Call ${ix.name}`}
            </Button>
            <span aria-hidden="true" className={cn("text-[0.75rem] text-muted-foreground tabular-nums", !(running && !sending) && "pointer-coarse:hidden")}>
              {running && !sending ? "Another run is going" : "⌘↵"}
            </span>
            {changed && (
              <button
                type="button"
                onClick={() => {
                  ix.args.forEach((a) => setValue(id, ix.name, a.name, a.example))
                  setTried(false)
                  setTouched(new Set())
                }}
                className={cn(QUIET, "ml-auto text-[0.8125rem]")}
              >
                Reset to example
              </button>
            )}
          </>
        ) : (
          <>
            <Button variant="ghost" disabled={running} onClick={() => deploy(id)} className={cn(ACTION, ACTION_SOFT)}>
              Deploy
            </Button>
            <span className="text-[0.8125rem] text-muted-foreground">Not on devnet yet. Deploy the program to call it.</span>
          </>
        )}
      </div>
    </section>
  )
}

// ----- Response -----------------------------------------------------------------------------------

/** The latest answer to this instruction since the program last changed on devnet */
function latestFor(p: Project, ix: string) {
  const deployedAt = p.feed.reduce((n, t) => (t.k === "deploy-ok" ? t.id : n), 0)
  return [...p.feed].reverse().find((t): t is T<"call-ok"> | T<"call-fail"> => (t.k === "call-ok" || t.k === "call-fail") && t.ix === ix && t.id > deployedAt)
}

function Facts({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="flex flex-col border-t border-border px-4 py-2 text-[0.8125rem] tabular-nums">
      {rows.map(([k, v]) => (
        <div key={k} className="grid min-h-8 grid-cols-[7rem_minmax(0,1fr)] items-center gap-3">
          <dt className="text-muted-foreground">{k}</dt>
          <dd className="min-w-0 truncate text-foreground">{v}</dd>
        </div>
      ))}
    </dl>
  )
}

/** The whole log in a framed well: the runtime's lines muted, what the program said bright */
function Logs({ lines, bright }: { lines: string[]; bright?: (line: string) => boolean }) {
  return (
    <div className={PART}>
      <span className={LABEL}>Logs</span>
      <div className="max-h-48 overflow-auto rounded-control border border-border bg-surface-well px-3 py-2.5 font-mono text-[0.8125rem] leading-5 break-words">
        {lines.map((l, i) => (
          <p key={i} className={(bright ?? ((x) => x.startsWith("Program log: ")))(l) ? "text-foreground" : "text-muted-foreground"}>
            {shortKeys(l)}
          </p>
        ))}
      </div>
    </div>
  )
}

function StatusHead({ icon, title, meta, right }: { icon: ReactNode; title: string; meta?: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex h-12 items-center gap-2 px-4">
      {icon}
      <span className="font-heading text-[1rem] leading-6 font-medium text-foreground">{title}</span>
      {meta && <span className="min-w-0 truncate text-[0.875rem] text-muted-foreground">{meta}</span>}
      {right && <span className="ml-auto shrink-0 text-[0.8125rem] text-muted-foreground">{right}</span>}
    </div>
  )
}

function Response({ p, ix }: { p: Project; ix: Ix }) {
  const id = p.id
  const sending = p.calling?.ix === ix.name
  const result = latestFor(p, ix.name)

  return (
    <section aria-label="Response" className={CARD}>
      <div aria-live="polite">
        {sending ? (
          <StatusHead icon={<Spinner className="size-4 text-muted-foreground" />} title="Sending" meta={`${ix.name} to devnet`} />
        ) : !result ? null : result.k === "call-ok" ? (
          <StatusHead icon={<Check aria-hidden="true" className="size-4 shrink-0 text-success" />} title="Confirmed" meta={`${ix.name} · ${secs(CALL_MS)}`} right={result.from === "guide" ? "from the Guide" : undefined} />
        ) : result.kind === "network" ? (
          <StatusHead icon={<CircleX aria-hidden="true" className="size-4 shrink-0 text-error" />} title="Not sent" meta="Devnet didn't answer" />
        ) : (
          <StatusHead icon={<CircleX aria-hidden="true" className="size-4 shrink-0 text-error" />} title="Failed" meta={<span className="font-mono">{shortKeys(result.error)}</span>} />
        )}
      </div>

      {sending ? (
        <>
          <div className={PART}>
            <span className={LABEL}>Logs</span>
            <div aria-hidden="true" className="flex flex-col gap-2 rounded-control border border-border bg-surface-well px-3 py-3">
              <Skeleton className="h-3 w-2/3 motion-reduce:animate-none" />
              <Skeleton className="h-3 w-1/2 motion-reduce:animate-none" />
            </div>
          </div>
          <Facts rows={["Signature", "Compute units", "Fee"].map((k) => [k, <Skeleton aria-hidden="true" className="h-3 w-24 motion-reduce:animate-none" />])} />
        </>
      ) : !result ? null : result.k === "call-ok" ? (
        <>
          <Logs lines={result.log} />
          <Facts
            rows={[
              ["Signature", <code className="font-mono">{shortKey(result.sig)}</code>],
              ["Compute units", `${result.cu.toLocaleString("en-US")} of ${BUDGET.toLocaleString("en-US")}`],
              ["Fee", `${result.fee} test SOL`],
              ...(Object.keys(result.args).length
                ? ([
                    [
                      "Sent with",
                      <span className="font-mono text-muted-foreground">
                        {Object.entries(result.args)
                          .map(([k, v]) => `${k} ${v}`)
                          .join(", ")}
                      </span>,
                    ],
                  ] as [string, ReactNode][])
                : []),
            ]}
          />
          <Actions id={id} copy={{ label: "Copy signature", value: result.sig }} className="border-t border-border bg-surface-panel px-4" />
        </>
      ) : result.kind === "network" ? (
        <>
          <p className={cn(PART, NOTE)}>Couldn't reach devnet. The call wasn't sent and nothing was charged.</p>
          <div className={FOOT}>
            <Button variant="ghost" disabled={busy(p)} onClick={() => call(id, ix.name, "panel")} className={cn(ACTION, ACTION_SOFT)}>
              Try again
            </Button>
            <Actions id={id} className="ml-auto" />
          </div>
        </>
      ) : (
        <>
          <Logs lines={result.log} bright={(l) => l.includes("failed")} />
          <Facts
            rows={[
              ["Error", <code className="font-mono">{shortKeys(result.error)}</code>],
              ["Changed", "Nothing on chain except the fee"],
            ]}
          />
          <div className="flex h-10 items-center gap-4 border-t border-border bg-surface-panel px-4">
            <button type="button" onClick={() => ask(id, "Explain the error")} className={QUIET}>
              Ask why it failed
            </button>
            <Actions id={id} className="ml-auto" />
          </div>
        </>
      )}
    </section>
  )
}

// ----- IDL schema ---------------------------------------------------------------------------------

/** From this many instructions the cards fold, the picked one open */
const FOLD_FROM = 5

function Schema({ p, ixs, picked, onOpen }: { p: Project; ixs: Ix[]; picked: string; onOpen: (name: string) => void }) {
  const fold = ixs.length >= FOLD_FROM
  const [open, setOpen] = useState<Set<string>>(() => new Set([picked]))
  return (
    <>
      {ixs.map((ix) => {
        const shown = !fold || open.has(ix.name)
        return (
          <section key={ix.name} id={`ix-${ix.name}`} aria-label={ix.name} className={CARD}>
            <div className="flex items-start gap-3 p-4">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                {fold ? (
                  <button
                    type="button"
                    aria-expanded={shown}
                    onClick={() => setOpen((o) => (o.has(ix.name) ? new Set([...o].filter((n) => n !== ix.name)) : new Set(o).add(ix.name)))}
                    className={cn("flex min-w-0 cursor-pointer items-center gap-2 rounded-sm text-left", FOCUS)}
                  >
                    <IxTitle p={p} ix={ix} />
                    <span className={COUNT}>{`${plural(ix.args.length, "arg")} · ${plural(ix.accounts.length, "account")}`}</span>
                    <ChevronDown aria-hidden="true" className={cn("size-4 shrink-0 text-muted-foreground transition-transform duration-150 motion-reduce:transition-none", shown && "rotate-180")} />
                  </button>
                ) : (
                  <IxTitle p={p} ix={ix} />
                )}
                <p className="text-[0.875rem] leading-5 text-pretty text-foreground/80">{ix.line}</p>
              </div>
              <button type="button" onClick={() => onOpen(ix.name)} className={cn(QUIET, "shrink-0 pt-0.5 text-[0.8125rem]")}>
                Open in form
                <ArrowRight aria-hidden="true" className="size-3.5" />
              </button>
            </div>
            {shown && (
              <>
                <div className={PART}>
                  <span className={LABEL}>Arguments</span>
                  {ix.args.length ? (
                    <div className="flex flex-col text-[0.8125rem]">
                      <div className={cn(TRIPLE, "pb-1 text-[0.75rem] text-muted-foreground")}>
                        <span>Name</span>
                        <span>Type</span>
                        <span>Example</span>
                      </div>
                      {ix.args.map((a) => (
                        <div key={a.name} className={cn(TRIPLE, "min-h-8 items-center")}>
                          <code title={a.name} className="truncate font-mono text-foreground">
                            {a.name}
                          </code>
                          <span>
                            <span className={TYPE_CHIP}>{a.type}</span>
                          </span>
                          <code className="truncate font-mono text-muted-foreground">{a.example}</code>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className={NOTE}>No arguments</p>
                  )}
                </div>
                <div className={PART}>
                  <span className={LABEL}>Accounts</span>
                  {ix.accounts.length ? (
                    <div className="flex flex-col text-[0.8125rem]">
                      <div className={cn(PAIR, "pb-1 text-[0.75rem] text-muted-foreground")}>
                        <span>Name</span>
                        <span>Role</span>
                      </div>
                      {ix.accounts.map((name) => {
                        const roles = accountRoles(name)
                        return (
                          <div key={name} className={cn(PAIR, "min-h-8 items-center")}>
                            <code title={name} className="truncate font-mono text-foreground">
                              {name}
                            </code>
                            <span className="flex items-center gap-1.5">
                              {roles.signer && <span className={ROLE}>signer</span>}
                              {roles.writable ? <span className={ROLE}>writable</span> : <span className="text-muted-foreground">read only</span>}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className={NOTE}>No accounts. Signed by your wallet.</p>
                  )}
                </div>
              </>
            )}
          </section>
        )
      })}
      <p className="text-[0.8125rem] leading-5 text-muted-foreground">Generated when the program builds. A new deploy updates this view and the form.</p>
    </>
  )
}

function IxTitle({ p, ix }: { p: Project; ix: Ix }) {
  return (
    <h3 className="min-w-0 truncate font-mono text-[0.9375rem] leading-[1.35] font-medium">
      <span className="font-normal text-muted-foreground">{programOf(p)}.</span>
      <span className="text-syntax-function">{ix.name}</span>
    </h3>
  )
}

// ----- No IDL -------------------------------------------------------------------------------------

function NoIdl({ p }: { p: Project }) {
  const client = p.framework === "native" && "client/client.ts" in p.files
  return (
    <Empty className="flex-1">
      <EmptyHeader>
        <EmptyMedia className="grid size-12 place-items-center rounded-panel bg-surface-raised text-muted-foreground">
          <FileQuestion className="size-6" />
        </EmptyMedia>
        <EmptyTitle>No IDL for this program</EmptyTitle>
        <EmptyDescription>The call form is built from an IDL, the list of a program's instructions. Native programs don't make one when they build.</EmptyDescription>
      </EmptyHeader>
      <div className="flex flex-wrap justify-center gap-2">
        {/* Soft here: the Guide's card beside it holds the one primary for the same step */}
        <Button variant="ghost" className={cn(ACTION, ACTION_SOFT)} onClick={() => (client ? runClient(p.id) : uploadIdl(p.id))}>
          {client ? "Run client.ts" : "Upload IDL"}
        </Button>
        <Button variant="ghost" className={cn(ACTION, ACTION_SOFT)} onClick={() => (client ? uploadIdl(p.id) : ask(p.id, "What is an IDL?"))}>
          {client ? "Upload IDL" : "Ask the assistant"}
        </Button>
      </div>
    </Empty>
  )
}
