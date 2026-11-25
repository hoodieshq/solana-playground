import { useEffect, useRef, useState } from "react"
import { Check, X } from "lucide-react"

import { cn } from "@/lib/utils"

import { ASSISTANT_KEYS } from "../../../desktop/keys"
import { useChoices } from "../../../desktop/navLit/choices"
import { AssistantMark } from "../../../ui/AssistantMark"
import { LANDING_CHIPS } from "../../read"
import { Prose } from "../../../ui/Prose"
import { ApplyCardView } from "../../../ui/turns/ApplyCard"
import { READ, READ_CODE, reducedMotion } from "../../../ui/type"
import { ask, busy, FIX_ASK, firstIx, metaOf, onChain, openFile, settleFix, type Project, type Turn } from "../../store"
import { standing } from "../catalog-parts"
import { Ask } from "./GuideColumn"
import { PanelHide } from "./parts"
import { nextStageOf, stageHint } from "./Stages"
import { Assistant, User } from "./Talk"
import { baseName, failLive, firstChanged, mainFile, reveal } from "./util"

/* The assistant beside the code (the client, 17 Nov): it answers what you ask and never leads. An empty
   column said nothing (Almaz, 18 Nov), so it keeps one short note by the composer. The note doesn't name
   the next step: the bar does, and said twice it was a second caption for the stages. It says what the bar
   can't, something about this code or this moment worth knowing before the step. It is a note, not a
   message: it never joins the thread, it rewrites itself as you build, deploy and call, and once you are
   talking it is gone */

type Brief = { text: string; ask: string[] }

/** What to notice in each catalog program before the first step: one thing about its code that the bar and
 * the card don't say. Written by hand for every one (Almaz, 18 Nov): the line made from the list of
 * instructions was true and dry */
const NOTES: Record<string, string> = {
  counter: "Two instructions: `initialize_counter` makes the account, `increment` adds one to it. The number lives in that account, not in the program.",
  "create-account": "One instruction, `create_system_account`. It asks the System Program to make the account: a first cross program call.",
  "transfer-sol": "One instruction, `transfer_sol_with_cpi`. Its `amount` is in lamports: 1 SOL is 1,000,000,000.",
  favorites: "`set_favorites` writes to an account derived from your wallet's address, so every wallet gets its own.",
  "hello-solana": "The whole program is `process_instruction`: two `msg!` lines and `Ok(())`. It reads no accounts and no input.",
  "spl-memo": "`process_instruction` does two checks before it logs: every account passed in has signed, and the input is valid UTF-8.",
  "spl-noop": "`process_instruction` returns `Ok(())` and touches nothing. Callers use it to leave data in the transaction log.",
  "spl-record": "Four instructions on one record account, each in its own `process_` function. `authority` is the wallet allowed to change the record.",
  "spl-shared-memory": "One instruction, `write`: it copies `data` into the shared account at `offset`. A caller reads the answer back from there.",
  "spl-binary-option": "Read it in the order a bet runs: `initialize_binary_option`, `trade`, `settle`, `collect`. The escrow holds both deposits until `settle`.",
  "spl-binary-oracle-pair": "`deposit` mints a pass token and a fail token together. `decide` is the only call the oracle makes, and it settles which one pays.",
  "spl-stateless-asks": "One instruction, `accept_offer`, and no escrow account: the maker approved a program address, and the swap moves both tokens in one call.",
  "spl-feature-proposal": "Two instructions for a whole vote: `propose` mints the voting tokens, and `tally` counts the ones sent back.",
  "spl-name-service": "A name is an account: `create` makes it and `update` writes under it. Every change takes the `owner` account.",
}

/** The same for a program with no note of its own, from its instructions */
function codeNote(p: Project): string {
  const meta = metaOf(p)
  if (!meta) return "Ask about any line, or about an error when a build stops."
  if (NOTES[meta.slug]) return NOTES[meta.slug]
  const names = meta.ixs.map((ix) => `\`${ix.name}\``)
  if (names.length === 0) return `${meta.description.replace(/\.$/, "")}.`
  if (names.length === 1) return `One instruction, ${names[0]}. ${meta.ixs[0].line}`
  return `${names.length} instructions, ${names.slice(0, 3).join(", ")}${names.length > 3 ? " and more" : ""}. \`${meta.first}\` is the one a caller starts with.`
}

