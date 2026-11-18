import { useEffect, useRef, useState } from "react"
import { X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { AssistantMark } from "../../../ui/AssistantMark"
import { LANDING_CHIPS } from "../../read"
import { Prose } from "../../../ui/Prose"
import { READ, READ_CODE, reducedMotion } from "../../../ui/type"
import { firstIx, metaOf, onChain, type Project, type Turn } from "../../store"
import { Ask } from "./GuideColumn"
import { nextStageOf } from "./Stages"
import { Assistant, User } from "./Talk"
import { baseName, failLive, firstChanged, mainFile } from "./util"

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
  if (p.read) return { text: codeNote(p), ask: LANDING_CHIPS }
  const fail = [...p.feed].reverse().find((t): t is Extract<Turn, { k: "build-fail" }> => t.k === "build-fail")
  if (fail && failLive(p, fail)) return { text: `The compiler stopped at ${baseName(fail.file ?? mainFile(p))} line ${fail.line}. I can explain the error.`, ask: ["Explain the error"] }
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
    default:
      return { text: "It answered, and the logs are in the terminal. Deploy again after a change and the address stays the same.", ask: ["What should I read first?"] }
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
function chipsOf(p: Project, turns: ReturnType<typeof chat>, moment: string[]): string[] {
  const last = turns[turns.length - 1]
  if (last?.k === "user") return []
  const asked = turns.filter((t) => t.k === "user").map((t) => t.text)
  const lastAsked = asked[asked.length - 1]
  const all = [...new Set([...(last?.k === "assistant" ? (last.chips ?? []) : []), ...(lastAsked ? followOf(p, lastAsked) : []), ...moment, ...poolOf(p)])]
  const fresh = all.filter((c) => !asked.includes(c))
  const list = fresh.length >= 2 ? fresh : all.filter((c) => c !== lastAsked)
  return p.read || turns.length === 0 ? list : [...list.slice(0, 2), NEXT_STEP, ...list.slice(2)]
}

// Answers that finished typing, and those already there when a project opened: coming back finds them whole
const typed = new Set<string>()

/** Your questions and their answers. A line the assistant posted on its own (a faucet note after a failed
 * run) stays out: here it only speaks when asked */
function chat(p: Project) {
  const out: Extract<Turn, { k: "user" | "assistant" }>[] = []
  let asked = false
  for (const t of p.feed) {
    if (t.k === "user") {
      out.push(t)
      asked = true
    } else if (t.k === "assistant") {
      if (asked) out.push(t)
    } else if (t.k !== "act") asked = false
  }
  return out
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
  const brief = briefOf(p)
  const chips = chipsOf(p, turns, brief.ask)
  return (
    <>
      <div ref={scroller} className={cn("min-h-0 flex-1 overflow-y-auto overscroll-contain pt-[22px] pb-3", phone ? "px-4" : "px-5")}>
        <div role="log" aria-live="polite" aria-label="Assistant" className="flex flex-col gap-[15px]">
          {/* The tutorial thread's rhythm: 15 from a question to its answer, 24 before the next question */}
          {turns.map((t, i) => {
            const key = `${p.id}-${t.id}`
            return (
              <div key={`${t.k}-${t.id}`} className={t.k === "user" && i > 0 ? "mt-[9px]" : undefined}>
                {t.k === "user" ? (
                  <User t={t} />
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
              </div>
            )
          })}
        </div>
      </div>
      {count === 0 && <BriefNote text={brief.text} phone={phone} />}
      <Ask p={p} phone={phone} chips={chips} />
    </>
  )
}

export function AskPanel({ p, onClose, className }: { p: Project; onClose: () => void; className?: string }) {
  return (
    <aside aria-label="Assistant" className={className}>
      {/* No rule under the head (Almaz, 18 Nov: one line too many). The column's own left edge frames it, and
          the thread starts a clear step below */}
      <div className="flex h-10 shrink-0 items-center gap-2 pr-1.5 pl-5">
        <AssistantMark strokeWidth={1.75} className="text-muted-foreground" />
        <h2 className="flex-1 text-[0.8125rem] font-act text-foreground">Assistant</h2>
        <Button variant="ghost" size="icon-sm" aria-label="Close the assistant" onClick={onClose} className="text-muted-foreground">
          <X />
        </Button>
      </div>
      <AskThread p={p} />
    </aside>
  )
}
