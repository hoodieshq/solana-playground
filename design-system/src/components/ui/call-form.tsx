import * as React from "react"
import { Check, CircleX, Play } from "lucide-react"
import { cn } from "@/lib/utils"

import { Button } from "@/components/ui/button"
import { CopyButton } from "@/components/ui/copy-button"
import { Input } from "@/components/ui/input"
import { ResultDetails } from "@/components/ui/result-details"
import { Segmented, SegmentedItem } from "@/components/ui/segmented"
import { Spinner } from "@/components/ui/spinner"
import { Tag } from "@/components/ui/tag"

/* A program's instructions as a form drawn from its IDL, as the old
   Playground's Test tab and Explorer draw it. Form | IDL swaps the form for
   the JSON it is drawn from. One instruction at a time, picked from chips;
   its signature is the heading, in syntax colours, with the client line that
   makes the same call under it. A field per argument and per account the
   caller has to give (a signer is your wallet, a fixed or derived address is
   only said), a note over Call when the call can't go, and under it what
   came back: Sending, then Confirmed or Failed with the program's words.
   One left edge, within 720px; under 30rem of its own width the client line
   takes two lines and Call the full width.
   CallForm takes the IDL and the handlers and draws all of it; the parts are
   there for a panel laid out another way. */

type IdlType = string | { [kind: string]: unknown }

type CallFormArg = { name: string; type: IdlType }

type CallFormAccount = {
  name: string
  writable?: boolean
  signer?: boolean
  optional?: boolean
  /** a fixed address: shown, not asked */
  address?: string
  /** a derived address: said, not asked */
  pda?: unknown
}

type CallFormInstruction = { name: string; args: CallFormArg[]; accounts?: CallFormAccount[] }

type CallFormIdlShape = {
  address?: string
  metadata?: { name?: string; [key: string]: unknown }
  instructions: CallFormInstruction[]
  [key: string]: unknown
}

type CallFormValues = { args: Record<string, string>; accounts: Record<string, string> }

type CallFormResult = {
  status: "sending" | "confirmed" | "failed"
  /** the program's words: "Program log: Hello, Ada" */
  log?: string
  /** the transaction on an explorer, in the details' row */
  explorerHref?: string
  /** beside the log: where in the program the words came from */
  source?: React.ReactNode
  /** under the log: the account as it is now, say */
  children?: React.ReactNode
  /** how the call went, in one quiet sentence with the signature to copy and
      the raw log behind a toggle: "The call used 7,342 compute units, and the
      fee was 0.000005 test SOL from your wallet." */
  details?: { text: string; copy?: { label: string; value: string }; log?: string[] }
}

type CallFormMessages = {
  form: string
  idl: string
  view: string
  instruction: string
  inCode: string
  accounts: string
  signer: string
  derived: string
  call: (name: string) => string
  calling: string
  sending: string
  confirmed: string
  failed: string
  explorer: string
  fresh: string
  idlNote: string
  copyIdl: string
  emptyTitle: string
  emptyDescription: string
}

const MESSAGES: CallFormMessages = {
  form: "Form",
  idl: "IDL",
  view: "Call panel view",
  instruction: "Instruction",
  inCode: "In code",
  accounts: "Accounts",
  signer: "Your wallet",
  derived: "Derived by the program",
  call: (name) => `Call ${name}`,
  calling: "Calling",
  sending: "Sending",
  confirmed: "Confirmed",
  failed: "Failed",
  explorer: "Explorer",
  fresh: "New",
  idlNote: "The form is built from this IDL, so a new deploy changes both.",
  copyIdl: "Copy IDL",
  emptyTitle: "Nothing to call yet",
  emptyDescription: "Deploy the program first. Once it is on devnet, its instructions show up here.",
}

/* An IDL type as Rust would write it: u64, vec<u8>, option<string>, [u8; 32] */
function typeName(type: IdlType): string {
  if (typeof type === "string") return type
  const [kind, inner] = Object.entries(type)[0] ?? ["", ""]
  if (kind === "array" && Array.isArray(inner)) return `[${typeName(inner[0] as IdlType)}; ${String(inner[1])}]`
  if (kind === "defined") return typeof inner === "string" ? inner : String((inner as { name?: string })?.name ?? "defined")
  return `${kind}<${typeName(inner as IdlType)}>`
}

const camel = (name: string) => name.replace(/_(\w)/g, (_, c: string) => c.toUpperCase())

/* The client line that makes the same call */
const clientLine = (ix: CallFormInstruction) => `pg.program.methods.${camel(ix.name)}(${ix.args.map((a) => a.name).join(", ")}).rpc()`