/** The note for where the project is */
function briefOf(p: Project): Brief {
  const meta = metaOf(p)
  if (p.opening) return { text: `Bringing ${p.name} in from GitHub.`, ask: [] }
  if (p.draft) return { text: "", ask: [] }
  if (p.read) return { text: codeNote(p), ask: LANDING_CHIPS }
  // While a run is going, the note says so: "It answered" before the call had come back said the opposite
  if (busy(p)) return { text: `${stageHint(p) ?? "Running"}. The terminal shows each step as it goes.`, ask: [] }
  const fail = [...p.feed].reverse().find((t): t is Extract<Turn, { k: "build-fail" }> => t.k === "build-fail")
  // The rows under it offer to explain and to fix, so the note says only where it stopped (the judged spec, 25 Nov)
  if (fail && failLive(p, fail)) return { text: `The compiler stopped at \`${baseName(fail.file ?? mainFile(p))}\` line ${fail.line}.`, ask: ["Explain the error", FIX_ASK] }
  if (p.deployFailed) return { text: "Nothing reached devnet, and the build is still good.", ask: ["Is it safe to deploy?"] }
  const next = nextStageOf(p)
  const chain = onChain(p)
  if (p.framework === "ts-client")
    return next
      ? { text: "`client.ts` calls a program that is already on devnet. A run prints what it answers.", ask: ["What should I read first?"] }
      : { text: "It ran. Change the call in `client.ts` to see a different answer.", ask: ["What should I read first?"] }
  switch (next?.id) {
    case "build":
      return next.state === "stale"
        ? { text: chain ? `The program on devnet still runs the old code until ${baseName(firstChanged(p))} is deployed again.` : `The last build doesn't include your change to ${baseName(firstChanged(p))}.`, ask: ["What should I read first?"] }
        : { text: codeNote(p), ask: ["What should I read first?", "What does a deploy cost?"] }
    case "deploy":
      return chain
        ? { text: "An upgrade keeps the address, and callers get the new code at once.", ask: ["Is it safe to deploy?"] }
        : { text: `A deploy takes about ${meta?.cost ?? 0.48} devnet SOL. The faucet covers it, and the address is yours to upgrade later.`, ask: ["Is it safe to deploy?"] }
    case "call": {
      if (next.label === "Run") return { text: "`client.ts` calls your program and prints its logs in the terminal.", ask: ["What should I read first?"] }
      if (!p.idl) return { text: "One Docker command builds the IDL from this project. The steps are in Interact.", ask: ["What is an IDL?"] }
      const ix = meta?.ixs.find((x) => x.name === firstIx(p))
      return { text: ix ? `\`${ix.name}\` is the one to call first. ${ix.line}` : "The form is drawn from the IDL: pick an instruction and fill in its accounts.", ask: ["What should I read first?"] }
    }
    default: {
      // Only after a call: the note names it and stops there
      const ix = [...p.feed].reverse().find((t): t is Extract<Turn, { k: "call-ok" }> => t.k === "call-ok")?.ix
      return { text: ix ? `Called \`${ix}\` on devnet. Logs are in the terminal.` : "Live on devnet.", ask: ["What should I read first?"] }
    }
  }
}

/** The note over the chips, set as an answer is: the reading text on the column's ground. It is there while
 * the thread is empty: once you are talking it steps out and the answers keep the room */
function BriefNote({ text, phone }: { text: string; phone: boolean }) {
  return (
    <p aria-label="About this project" className={cn(READ, "shrink-0 pt-3", phone ? "px-4 [html.portrait_&]:px-8" : "px-5")}>
      <Prose text={text} {...READ_CODE} />
    </p>
  )
}

/* The talk goes on (Almaz, 18 Nov: an assistant that answers and then has nothing to offer reads as
   silent; it is one chat, and it should keep going). So there is always something to ask over the field:
   first what the last answer itself leads to, then what fits the moment, then the rest of what the
   assistant can speak to about this program. Every one of these has a real answer behind it */

const NEXT_STEP = "What's the next step?"
const ixAsk = (name: string) => `What does ${name} do?`

/** Everything worth asking about this program, the general after the particular */
function poolOf(p: Project): string[] {
  const meta = metaOf(p)
  if (p.read)
    return [...LANDING_CHIPS, "What is the entrypoint?", "What does it check?", "What happens on bad input?", "What do I send to call it?", "What is a signer?", "Who pays for a call?", "Can I call it?"]
  return ["What should I read first?", ...(meta?.ixs.slice(0, 3).map((ix) => ixAsk(ix.name)) ?? []), "What does a deploy cost?", "Is it safe to deploy?", "What is an IDL?"]
}

