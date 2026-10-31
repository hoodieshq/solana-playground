import * as React from "react"
import { cva } from "class-variance-authority"
import { Check, ChevronRight, SkipForward, X } from "lucide-react"
import { Collapsible as CollapsiblePrimitive } from "radix-ui"
import { cn } from "@/lib/utils"
import { Prose } from "@/components/ui/prose"

/* A question with a few options, the card a lesson waits on. Solana's
   gradient rings it while it waits. The options are a radio list: a right
   pick lights green, a wrong one turns red with one line of why
   (QuizOptionReason) and shakes once, and the focus moves on to the next
   option still open. suggested lights the last one left after two misses.

   The component does not know the answer: onPick says what was picked, and
   the statuses come back as props. Hold a right pick for half a second
   before folding the card to its QuizRecord, so the green is seen.

   With hotkeys, keys 1 to 9 pick, S skips, H asks for the hint and the
   arrows move between options, wherever the focus is on the page except a
   field. Give hotkeys to one card at a time, the one waiting. The arrows
   always work inside the options.

   bleed steps the card out of the text column to 8px from the panel's
   edges, so the task reads apart from the reading. It assumes a column
   inset 20px from the panel (16 on a phone); a host with another inset sets
   --bleed to its inset less 8. The space over the card is the host's: stand
   it 40 under the text above it. */

/* The same as RunCard's bleed, so the two cards that wait on you line up */
const bleedClass = "[--bleed:12px] max-sm:[--bleed:8px] -mx-(--bleed)"

/* A line of code too long for its row breaks before a `.`, the way a chained
   call is set, rather than after `await`, which left the keyword alone */
function chained(node: React.ReactNode): React.ReactNode {
  if (typeof node !== "string") return node
  return node.split(/(?=\.)/).flatMap((part, k) => (k ? [<wbr key={k} />, part] : [part]))
}

/* Words split on the spaces between them, a `code` chip kept whole however
   many spaces it holds */
function tokens(text: string): string[] {
  const out: string[] = []
  let word = ""
  let inCode = false
  for (const ch of text) {
    if (ch === "`") inCode = !inCode
    if (ch === " " && !inCode) {
      if (word) out.push(word)
      word = ""
    } else word += ch
  }
  if (word) out.push(word)
  return out
}

type QuizContextValue = {
  titleId: string
  busy: boolean
  pick: (value: string) => void
  announce: (text: string) => void
}

const QuizContext = React.createContext<QuizContextValue | null>(null)

const optionSelector = '[data-slot="quiz-option"]'

/* Focus the option a step from the focused one, or the first or last when
   none is focused. Options already ruled out are skipped */
function moveFocus(root: HTMLElement | null, by: 1 | -1) {
  const options = [...(root?.querySelectorAll<HTMLButtonElement>(optionSelector) ?? [])].filter((o) => o.dataset.status !== "wrong")
  if (!options.length) return false
  const at = options.findIndex((o) => o === document.activeElement)
  const next = at === -1 ? (by === 1 ? options[0] : options[options.length - 1]) : options[at + by]
  next?.focus()
  return !!next
}