/* An account the caller has to fill in: not a signer, no fixed or derived address */
const asked = (a: CallFormAccount) => !a.signer && !a.address && !a.pda

/* JSON in the code's colours: strings, numbers, true, false and null */
const JSON_TOKEN = /("(?:[^"\\]|\\.)*")(\s*:)?|(-?\d+(?:\.\d+)?)|\b(true|false|null)\b/g

function highlightJson(line: string): React.ReactNode[] {
  const out: React.ReactNode[] = []
  let last = 0
  for (const m of line.matchAll(JSON_TOKEN)) {
    const at = m.index ?? 0
    if (at > last) out.push(line.slice(last, at))
    if (m[1])
      out.push(
        <span key={at} className={m[2] ? "text-syntax-function" : "text-syntax-string"}>
          {m[1]}
        </span>,
        m[2] ?? ""
      )
    else
      out.push(
        <span key={at} className={m[3] ? "text-syntax-number" : "text-syntax-keyword"}>
          {m[0]}
        </span>
      )
    last = at + m[0].length
  }
  if (last < line.length) out.push(line.slice(last))
  return out
}

/* The request's heading: program.name(args) in syntax colours. Under 30rem it
   is 14/20 and the name loses its colour: a green name at the top of a phone
   sheet competed with the result's green check */
function CallFormSignature({
  className,
  program,
  name,
  args = [],
  ...props
}: React.ComponentProps<"h3"> & { program?: string; name: string; args?: CallFormArg[] }) {
  return (
    <h3
      data-slot="call-form-signature"
      className={cn("font-mono text-[0.9375rem] leading-[1.35] font-medium break-words @max-[30rem]/call-form:text-[0.875rem] @max-[30rem]/call-form:leading-5", className)}
      {...props}
    >
      {program && <span className="font-normal text-muted-foreground">{program}.</span>}
      <span className="text-syntax-function @max-[30rem]/call-form:text-foreground">{name}</span>
      <span className="text-foreground">({args.map((a) => `${a.name}: ${typeName(a.type)}`).join(", ")})</span>
    </h3>
  )
}

/* A labelled field in the code face: the name over it, so the request keeps
   one left edge. Password managers are told to leave it alone */
function CallFormField({
  className,
  name,
  type,
  fresh,
  disabled,
  ...props
}: Omit<React.ComponentProps<typeof Input>, "name" | "type"> & {
  name: string
  type: string
  /** a tag after the name: "New" once a deploy brings it */
  fresh?: React.ReactNode
}) {
  return (
    <label data-slot="call-form-field" className={cn("flex flex-col gap-2", fresh && "animate-rise motion-reduce:animate-none", disabled && "pointer-events-none opacity-60")}>
      <span className="flex items-center gap-2">
        <span className="font-mono text-code text-foreground">{name}</span>
        {fresh && <Tag variant="neutral">{fresh}</Tag>}
      </span>
      <Input
        placeholder={type}
        aria-label={`${name}, ${type}`}
        inputMode={/^[ui]\d+$/.test(type) ? "numeric" : undefined}
        autoComplete="off"
        data-1p-ignore
        data-lpignore="true"
        data-bwignore
        data-form-type="other"
        readOnly={disabled}
        className={cn(
          "h-10 w-full max-w-[360px] min-w-0 font-mono text-[0.8125rem] md:text-[0.8125rem] focus-visible:border-foreground/35 focus-visible:ring-0 read-only:text-muted-foreground pointer-coarse:h-12 pointer-coarse:max-w-none pointer-coarse:text-base",
          className
        )}
        {...props}
      />
    </label>
  )
}

/* Why the call can't go, right over the button it keeps off */
function CallFormNote({ className, ...props }: React.ComponentProps<"p">) {
  return <p data-slot="call-form-note" className={cn("max-w-[64ch] text-caption text-muted-foreground", className)} {...props} />
}

/* What came back from the latest call: on its way, or confirmed or failed,
   set as the lesson's result cards are so a result reads the same anywhere.
   The status alone, with no instruction beside it (the request right above
   names it); the program's words on a well, their source beside them; the
   account; then how it went in one quiet sentence with Copy, Explorer and the
   log in one row (ResultDetails). Explorer used to sit at the status line's
   end in the grey of the fee beside it, and read as more of that note */