/** Where an answer leads: the questions it raises, by what was asked */
function followOf(p: Project, asked: string): string[] {
  const t = asked.toLowerCase()
  const ixs = metaOf(p)?.ixs ?? []
  if (p.read) {
    if (t.includes("build") || t.includes("deploy")) return ["What is a Native program?", "Can I call it?"]
    if (t.includes("native program")) return ["What is the entrypoint?", "What does it check?"]
    if (t.includes("used for")) return ["What does it check?", "What do I send to call it?"]
    if (t.includes("entrypoint")) return ["What does it check?", "What happens on bad input?"]
    if (t.includes("check")) return ["What happens on bad input?", "What is a signer?"]
    if (t.includes("send") || t.includes("call")) return ["Who pays for a call?", "What is a signer?"]
    return []
  }
  if (t.includes("read first")) return ixs.slice(0, 2).map((ix) => ixAsk(ix.name))
  if (t.includes("cost")) return ["Is it safe to deploy?"]
  if (t.includes("safe")) return ["What does a deploy cost?"]
  if (t.includes("idl")) return ixs.slice(0, 1).map((ix) => ixAsk(ix.name))
  const at = ixs.findIndex((ix) => t.includes(ix.name))
  if (at !== -1) return [...ixs.filter((_, i) => i !== at).slice(0, 2).map((ix) => ixAsk(ix.name)), "What is an IDL?"]
  return []
}

/** The chips over the field: the last answer's own, what it leads to, the moment's, then the pool. One
 * already asked isn't offered again until they have all been; the next step can always be asked, since
 * its answer moves with the project */
/** Questions about a failed build: offered only while it still fails (Nikita, 20 Nov: after the deploy
 * it was still going over the error) */
const ABOUT_FAIL = new Set(["Explain the error", FIX_ASK, "Show me the line", "Why does Rust need this?"])

function chipsOf(p: Project, turns: Talk[], moment: string[]): string[] {
  // No code yet: only the answers to the assistant's own question
  if (p.draft) {
    const last = turns[turns.length - 1]
    return last?.k === "assistant" ? (last.chips ?? []) : []
  }
  const all = chipsFor(p, turns, moment)
  const fail = [...p.feed].reverse().find((t) => t.k === "build-fail")
  return fail && failLive(p, fail) ? all : all.filter((c) => !ABOUT_FAIL.has(c))
}

function chipsFor(p: Project, said: Talk[], moment: string[]): string[] {
  const turns = said.filter((t): t is Extract<Talk, { k: "user" | "assistant" }> => t.k === "user" || t.k === "assistant")
  const last = said[said.length - 1]
  if (last?.k === "user") return []
  const asked = turns.filter((t) => t.k === "user").map((t) => t.text)
  const lastAsked = asked[asked.length - 1]
  const answer = turns[turns.length - 1]
  const all = [...new Set([...(answer?.k === "assistant" ? (answer.chips ?? []) : []), ...(lastAsked ? followOf(p, lastAsked) : []), ...moment, ...poolOf(p)])]
  const fresh = all.filter((c) => !asked.includes(c))
  const list = fresh.length >= 2 ? fresh : all.filter((c) => c !== lastAsked)
  return p.read || turns.length === 0 ? list : [...list.slice(0, 2), NEXT_STEP, ...list.slice(2)]
}

/** Where a model was picked mid talk, by project: after how many lines of the thread, and which */
const switches = new Map<string, { at: number; model: string }[]>()

// Answers that finished typing, and those already there when a project opened: coming back finds them whole
const typed = new Set<string>()

/** The runs the thread notes as they finish */
type Event = Extract<Turn, { k: "build-ok" | "build-fail" | "deploy-ok" | "deploy-fail" | "call-ok" | "call-fail" | "run-ok" }>
const EVENTS = new Set<Turn["k"]>(["build-ok", "build-fail", "deploy-ok", "deploy-fail", "call-ok", "call-fail", "run-ok"])
type Talk = Extract<Turn, { k: "user" | "assistant" | "fix" }> | Event

/** Your questions, their answers and fixes, and once you are talking, a line for each run as it finishes:
 * the chat follows the project, so an answer about an error doesn't stand as the last word after the
 * deploy went through (Nikita, 20 Nov). A line the assistant posted on its own (a faucet note after a
 * failed run) stays out: here it only speaks when asked */