function Quiz({
  className,
  hotkeys = false,
  busy = false,
  onPick,
  onSkip,
  onHint,
  bleed = false,
  children,
  ...props
}: React.ComponentProps<"section"> & {
  /** step out of the text column to 8px from the panel's edges */
  bleed?: boolean
  /** whether this card owns the keys right now */
  hotkeys?: boolean
  /** picks wait, as while the assistant is still writing */
  busy?: boolean
  onPick?: (value: string) => void
  onSkip?: () => void
  onHint?: () => void
}) {
  const titleId = React.useId()
  const root = React.useRef<HTMLElement | null>(null)
  const [said, setSaid] = React.useState("")

  const pick = React.useCallback(
    (value: string) => {
      if (!busy) onPick?.(value)
    },
    [busy, onPick]
  )

  // The newest handlers, for the one listener below
  const latest = React.useRef({ onSkip, onHint })
  React.useEffect(() => {
    latest.current = { onSkip, onHint }
  })

  React.useEffect(() => {
    if (!hotkeys) return
    const onKey = (e: KeyboardEvent) => {
      const target = e.target instanceof HTMLElement ? e.target : null
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return
      if (target?.closest("textarea, input, select, [contenteditable]")) return
      const options = [...(root.current?.querySelectorAll<HTMLButtonElement>(optionSelector) ?? [])]
      const n = Number(e.key)
      if (Number.isInteger(n) && n >= 1 && n <= options.length) {
        e.preventDefault()
        options[n - 1].click()
      } else if (e.key.toLowerCase() === "s" && latest.current.onSkip) {
        e.preventDefault()
        latest.current.onSkip()
      } else if (e.key.toLowerCase() === "h" && latest.current.onHint) {
        e.preventDefault()
        latest.current.onHint()
      } else if ((e.key === "ArrowDown" || e.key === "ArrowUp") && !root.current?.contains(document.activeElement)) {
        if (moveFocus(root.current, e.key === "ArrowDown" ? 1 : -1)) e.preventDefault()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [hotkeys])

  return (
    <QuizContext.Provider value={{ titleId, busy, pick, announce: setSaid }}>
      <section
        ref={root}
        data-slot="quiz"
        data-busy={busy || undefined}
        data-bleed={bleed || undefined}
        tabIndex={-1}
        aria-labelledby={titleId}
        className={cn(
          // 19 at the foot, so the footer row stands 20 from the card's edge counting the 1px ring
          "group/quiz rounded-panel p-5 pb-[19px] shadow-[0_8px_24px_rgb(0_0_0/0.08)] outline-none gradient-stroke [--stroke-fill:var(--card-ground)] max-sm:p-4 max-sm:pb-[19px] dark:shadow-[0_8px_24px_rgb(0_0_0/0.3)]",
          bleed && bleedClass,
          className
        )}
        {...props}
      >
        {children}
        {/* A wrong pick's reason, read out once as it appears */}
        <p aria-live="polite" className="sr-only">
          {said}
        </p>
      </section>
    </QuizContext.Provider>
  )
}

/* The question, 18/26, a step over the 16px text before it: it is what you
   answer, so it reads as the card's own title. 12 under it to the options */
function QuizTitle({ className, ...props }: React.ComponentProps<"h3">) {
  const ctx = React.useContext(QuizContext)
  return (
    <h3
      data-slot="quiz-title"
      id={ctx?.titleId}
      className={cn("mb-3 font-heading text-[1.125rem] leading-[1.625rem] font-medium tracking-normal text-foreground", className)}
      {...props}
    />
  )
}

function QuizOptions({ className, onKeyDown, ...props }: React.ComponentProps<"div">) {
  const ctx = React.useContext(QuizContext)
  return (
    <div
      data-slot="quiz-options"
      role="group"
      aria-labelledby={ctx?.titleId}
      onKeyDown={(e) => {
        onKeyDown?.(e)
        if (e.defaultPrevented || (e.key !== "ArrowDown" && e.key !== "ArrowUp")) return
        if (moveFocus(e.currentTarget, e.key === "ArrowDown" ? 1 : -1)) e.preventDefault()
      }}
      className={cn("flex flex-col gap-2 group-data-busy/quiz:pointer-events-none group-data-busy/quiz:opacity-50", className)}
      {...props}
    />
  )
}

type QuizOptionStatus = "idle" | "right" | "wrong" | "suggested"

const quizOptionVariants = cva(
  "group/quiz-option flex min-h-11 w-full items-start gap-3 rounded-lg border py-3 pr-4 pl-3.5 text-left transition-colors duration-100 outline-none active:translate-y-px pointer-coarse:py-3.5 motion-reduce:transition-none",
  {
    variants: {
      status: {
        idle: "border-border bg-foreground/[0.02] hover:border-foreground/25 hover:bg-foreground/[0.05] focus-visible:border-foreground/25 focus-visible:bg-foreground/[0.05] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
        suggested:
          "border-foreground/30 bg-foreground/[0.04] hover:bg-foreground/[0.06] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
        right: "border-success/50 bg-success/10",
        // Ruled out, it mirrors the right pick a step quieter, so the reason reads and the rest stay brighter
        wrong: "cursor-default border-error/25 bg-error/[0.05] active:translate-y-0",
      },
    },
    defaultVariants: {
      status: "idle",
    },
  }
)

const QuizOptionContext = React.createContext<{ reasonId?: string }>({})

/* One option. Its children are the words, or code with code set, and
   under them its QuizOptionReason once it is ruled out. Pass the reason only
   then: it is not part of the option's name, it describes it */
function QuizOption({
  className,
  value,
  status = "idle",
  code = false,
  disabled,
  onClick,
  children,
  ...props
}: Omit<React.ComponentProps<"button">, "value"> & {
  value: string
  status?: QuizOptionStatus
  /** the option is a line of code: mono, wrapping at its own edge */
  code?: boolean
}) {
  const ctx = React.useContext(QuizContext)
  const reasonId = React.useId()
  const ref = React.useRef<HTMLButtonElement>(null)
  const was = React.useRef(status)
  const [shaking, setShaking] = React.useState(false)

  // Turned wrong just now: shake once, and if it had the focus, pass it on to the next option still open
  React.useEffect(() => {
    if (status === "wrong" && was.current !== "wrong") {
      setShaking(true)
      const el = ref.current
      if (el && document.activeElement === el) {
        const root = el.closest('[data-slot="quiz-options"]')
        const open = [...(root?.querySelectorAll<HTMLButtonElement>(optionSelector) ?? [])].filter(
          (o) => o !== el && o.dataset.status !== "wrong"
        )
        const after = open.find((o) => el.compareDocumentPosition(o) & Node.DOCUMENT_POSITION_FOLLOWING)
        requestAnimationFrame(() => (after ?? open[0])?.focus())
      }
    }
    was.current = status
  }, [status])

  const settled = status === "wrong" || status === "right"
  return (
    <QuizOptionContext.Provider value={{ reasonId }}>
      <button
        ref={ref}
        type="button"
        data-slot="quiz-option"
        data-status={status}
        data-code={code || undefined}
        value={value}
        disabled={disabled}
        aria-disabled={settled || undefined}
        aria-describedby={status === "wrong" ? reasonId : undefined}
        onClick={(e) => {
          onClick?.(e)
          if (!e.defaultPrevented && !settled) ctx?.pick(value)
        }}
        onAnimationEnd={() => setShaking(false)}
        className={cn(quizOptionVariants({ status }), shaking && "animate-shake motion-reduce:animate-none", className)}
        {...props}
      >
        {/* One line of the option tall, 24 for words and code alike, so the mark sits on the first line's middle whether it wraps or not */}
        <span
          aria-hidden="true"
          className={cn(
            "grid h-6 w-[1.125rem] shrink-0 place-items-center",
            "text-muted-foreground group-hover/quiz-option:text-foreground group-focus-visible/quiz-option:text-foreground"
          )}
        >
          {status === "right" ? (
            <span className="grid size-[1.125rem] animate-pop place-items-center rounded-[5px] bg-success text-success-foreground motion-reduce:animate-none">
              <Check strokeWidth={2.75} className="size-3" />
            </span>
          ) : status === "wrong" ? (
            <span className="grid size-[1.125rem] place-items-center rounded-[5px] bg-error/15 text-error">
              <X strokeWidth={2.75} className="size-3" />
            </span>
          ) : (
            <span className="size-4 rounded-full border-[1.5px] border-muted-foreground/70 transition-colors group-hover/quiz-option:border-foreground group-focus-visible/quiz-option:border-foreground motion-reduce:transition-none" />
          )}
        </span>
        {/* Words 16/24 at the lesson's weight, 320, filling the line to the edge: balanced, they broke early with room to spare. Code
            14/24 in the text's one colour: syntax colours picked out some answers over others and read as
            hints. Its second line starts on the option's own edge, and a long line breaks before a `.` */}
        <span
          className={cn(
            "block min-w-0 flex-1 font-read text-[1rem] leading-6 text-foreground",
            "group-data-code/quiz-option:font-mono group-data-code/quiz-option:font-normal group-data-code/quiz-option:text-[0.875rem] group-data-code/quiz-option:break-words group-data-code/quiz-option:whitespace-pre-wrap group-data-code/quiz-option:text-wrap",
            "group-data-[status=wrong]/quiz-option:text-muted-foreground"
          )}
        >
          {code ? React.Children.map(children, chained) : children}
        </span>
      </button>
    </QuizOptionContext.Provider>
  )
}

/* The tutor's word on a ruled out option, under its words, opening on a
   verdict: <strong>Not quite.</strong> and one sentence of why. It is read
   out once as it appears */
function QuizOptionReason({ className, children, ...props }: React.ComponentProps<"span">) {
  const quiz = React.useContext(QuizContext)
  const { reasonId } = React.useContext(QuizOptionContext)
  const ref = React.useRef<HTMLSpanElement>(null)
  const announce = quiz?.announce
  React.useEffect(() => {
    if (announce && ref.current?.textContent) announce(ref.current.textContent)
  }, [announce])
  return (
    <span
      ref={ref}
      data-slot="quiz-option-reason"
      id={reasonId}
      aria-hidden="true"
      className={cn(
        // 13 on a 20 line. In a record it sits 4 under its option, so it reads as the option's, not a block of its own
        "mt-2 block animate-in font-sans text-caption leading-5 font-normal text-wrap whitespace-normal text-foreground/80 duration-150 fade-in slide-in-from-top-1 max-sm:mt-2.5 motion-reduce:animate-none in-data-[slot=quiz-record-option]:mt-1 in-data-[slot=quiz-record-option]:text-muted-foreground [&_strong]:font-medium [&_strong]:text-foreground",
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}

/* Under the options: Type it myself, Hint, Skip, as ghost buttons pulled
   out by their own padding so the labels stand on the options' edge. 20
   over the row and 20 under it, so it sits with the card's bottom edge as
   its footer rather than halfway between it and the options */
function QuizActions({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="quiz-actions"
      className={cn("-mx-2.5 mt-5 flex items-center gap-1 [&_[data-slot=button]]:pointer-coarse:h-11", className)}
      {...props}
    />
  )
}

/* The question once it is answered: one line with the answer it ended on
   and how, which opens to the question and its options as they ended.
   right is ticked green; skipped, passed by, is not */
function QuizRecord({
  className,
  status = "right",
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.Root> & { status?: "right" | "skipped" }) {
  return <CollapsiblePrimitive.Root data-slot="quiz-record" data-status={status} className={cn("group/quiz-record", className)} {...props} />
}

/* The answer on the record's one line, whole words only: each word or chip
   is an item of a wrapping row exactly one line tall, so one that does not
   fit wraps to the hidden second line and is dropped whole. An ellipsis cut
   it mid word, or mid chip ("#[deriv…"), which read as broken code. No JS
   measuring: the clip is the layout's own. Code splits on spaces and before
   a `.`, never inside a token, so `await pg.program...` does not show only
   await */
function RecordAnswer({ code, children }: { code: boolean; children: React.ReactNode }) {
  const pieces =
    typeof children !== "string"
      ? children
      : code
        ? children.split(/(?<= )|(?=\.)/).map((t, i) => (
            <code key={i} className="whitespace-pre">
              {t}
            </code>
          ))
        : tokens(children).map((t, i) => (
            <span key={i} className="whitespace-nowrap">
              <Prose text={t} />
            </span>
          ))
  return (
    <span
      data-slot="quiz-record-answer"
      className={cn(
        "flex h-6 min-w-0 shrink flex-wrap items-center overflow-hidden text-foreground",
        code ? "font-mono text-[0.875rem] leading-6" : "gap-x-[0.25em] text-[1rem] leading-6"
      )}
    >
      {pieces}
    </span>
  )
}

/* The record's line. label names the question in a thread of them, "Q1";
   meta is how it went, "first try". The children are the answer: pass it as
   a string, with code set for a line of code, and it is clipped by whole
   words and chips. Other children are laid out as the clip's items as they
   are */
function QuizRecordTrigger({
  className,
  label,
  meta,
  code = false,
  children,
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.Trigger> & {
  label?: React.ReactNode
  meta?: React.ReactNode
  /** the answer is a line of code: mono 14 on the row's 24 line */
  code?: boolean
}) {
  return (
    <CollapsiblePrimitive.Trigger
      data-slot="quiz-record-trigger"
      className={cn(
        "group/quiz-record-trigger flex min-h-9 w-full items-center gap-2 rounded-control border border-border bg-card-ground px-3 py-1.5 text-left text-caption outline-none hover:border-border-strong focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring pointer-coarse:min-h-11",
        className
      )}
      {...props}
    >
      {label && <span className="shrink-0 text-xs font-label text-subtle tabular-nums">{label}</span>}
      <Check
        strokeWidth={2.5}
        aria-hidden="true"
        className="size-3.5 shrink-0 text-success group-data-[status=skipped]/quiz-record:hidden"
      />
      <SkipForward aria-hidden="true" className="hidden size-3.5 shrink-0 text-subtle group-data-[status=skipped]/quiz-record:block" />
      <RecordAnswer code={code}>{children}</RecordAnswer>
      {/* Pinned at the far end by the chevron: a clipped answer keeps the width it was squeezed to, so
          a qualifier right after it stood a ragged distance off the last word shown */}
      <span className="ml-auto shrink-0 text-subtle">{meta && <>· {meta}</>}</span>
      <ChevronRight
        aria-hidden="true"
        className="size-3.5 shrink-0 text-subtle transition-transform duration-150 group-hover/quiz-record-trigger:text-foreground group-data-[state=open]/quiz-record-trigger:rotate-90 motion-reduce:transition-none"
      />
    </CollapsiblePrimitive.Trigger>
  )
}

function QuizRecordContent({ className, ...props }: React.ComponentProps<typeof CollapsiblePrimitive.Content>) {
  return <CollapsiblePrimitive.Content data-slot="quiz-record-content" className={cn("mt-2 flex flex-col gap-1.5", className)} {...props} />
}

/* 12 over the rows (the list's 6 and 6 of its own), as the live card has
   it, so it heads the rows instead of reading as one more */
function QuizRecordQuestion({ className, ...props }: React.ComponentProps<"p">) {
  return <p data-slot="quiz-record-question" className={cn("mb-1.5 px-0.5 text-caption leading-5 text-muted-foreground", className)} {...props} />
}

/* An option as it ended, numbered: right in green, wrong in red with its
   words grey. A QuizOptionReason inside it says why, for any option. 10
   over the option's 24 line and 12 under a reason's 20 line, so the ink
   sits as far from the top edge as from the bottom; 10 under a row of one
   line */
function QuizRecordOption({
  className,
  index,
  status = "idle",
  code = false,
  children,
  ...props
}: React.ComponentProps<"div"> & { index: number; status?: "idle" | "right" | "wrong"; code?: boolean }) {
  return (
    <div
      data-slot="quiz-record-option"
      data-status={status}
      data-code={code || undefined}
      className={cn(
        "group/quiz-record-option flex items-start gap-3 rounded-lg border border-border px-3 pt-2.5 pb-2.5 has-data-[slot=quiz-option-reason]:pb-3",
        "data-[status=right]:border-success/40 data-[status=right]:bg-success/5 data-[status=wrong]:border-error/25 data-[status=wrong]:bg-error/[0.05]",
        className
      )}
      {...props}
    >
      {/* The badge in a slot one line of the option tall, so it centres on the first line */}
      <span className="grid h-6 shrink-0 place-items-center">
        <span className="grid size-6 place-items-center rounded-sm bg-muted text-xs font-act text-muted-foreground tabular-nums">{index}</span>
      </span>
      <span
        className={cn(
          "min-w-0 flex-1 text-[1rem] leading-6 text-foreground",
          "group-data-code/quiz-record-option:font-mono group-data-code/quiz-record-option:text-[0.875rem] group-data-code/quiz-record-option:break-words group-data-code/quiz-record-option:whitespace-pre-wrap",
          "group-data-[status=wrong]/quiz-record-option:text-muted-foreground"
        )}
      >
        {code ? React.Children.map(children, chained) : children}
      </span>
    </div>
  )
}

export {
  Quiz,
  QuizActions,
  QuizOption,
  QuizOptionReason,
  QuizOptions,
  QuizRecord,
  QuizRecordContent,
  QuizRecordOption,
  QuizRecordQuestion,
  QuizRecordTrigger,
  QuizTitle,
  quizOptionVariants,
}