function CallFormResponse({
  className,
  result,
  messages,
  ...props
}: Omit<React.ComponentProps<"div">, "children"> & { result: CallFormResult; messages?: Partial<CallFormMessages> }) {
  const say = { ...MESSAGES, ...messages }
  const failed = result.status === "failed"
  const row = (i: number) => ({ className: "animate-print motion-reduce:animate-none", style: { "--i": i } as React.CSSProperties })
  if (result.status === "sending")
    return (
      <div data-slot="call-form-response" data-status="sending" className={cn("flex items-center gap-2", className)} {...props}>
        <Spinner className="size-4 text-muted-foreground" aria-hidden="true" />
        <span className="font-heading text-control font-medium text-foreground">{say.sending}</span>
      </div>
    )
  return (
    <div data-slot="call-form-response" data-status={result.status} className={cn("flex flex-col gap-3", className)} {...props}>
      {/* The status row of the lesson's cards: 16/24 at 500 */}
      <div {...row(0)} className={cn(row(0).className, "flex items-center gap-2")}>
        {failed ? <CircleX className="size-4 shrink-0 text-error" aria-hidden="true" /> : <Check className="size-4 shrink-0 text-success" aria-hidden="true" />}
        <span className="font-heading text-[1rem] leading-6 font-medium text-foreground">{failed ? say.failed : say.confirmed}</span>
      </div>
      {(result.log || result.children) && (
        <div {...row(1)} className={cn(row(1).className, "flex flex-col gap-1")}>
          {result.log && (
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-control bg-surface-well px-3 py-2.5">
              <p className={cn("min-w-0 font-mono text-code break-words", failed ? "text-error" : "text-foreground")}>{result.log}</p>
              {result.source && <span className="text-caption text-muted-foreground">{result.source}</span>}
            </div>
          )}
          {result.children}
        </div>
      )}
      {result.details && (
        <div {...row(2)}>
          <ResultDetails quiet text={result.details.text} copy={result.details.copy} explorer={result.explorerHref} log={result.details.log ?? []} />
        </div>
      )}
    </div>
  )
}

/* The IDL as JSON, read only, with Copy: it fills the panel's height and
   scrolls inside it. Copy sits outside the scroller, so it stays put while
   long lines scroll sideways. wrap breaks long lines instead, for a phone */
function CallFormIdl({
  className,
  json,
  wrap = false,
  messages,
  ...props
}: Omit<React.ComponentProps<"div">, "children"> & { json: string; wrap?: boolean; messages?: Partial<CallFormMessages> }) {
  const say = { ...MESSAGES, ...messages }
  return (
    <div data-slot="call-form-idl" className={cn("flex min-h-0 flex-1 flex-col gap-2", className)} {...props}>
      <p className="text-caption text-muted-foreground">{say.idlNote}</p>
      <div className="relative flex min-h-0 flex-1 flex-col">
        <div
          tabIndex={0}
          aria-label="IDL JSON, read only"
          className="min-h-0 flex-1 overflow-auto overscroll-contain rounded-control border border-border bg-surface-well py-2 pr-10 font-mono text-[0.75rem] leading-[1.6] outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          {json.split("\n").map((line, i) => (
            <div key={i} className={cn("px-3 text-foreground/80", wrap ? "break-all whitespace-pre-wrap" : "whitespace-pre")}>
              {highlightJson(line)}
            </div>
          ))}
        </div>
        <CopyButton value={json} label={say.copyIdl} className="absolute top-1.5 right-1.5 bg-surface-well" />
      </div>
    </div>
  )
}