function chat(p: Project): Talk[] {
  const out: Talk[] = []
  let waiting = 0
  for (const t of p.feed) {
    if (t.k === "user") {
      out.push(t)
      waiting++
    } else if (t.k === "assistant") {
      if (waiting > 0) {
        out.push(t)
        waiting--
      }
    } else if (t.k === "fix" || (EVENTS.has(t.k) && out.length > 0)) out.push(t as Talk)
  }
  return out
}

/** What a finished run did, in a few words */
function eventText(t: Event): string {
  switch (t.k) {
    case "build-ok":
      return "Build passed"
    case "build-fail":
      return t.kind === "compile" ? `Build failed at ${baseName(t.file ?? "")}:${t.line}` : "The build server didn't answer"
    case "deploy-ok":
      return t.upgrade ? "Upgraded on devnet" : "Deployed to devnet"
    case "deploy-fail":
      return "Deploy failed"
    case "call-ok":
      return `Called ${t.ix}`
    case "call-fail":
      return `${t.ix} failed`
    case "run-ok":
      return "client.ts ran"
  }
}

/** A run's line in the thread: a mark and its words, quieter than an answer */
function EventLine({ t }: { t: Event }) {
  const ok = t.k.endsWith("-ok")
  return (
    <p className="flex items-center gap-2 text-13 leading-5 text-muted-foreground">
      {ok ? <Check aria-hidden="true" strokeWidth={2.5} className="size-3.5 text-success" /> : <X aria-hidden="true" strokeWidth={2.5} className="size-3.5 text-error" />}
      {eventText(t)}
    </p>
  )
}

const FRAMEWORK_WORD: Record<Project["framework"], string> = { anchor: "Anchor", native: "Native Rust", pinocchio: "Pinocchio", quasar: "Quasar", "ts-client": "TypeScript client" }

/** What an open program finds before anything is said, as judged on 25 Nov after a UX architect's and a UI
 * designer's passes: anchored to the field, on the column's own left edge. A quiet line with the program and its
 * framework (no mark: the head has it; no "Ask about": the field says it; no step: the bar says it), then the
 * note in the assistant's own reading face, its first word set as its answers are, then up to three questions as
 * filled rows, pressable at a glance without a hover. No card, no label, no fact under a question: it gave the
 * answer away. It steps out once you are talking */