function CallForm({
  className,
  idl,
  program,
  instruction: instructionProp,
  defaultInstruction,
  onInstructionChange,
  values: valuesProp,
  defaultValues,
  onValuesChange,
  onCall,
  result,
  stale,
  note,
  disabled = false,
  fresh = [],
  code,
  view: viewProp,
  defaultView = "form",
  onViewChange,
  empty,
  messages,
  ...props
}: Omit<React.ComponentProps<"div">, "children" | "defaultValue"> & {
  /** the IDL of the program as deployed; null before the first deploy */
  idl: CallFormIdlShape | null
  /** before the instruction in the heading; the IDL's metadata name when left out */
  program?: string
  /** the instruction shown; the last one in the IDL by default, the latest added */
  instruction?: string
  defaultInstruction?: string
  onInstructionChange?: (name: string) => void
  /** the fields of the instruction shown */
  values?: CallFormValues
  /** starting values, by instruction */
  defaultValues?: Record<string, Partial<CallFormValues>>
  onValuesChange?: (instruction: string, values: CallFormValues) => void
  onCall?: (instruction: string, values: CallFormValues) => void
  /** what came back from the latest call of the instruction shown */
  result?: CallFormResult
  /** the fields moved on since that call: a line over it, which dims */
  stale?: React.ReactNode
  /** why the call can't go; it keeps Call off */
  note?: React.ReactNode
  disabled?: boolean
  /** instruction or argument names a deploy just brought, tagged New */
  fresh?: string[]
  /** the client line under the heading; false hides it */
  code?: string | false
  view?: "form" | "idl"
  defaultView?: "form" | "idl"
  onViewChange?: (view: "form" | "idl") => void
  /** in place of the form before there is an IDL */
  empty?: React.ReactNode
  messages?: Partial<CallFormMessages>
}) {
  const say = { ...MESSAGES, ...messages }
  const [innerView, setInnerView] = React.useState(defaultView)
  const view = viewProp ?? innerView
  const [picked, setPicked] = React.useState(defaultInstruction)
  const [typed, setTyped] = React.useState<Record<string, CallFormValues>>({})
  const noteId = React.useId()

  if (!idl || idl.instructions.length === 0)
    return (
      <div data-slot="call-form" data-state="empty" className={cn("flex min-h-0 flex-1 flex-col items-center justify-center p-6 text-center", className)} {...props}>
        {empty ?? (
          <div className="flex max-w-sm flex-col items-center gap-2">
            <p className="font-heading text-control font-medium text-foreground">{say.emptyTitle}</p>
            <p className="text-caption text-muted-foreground">{say.emptyDescription}</p>
          </div>
        )}
      </div>
    )

  const ixs = idl.instructions
  const name = instructionProp ?? picked
  const ix = ixs.find((i) => i.name === name) ?? ixs[ixs.length - 1]
  const accounts = ix.accounts ?? []
  const start = defaultValues?.[ix.name]
  const values: CallFormValues = valuesProp ??
    typed[ix.name] ?? { args: { ...start?.args }, accounts: { ...start?.accounts } }
  const sending = result?.status === "sending"
  const missing = ix.args.some((a) => !values.args[a.name]?.trim()) || accounts.some((a) => asked(a) && !a.optional && !values.accounts[a.name]?.trim())
  const blocked = disabled || sending || missing || !!note
  const line = code === undefined ? clientLine(ix) : code
  const json = JSON.stringify(idl, null, 2)

  const pick = (n: string) => {
    setPicked(n)
    onInstructionChange?.(n)
  }
  const change = (group: keyof CallFormValues, key: string, value: string) => {
    const next = { ...values, [group]: { ...values[group], [key]: value } }
    setTyped((t) => ({ ...t, [ix.name]: next }))
    onValuesChange?.(ix.name, next)
  }
  const call = () => {
    if (!blocked) onCall?.(ix.name, values)
  }
  const enter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return
    e.preventDefault()
    call()
  }

  return (
    <div data-slot="call-form" data-view={view} className={cn("@container/call-form flex min-h-0 flex-1 flex-col", className)} {...props}>
      <div className="flex shrink-0 px-6 pt-4 @max-[30rem]/call-form:px-4">
        <Segmented
          variant="quiet"
          value={view}
          onValueChange={(v) => {
            setInnerView(v as "form" | "idl")
            onViewChange?.(v as "form" | "idl")
          }}
          aria-label={say.view}
        >
          <SegmentedItem value="form">{say.form}</SegmentedItem>
          <SegmentedItem value="idl">{say.idl}</SegmentedItem>
        </Segmented>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
        {view === "idl" ? (
          <div className="flex min-h-0 flex-1 flex-col px-6 py-4 @max-[30rem]/call-form:px-4">
            <CallFormIdl json={json} messages={messages} className="w-full max-w-[720px]" />
          </div>
        ) : (
          /* One rhythm: 4 in the heading, 8 inside a unit, 16 between rows,
             24 between the request's groups, 32 between request and response */
          <div className="flex flex-col gap-8 px-6 pt-4 pb-8 @max-[30rem]/call-form:gap-6 @max-[30rem]/call-form:px-4">
            <section aria-label="Request" className="flex w-full max-w-[720px] flex-col gap-4">
              {ixs.length > 1 && (
                <Segmented variant="chips" tone="neutral" value={ix.name} onValueChange={pick} aria-label={say.instruction}>
                  {ixs.map((i) => (
                    <SegmentedItem key={i.name} value={i.name} className="font-mono text-code pointer-coarse:h-10">
                      {i.name}
                      {fresh.includes(i.name) && (
                        <Tag variant="neutral" className="ml-0.5 h-4">
                          {say.fresh}
                        </Tag>
                      )}
                    </SegmentedItem>
                  ))}
                </Segmented>
              )}
              {/* Under 30rem the request is one object on a quiet plate, so it reads as what you
                  send and the answer under it, on the bare panel, as what came back */}
              <div className="mb-2 flex flex-col gap-1 @max-[30rem]/call-form:mb-0 @max-[30rem]/call-form:gap-2 @max-[30rem]/call-form:rounded-[12px] @max-[30rem]/call-form:bg-foreground/[0.04] @max-[30rem]/call-form:p-3">
                <CallFormSignature program={program ?? idl.metadata?.name} name={ix.name} args={ix.args} />
                {line && (
                  <p className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 text-caption text-muted-foreground @max-[30rem]/call-form:flex-col @max-[30rem]/call-form:border-t @max-[30rem]/call-form:border-border @max-[30rem]/call-form:pt-2 @max-[30rem]/call-form:text-[0.75rem] @max-[30rem]/call-form:leading-4">
                    {say.inCode}
                    {/* It breaks after a dot, never inside a name: ".rpc(" and ")" ended on two lines */}
                    <code className="min-w-0 font-mono text-code break-words text-foreground/80 @max-[30rem]/call-form:text-[0.8125rem] @max-[30rem]/call-form:leading-5 @max-[30rem]/call-form:text-foreground/60">
                      {line.split(".").map((part, i) => (
                        <React.Fragment key={i}>
                          {i > 0 && "."}
                          {i > 0 && <wbr />}
                          {part}
                        </React.Fragment>
                      ))}
                    </code>
                  </p>
                )}
              </div>
              {ix.args.map((a) => (
                <CallFormField
                  key={a.name}
                  name={a.name}
                  type={typeName(a.type)}
                  fresh={fresh.includes(a.name) ? say.fresh : undefined}
                  disabled={sending}
                  value={values.args[a.name] ?? ""}
                  onChange={(e) => change("args", a.name, e.target.value)}
                  onKeyDown={enter}
                />
              ))}
              {accounts.length > 0 && (
                <fieldset data-slot="call-form-accounts" className="mt-2 flex flex-col gap-4">
                  <legend className="mb-4 text-caption text-muted-foreground">{say.accounts}</legend>
                  {accounts.map((a) =>
                    asked(a) ? (
                      <CallFormField
                        key={a.name}
                        name={a.name}
                        type="pubkey"
                        disabled={sending}
                        value={values.accounts[a.name] ?? ""}
                        onChange={(e) => change("accounts", a.name, e.target.value)}
                        onKeyDown={enter}
                      />
                    ) : (
                      <div key={a.name} data-slot="call-form-account" className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
                        <span className="font-mono text-code text-foreground">{a.name}</span>
                        <span className="min-w-0 truncate text-caption text-muted-foreground">
                          {a.signer ? say.signer : a.address ? <code className="font-mono">{a.address}</code> : say.derived}
                        </span>
                      </div>
                    )
                  )}
                </fieldset>
              )}
              <div className="mt-2 flex flex-col items-start gap-2">
                {note && <CallFormNote id={noteId}>{note}</CallFormNote>}
                {/* A call that can't go: under 30rem a faint fill with dim words, as the full grey drew more
                    eye than the answer, and an outline read as a live second action. The note is read with it */}
                <Button
                  data-slot="call-form-submit"
                  size="action"
                  disabled={blocked}
                  onClick={call}
                  aria-describedby={note ? noteId : undefined}
                  className={cn(
                    "@max-[30rem]/call-form:h-12 @max-[30rem]/call-form:w-full",
                    note && "@max-[30rem]/call-form:border-0 @max-[30rem]/call-form:bg-foreground/[0.06] @max-[30rem]/call-form:text-foreground/40 @max-[30rem]/call-form:disabled:opacity-100"
                  )}
                >
                  {sending ? <Spinner aria-hidden="true" /> : <Play className="size-3 fill-current" />}
                  {sending ? say.calling : say.call(ix.name)}
                </Button>
              </div>
            </section>

            {/* Narrower than the request: what you read stays together, the log beside its source */}
            <section aria-label="Response" aria-live="polite" className="flex w-full max-w-[560px] flex-col gap-2">
              {result && stale && !sending && <p className="text-caption text-muted-foreground">{stale}</p>}
              {result && <CallFormResponse result={result} messages={messages} className={cn(stale && !sending && "opacity-60")} />}
            </section>
          </div>
        )}
      </div>
    </div>
  )
}

export { CallForm, CallFormField, CallFormIdl, CallFormNote, CallFormResponse, CallFormSignature }
export type { CallFormAccount, CallFormArg, CallFormIdlShape, CallFormInstruction, CallFormMessages, CallFormResult, CallFormValues }