function Greeting({ p, asks, phone }: { p: Project; asks: string[]; phone: boolean }) {
  const meta = metaOf(p)
  const brief = briefOf(p)
  const fail = [...p.feed].reverse().find((t) => t.k === "build-fail")
  const failing = !!fail && failLive(p, fail)
  const own = (a: string) => !!meta?.ixs.some((ix) => ixAsk(ix.name) === a)
  const done = !!standing(p).done
  // While a build fails, its two questions alone; else the program's own instructions first, nothing about a
  // deploy once it is deployed, three at most
  const rows = failing
    ? brief.ask
    : [...asks.filter(own), ...asks.filter((a) => !own(a))].filter((a) => !done || (a !== "What does a deploy cost?" && a !== "Is it safe to deploy?")).slice(0, 3)
  return (
    <div className="flex min-h-full flex-col justify-end">
      <p className="text-13 leading-5 text-muted-foreground">{`${meta?.title ?? p.name} · ${FRAMEWORK_WORD[p.framework]}`}</p>
      {brief.text && (
        <p className={cn(READ, "mt-2")}>
          <Prose text={brief.text} chip="p-0! mr-0! text-16! leading-6!" ink="text-current" />
        </p>
      )}
      {rows.length > 0 && (
        // The rows' fills on the field's own edges, left and right, their words 16 in as the field's (Almaz, 25 Nov)
        // The rows are the field's suggestions: 24 from the words above, 12 to the field below (Almaz, 25 Nov)
        <div className={cn("mt-6 flex flex-col gap-1", phone && "mt-5")}>
          {rows.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => ask(p.id, a)}
              className="min-h-9 rounded-lg bg-foreground/[0.04] px-4 py-2 text-left text-13 leading-5 font-act text-foreground transition-colors duration-100 hover:bg-foreground/[0.07] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-purple active:bg-foreground/[0.10] motion-reduce:transition-none pointer-coarse:min-h-11"
            >
              {a}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/** The thread and the composer, with no head: the desktop's panel adds one, the phone's space has the bar */
export function AskThread({ p, phone = false }: { p: Project; phone?: boolean }) {
  const scroller = useRef<HTMLDivElement>(null)
  const turns = chat(p)
  const count = turns.length
  const [, tick] = useState(0)
  // What was said before this panel opened isn't typed out again
  const opened = useRef(false)
  if (!opened.current) {
    opened.current = true
    for (const t of turns) typed.add(`${p.id}-${t.id}`)
  }
  useEffect(() => {
    const el = scroller.current
    if (el) el.scrollTop = el.scrollHeight
  })
  // A model picked mid talk leaves a line where it took over, as a run's does (Almaz, 25 Nov)
  const { model } = useChoices()
  const was = useRef(model)
  useEffect(() => {
    if (was.current === model) return
    was.current = model
    if (count === 0) return
    switches.set(p.id, [...(switches.get(p.id) ?? []), { at: count, model }])
    tick((n) => n + 1)
  }, [model, count, p.id])
  const switched = switches.get(p.id) ?? []
  const brief = briefOf(p)
  const chips = chipsOf(p, turns, brief.ask)
  // Nothing said yet in a program with code: the greeting holds the column, and its questions leave the field
  const greet = count === 0 && !p.draft && !p.opening
  return (
    <>
      <div ref={scroller} className={cn("min-h-0 flex-1 overflow-y-auto overscroll-contain pt-[22px]", greet ? "pb-0" : "pb-3", phone ? "px-4" : "px-5")}>
        {greet && <Greeting p={p} asks={chips.filter((c) => c !== "Show me the line")} phone={phone} />}
        <div role="log" aria-live="polite" aria-label="Assistant" className="flex flex-col gap-[15px]">
          {/* The tutorial thread's rhythm: 15 from a question to its answer, 24 before the next question */}
          {turns.map((t, i) => {
            const key = `${p.id}-${t.id}`
            return (
              <div key={`${t.k}-${t.id}`} className={t.k === "user" && i > 0 ? "mt-[9px]" : undefined}>
                {t.k === "user" ? (
                  <User t={t} />
                ) : t.k === "fix" ? (
                  <ApplyCardView
                    {...t}
                    fix
                    onApply={() => {
                      settleFix(p.id, t.id, "applied")
                      openFile(p.id, t.file)
                      reveal(t.file, t.line, { lit: true })
                    }}
                    onKeep={() => settleFix(p.id, t.id, "kept")}
                    onUndo={() => settleFix(p.id, t.id, "undone")}
                    onReview={() => {
                      openFile(p.id, t.file)
                      reveal(t.file, t.line)
                    }}
                  />
                ) : t.k !== "assistant" ? (
                  <EventLine t={t} />
                ) : (
                  <Assistant
                    t={t}
                    typing={!typed.has(key) && !reducedMotion()}
                    onTyped={() => {
                      typed.add(key)
                      tick((n) => n + 1)
                    }}
                  />
                )}
                {switched
                  .filter((s) => s.at === i + 1)
                  .map((s, k) => (
                    <p key={k} className="mt-[15px] flex items-center gap-2 text-13 leading-5 text-muted-foreground">
                      <AssistantMark strokeWidth={1.75} className="size-3.5" />
                      {`Switched to ${s.model}`}
                    </p>
                  ))}
              </div>
            )
          })}
        </div>
      </div>
      {count === 0 && !greet && <BriefNote text={brief.text} phone={phone} />}
      <Ask p={p} phone={phone} chips={greet ? [] : chips} context={!p.opening} />
    </>
  )
}

export function AskPanel({ p, onClose, className }: { p: Project; onClose: () => void; className?: string }) {
  // The head as every panel's: its name, and Hide with the panel's own key (Nikita, 20 Nov)
  return (
    <aside aria-label="Assistant" className={className}>
      {/* No rule under the head (Almaz, 18 Nov: one line too many). The column's own left edge frames it, and
          the thread starts a clear step below */}
      <div className="flex h-10 shrink-0 items-center gap-2 pr-1.5 pl-5">
        <AssistantMark strokeWidth={1.75} className="text-muted-foreground" />
        {/* The name alone: the model sits under the field now, where it is changed (Almaz, 25 Nov) */}
        <h2 className="flex-1 text-13 font-act text-foreground">Assistant</h2>
        <PanelHide what="the assistant" keys={ASSISTANT_KEYS} onClick={onClose} />
      </div>
      <AskThread p={p} />
    </aside>
  )
}
