import { createContext, useContext, useEffect, useReducer, type Dispatch, type ReactNode } from "react"

import { CHANGE_CHIP, CHANGE_TEXT, STUCK, actionWord, answerFor, stuckAnswer, wordFits, type Context } from "./answers"
import { checkOwn, fixOf, holds, insertBlock, msgLine, sameCode, straightQuotes, typedKey, uncomment, withId, withOwnText, type OwnCheck } from "./check"
import {
  BEATS,
  beatIdsOf,
  CLIENT,
  INITIAL_FILES,
  LESSON,
  LIB,
  PROGRAM_ID,
  STEPS,
  buildOk,
  callLog,
  clientLog,
  clientOf,
  DEMO_FAUCET,
  deployLog,
  faucetLog,
  firstAct,
  libOf,
  libTargetOf,
  panelLog,
  programLog,
  upgradeLog,
  type Act,
  type ActBeat,
  type Ask,
  type Beat,
  type Chop,
  type Follow,
  type Grow,
  type Memory,
  type Player,
  type Quote,
  type Tx,
} from "./data"
import { diffLines } from "./diff"
import { deployedArgs, idlLine, idlOf, idlShape, signature } from "./idl"
import { Runner } from "./runner"

export type Screen = "gallery" | "step" | "finish"
/** Only whether something runs. What is offered comes from the live card (spec 9.1) */
export type Phase = "idle" | "building" | "deploying" | "running" | "calling" | "testing"

/** A failed build or run, as its card and the editor show it */
export type FailInfo = { line: number; column?: number; span?: number; reason: string; explain?: string; code?: string }

type TurnBase = { id: number; at: number; step: number } // step -1 for the intro
export type Turn = TurnBase &
  (
    | { kind: "intro"; done: boolean }
    | { kind: "anchor" }
    | { kind: "say"; beat?: string; text: string; quote?: Quote; follow?: Follow; followDone?: boolean; nudge?: boolean }
    | { kind: "you"; text: string; code?: boolean }
    | { kind: "ask"; beat: string; picks: number[]; done: null | "right" | "typed" | "skipped" | "test"; lead?: string; hinted?: boolean }
    | { kind: "wrote"; file: string; lines: number[]; added: number; created?: boolean; appended?: boolean; from?: string; preview?: string[] }
    | {
        kind: "act"
        beat: string
        act: Act
        state: "live" | "running" | "done" | "interrupted"
        took?: number
        nudge?: boolean
        name?: string
        via?: "test"
        failed?: boolean
        /** A chop card's chops so far: it stays up for the next one until the step passes */
        chops?: Chop[]
        /** A grow card's presses so far, the same way */
        grows?: Grow[]
        /** A deploy put up again after the faucet said no: its button reads Try again */
        retry?: boolean
        /** A deploy the faucet stopped: its record says so */
        faucet?: boolean
      }
    | {
        kind: "result"
        act: Act | "test"
        ok: boolean
        log: string[]
        fail?: FailInfo
        tx?: Tx
        from?: "client" | "chat" | "test"
        /** A failure still waiting for Explain or "I'll fix it myself" */
        open?: boolean
        planned?: boolean
        upgrade?: boolean
        args?: string
        took?: number
        /** The file the run read, as it was then: the status line tells when it has changed since */
        src?: string
        /** A deploy that stopped before it began: the wallet was short and the faucet said no */
        funding?: boolean
        /** The arguments a Call panel call went with, so the panel can tell when its fields moved on */
        sent?: Record<string, string>
        /** A build of a fix typed by hand, from the open "Fix it" question: it opens on the compiler's
         * words, and the question stays the way on, so it carries no Explain of its own */
        checked?: boolean
      }
    | { kind: "win"; beat: string; done: boolean; took: number; via?: "test" }
    // `fix` is Show me the fix's proposal, with `source` the answer that offered it
    | { kind: "apply"; file: string; before: string; after: string; line: number; done: null | "applied" | "kept"; fix?: boolean; source?: number }
    | { kind: "finish" }
  )

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never
export type Body = DistributiveOmit<Turn, "id" | "at">

/** What waits to be posted, one by one, so the conversation reads at a speaking pace. A write is
 * worked out when it posts, against the file as it is then */
type Pending =
  | { kind: "turn"; turn: Body }
  | { kind: "write"; step: number; file: string; block: string; from: string; ref?: string; start?: string }
  | { kind: "create"; step: number; file: string }
  // The rest of a question's block, around the line the learner typed themselves
  | { kind: "fill"; step: number; beat: string }
  // A change to lines already there, worked out when it was queued
  | { kind: "file"; step: number; file: string; code: string; from: string }

/** A run going: which act, its stages and the one running, and the card it belongs to */
/** `args` are what the Call panel sent with `ix`, when it was given any */
export type Run = { act: Act | "test"; stages: string[]; stage: number; turn: number | null; at: number; ix?: string; args?: Record<string, string> }

export type State = {
  v: 2
  screen: Screen
  /** The live step, 0 to 3; the intro is `started: false` */
  step: number
  started: boolean
  files: Record<string, string>
  passed: boolean[]
  firstTry: boolean[]
  phase: Phase
  run: Run | null
  /** The whole conversation, persisted: it is the lesson, and desktop and phone read the same one */
  thread: Turn[]
  queue: Pending[]
  nextId: number
  /** Next beat per step, and whether the step runs its onFail beats */
  cursor: { at: number; fail: boolean }[]
  error: (FailInfo & { file: string }) | null
  /** Lines just written, for the editor's tint and chip */
  wrote: { file: string; lines: number[]; at: number; from?: string } | null
  /** A place in a file to show: Show in lib.rs, a compiler line, the step bar. `caret` puts the caret there */
  reveal: { file: string; lines: number[]; at: number; caret?: boolean; top?: boolean } | null
  tabs: string[]
  /** The Playground wallet has had its airdrop: only the first deploy funds it first */
  funded: boolean
  /** The faucet's limit was met once (`?demo=faucet`): the next airdrop goes through */
  faucetTried: boolean
  /** Files the learner opened, the latest first: the phone's file sheet lists them as Recent */
  recent: string[]
  /** The file shown, or "test" for the Call panel */
  open: string
  /** Lines the assistant added to each file since the learner last opened or edited it, for +N */
  fresh: Record<string, number>
  /** The Call panel's dot: it arrived, or its IDL changed, and nobody has opened it since */
  testDot: boolean
  /** The NEW tags in the Call panel: the IDL changed since the panel was last looked at */
  idlNew: boolean
  tree: "closed" | "docked"
  terminal: boolean
  /** What the terminal shows: the last run's log */
  log: string[]
  builtLib: string | null
  deployedLib: string | null
  idlAt: number | null
  testName: string
  draft: string
  /** The name hello was last called with, for its log line and the finish */
  name: string | null
  txAt: number | null
  startedAt: number | null
  finishedAt: number | null
  /** When each step started and passed, for the divider's time and the win's clock */
  times: { from: number | null; to: number | null }[]
  /** Set after "change what hello says": the next message is the new text */
  awaiting: "story" | null
  /** A game lesson's player account on devnet, once the client created it */
  player: Player | null
  /** A memory lesson's accounts on devnet, once the client created them */
  memory: Memory | null
}

export type Action =
  | { type: "open"; screen: Screen }
  | { type: "start" }
  | { type: "restart" }
  | { type: "tick" }
  | { type: "answer"; turn: number; choice: number }
  | { type: "skip"; turn: number }
  | { type: "hint"; turn: number }
  | { type: "typeIt"; turn: number }
  | { type: "act"; act?: Act }
  | { type: "stage" }
  | { type: "test"; ix?: string; args?: Record<string, string> }
  | { type: "checkFix" }
  | { type: "explain" }
  | { type: "fixMyself" }
  | { type: "showFix"; turn: number }
  | { type: "follow"; turn: number }
  | { type: "ask"; text: string; phone?: boolean }
  | { type: "apply"; turn: number }
  | { type: "keep"; turn: number }
  | { type: "edit"; file: string; code: string }
  | { type: "openFile"; file: string }
  | { type: "openTest" }
  | { type: "reveal"; file: string; lines: number[]; caret?: boolean }
  | { type: "tree"; state: "closed" | "docked" }
  | { type: "terminal"; open: boolean }
  | { type: "testName"; text: string }
  | { type: "draft"; text: string }
  | { type: "next" }
  | { type: "goto"; step: number }
  | { type: "resetFile" }

/** Where a lesson's progress is saved. Hello Anchor keeps the key it had before there were others */
export const storageKey = (slug: string) => (slug === "hello-anchor" ? "pg-proto-tutorial-v2" : `pg-proto-tutorial-v2-${slug}`)
const key = () => storageKey(LESSON.card.slug)

/** Timings of D29. The prototype has no build server: these are what a run would take. A chop is a
 * game move, quicker so five in a row don't drag */
export const STAGE_MS: Record<string, number> = { Building: 1600, "Sending chop_tree to devnet": 900, "Sending grow to devnet": 900, "Sending grow_big to devnet": 900 }
export const stageMs = (stage: string) => STAGE_MS[stage] ?? (stage.startsWith("Compiling") || stage.startsWith("Sending") ? 1600 : 1100)

/** An instruction as the TypeScript client calls it: `init_big_map` is `initBigMap` */
export const camel = (ix: string) => ix.replace(/_(\w)/g, (_, c: string) => c.toUpperCase())

// The IDL goes up with the program, as anchor deploy does since 0.30, so Explorer can read the calls.
// An upgrade rewrites the one already there
const FUNDING = "Funding your wallet"
// A new Playground wallet holds 0 SOL: the first deploy tops it up from the faucet first
const deployStages = (s: State) => [...(s.funded ? [] : [FUNDING]), "Writing buffer", "Deploying", s.deployedLib === null ? "Uploading IDL" : "Upgrading IDL", "Confirming"]

export const initial = (): State => ({
  v: 2,
  screen: "gallery",
  step: 0,
  started: false,
  files: { ...INITIAL_FILES },
  passed: STEPS.map(() => false),
  firstTry: STEPS.map(() => true),
  phase: "idle",
  run: null,
  thread: [{ id: 1, at: 0, step: -1, kind: "intro", done: false }],
  queue: [],
  nextId: 2,
  cursor: STEPS.map(() => ({ at: 0, fail: false })),
  error: null,
  wrote: null,
  reveal: null,
  tabs: [LIB],
  funded: false,
  faucetTried: false,
  recent: [],
  open: LIB,
  fresh: {},
  testDot: false,
  idlNew: false,
  tree: "closed",
  terminal: false,
  log: [],
  builtLib: null,
  deployedLib: null,
  idlAt: null,
  testName: "",
  draft: "",
  name: null,
  txAt: null,
  startedAt: null,
  finishedAt: null,
  times: STEPS.map(() => ({ from: null, to: null })),
  awaiting: null,
  player: null,
  memory: null,
})

const setAt = <T,>(xs: T[], i: number, v: T) => xs.map((x, k) => (k === i ? v : x))

// ---- Reading the thread

/** The question still open, if any: there is never more than one */
export const liveAsk = (s: State) => {
  const t = [...s.thread].reverse().find((t) => t.kind === "ask" && t.done === null)
  return t && t.kind === "ask" ? { turn: t, beat: BEATS[t.beat] as Ask } : null
}

/** The act card waiting for its button, running, or cut short by a reload */
export const liveAct = (s: State) => {
  const t = [...s.thread].reverse().find((t) => t.kind === "act" && t.state !== "done")
  return t && t.kind === "act" ? { turn: t, beat: BEATS[t.beat] as ActBeat | undefined } : null
}

/** A failed build or run still waiting for Explain or "I'll fix it myself" */
export const liveFail = (s: State) => {
  const t = [...s.thread].reverse().find((t) => t.kind === "result" && t.open)
  return t && t.kind === "result" ? t : null
}

/** The win waiting for Next. The last step's win has no Next: the finish follows it */
export const liveWin = (s: State) => {
  const t = s.thread.find((t) => t.kind === "win" && !t.done && t.step < STEPS.length - 1)
  return t && t.kind === "win" ? t : null
}

/** Whether a card for this act is already up and waiting, or about to post: a second one would be a
 * second button for the same thing. `nudges` counts the redeploy nudge's card too; the script's own
 * card doesn't give way to one, since pressing a nudge doesn't move the script on */
function actUp(s: State, act: Act, nudges = true) {
  const same = (t: Body) => t.kind === "act" && t.act === act && t.state !== "done" && (nudges || !t.nudge)
  return s.thread.some(same) || s.queue.some((p) => p.kind === "turn" && same(p.turn))
}

/** The key line of a question that writes code: what the learner types for it by hand */
export const keyOf = (ask: Ask) => ask.key ?? (ask.code ? ask.options[ask.answer] : null)

export type Live = "intro" | "ask" | "act" | "fail" | "win" | "finish" | null

/** The one card that is the moment, which ⌘↵ and Enter speak to (spec 9.2) */
export function liveCard(s: State): Live {
  if (!s.started) return "intro"
  if (liveFail(s)) return "fail"
  if (liveWin(s)) return "win"
  const act = liveAct(s)
  if (act && act.turn.state !== "running") return "act"
  if (liveAsk(s)) return "ask"
  if (act) return "act"
  if (s.thread.some((t) => t.kind === "finish")) return "finish"
  return null
}

/** The step whose lib.rs a build of the moment is checked against: the live step's once its first
 * change to lib.rs is behind (a question answered, a block written), the last one before it until then */
function libStep(s: State) {
  for (let i = s.step; i >= 0; i--) {
    const step = STEPS[i]
    if (!libTargetOf(step)) continue
    if (i < s.step || s.passed[i]) return i
    const first = step.beats.findIndex((b) => (b.kind === "ask" || b.kind === "write") && !!b.writes && "file" in b.writes && b.writes.file === LIB)
    if (first === -1 || s.cursor[i].at > first + 1) return i
  }
  return 0
}

/** The lib.rs a build of the moment is checked against */
const libTarget = (s: State) => libTargetOf(STEPS[libStep(s)])!

/** Whether lib.rs differs from what's on devnet, whitespace aside: the amber dot on step 2 */
export const deployChanged = (s: State) => s.deployedLib !== null && !sameCode(s.files[LIB], s.deployedLib)

/** Lines a write lit, from the diff: the block's own lines, without the blank one that sets it apart */
function litLines(before: string, after: string) {
  let n = 0
  const added: number[] = []
  const blank: Set<number> = new Set()
  const rows = after.split("\n")
  for (const row of diffLines(before, after)) {
    if (row.kind === "removed") continue
    n++
    if (row.kind === "added") added.push(n)
  }
  added.forEach((l) => rows[l - 1].trim() === "" && blank.add(l))
  const solid = added.filter((l) => !blank.has(l))
  if (solid.length === 0) return []
  const lo = solid[0]
  const hi = solid[solid.length - 1]
  return added.filter((l) => l >= lo && l <= hi)
}

// ---- Posting

const post = (s: State, turn: Body): State => ({ ...s, queue: [...s.queue, { kind: "turn", turn }] })

/** Posts the next beats of the live step, from its cursor, up to the first that waits for the
 * learner: a question or an act. Nothing more once the step has passed */
function flow(s: State): State {
  const i = s.step
  if (s.passed[i]) return s
  const step = STEPS[i]
  const c = s.cursor[i]
  const beats = c.fail ? (step.onFail ?? []) : step.beats
  let next = s
  let at = c.at
  while (at < beats.length) {
    const b: Beat = beats[at]
    at++
    if (b.kind === "say") next = post(next, { kind: "say", step: i, beat: b.id, text: b.text, quote: b.quote })
    else if (b.kind === "write") {
      next = post(next, { kind: "say", step: i, beat: b.id, text: b.text })
      next = { ...next, queue: [...next.queue, "create" in b.writes ? { kind: "create", step: i, file: b.writes.create } : { kind: "write", step: i, file: b.writes.file, block: b.writes.block, from: b.id, ref: b.writes.ref, start: b.writes.start }] }
    } else if (b.kind === "ask") {
      next = post(next, { kind: "ask", step: i, beat: b.id, picks: [], done: null })
      break
    } else {
      // A card for the same act may already be up, posted again after an explanation: it serves
      if (actUp(next, b.act, false)) break
      if (b.say) next = post(next, { kind: "say", step: i, beat: b.id, text: b.say })
      next = post(next, { kind: "act", step: i, beat: b.id, act: b.act, state: "live" })
      break
    }
  }
  return { ...next, cursor: setAt(next.cursor, i, { ...c, at }) }
}

/** The step passes: its win posts, and on the last step the finish follows it */
function pass(s: State, i: number, via?: "test"): State {
  const now = Date.now()
  const from = s.times[i].from ?? now
  let next: State = { ...s, passed: setAt(s.passed, i, true), times: setAt(s.times, i, { from, to: now }) }
  // A step passed from elsewhere (the terminal, the nav) leaves nothing to ask: Deploy's guess included
  if (!via) next = { ...next, thread: next.thread.map((t) => (t.kind === "ask" && t.step === i && t.done === null ? { ...t, done: "skipped" } : t)) }
  next = post(next, { kind: "win", step: i, beat: STEPS[i].win.id, done: false, took: now - from, via })
  if (i === STEPS.length - 1) next = post(next, { kind: "finish", step: i })
  return next
}

/** Updates one turn in place */
const patch = (s: State, id: number, change: Partial<Turn>): State => ({
  ...s,
  thread: s.thread.map((t) => (t.id === id ? ({ ...t, ...change } as Turn) : t)),
})

/** A turn posted at once, not through the queue: a run's result, which lands when it lands */
function now(s: State, turn: Body): State {
  // An error quote keeps the line as it was when it was quoted: a fix later doesn't rewrite the history
  if (turn.kind === "say" && turn.quote?.tone === "error" && turn.quote.code === undefined)
    turn = { ...turn, quote: { ...turn.quote, code: (s.files[turn.quote.file] ?? "").split("\n")[turn.quote.line - 1] ?? "" } }
  return { ...s, thread: [...s.thread, { ...turn, id: s.nextId, at: Date.now() } as Turn], nextId: s.nextId + 1 }
}

/** A file written, with the editor's tint and the +N on its tab */
function write(s: State, file: string, code: string, from?: string): { s: State; lines: number[]; preview: string[] } {
  // Once deployed, lib.rs carries the program's address: no lesson block written later takes it back
  if (file === LIB && s.deployedLib !== null) code = withId(code, PROGRAM_ID)
  const lines = litLines(s.files[file] ?? "", code)
  const rows = code.split("\n")
  return {
    preview: lines.slice(0, 3).map((n) => rows[n - 1] ?? ""),
    s: {
      ...s,
      files: { ...s.files, [file]: code },
      wrote: { file, lines, at: Date.now(), from },
      fresh: { ...s.fresh, [file]: (s.fresh[file] ?? 0) + lines.length },
      tabs: s.tabs.includes(file) ? s.tabs : [...s.tabs, file],
      open: file,
      // The fix lands on the line the compiler pointed at, so the red goes with it
      error: s.error?.file === file ? null : s.error,
    },
    lines,
  }
}

/** One pending item, posted. A write lands in the file on the same frame as its card */
function tick(s: State): State {
  const [head, ...rest] = s.queue
  if (!head) return s
  let next: State = { ...s, queue: rest }
  if (head.kind === "turn") {
    const turn = head.turn
    next = now(next, turn)
    if (turn.kind === "anchor") {
      const step = STEPS[turn.step]
      next = { ...next, times: setAt(next.times, turn.step, { from: Date.now(), to: null }) }
      // Each step opens on its own file, once it exists
      if (next.tabs.includes(step.file)) next = { ...next, open: step.file }
    }
    if (turn.kind === "finish") next = { ...next, finishedAt: next.finishedAt ?? Date.now() }
    return next
  }
  if (head.kind === "create") {
    next = { ...next, tabs: next.tabs.includes(head.file) ? next.tabs : [...next.tabs, head.file], open: head.file }
    return now(next, { kind: "wrote", step: head.step, file: head.file, lines: [], added: 0, created: true })
  }
  if (head.kind === "fill") return fill(next, head.step, BEATS[head.beat] as Ask)
  if (head.kind === "file") {
    const w = write(next, head.file, head.code, head.from)
    return now(w.s, { kind: "wrote", step: head.step, file: head.file, lines: w.lines, added: w.lines.length, preview: w.preview, from: head.from })
  }
  const step = STEPS[head.step]
  const before = next.files[head.file] ?? ""
  const ref = head.ref ?? step.target
  const start = head.start ?? step.start
  const placed = insertBlock(before, head.block, ref, start)
  // Lines of the learner's own that the step's code doesn't know: then the block went at the end
  const own = before.split("\n").some((l) => uncomment(l).trim() !== "" && !holds(ref, l) && !holds(start, l))
  const w = write(next, head.file, placed.code, head.from)
  return now(w.s, { kind: "wrote", step: head.step, file: head.file, lines: w.lines, added: w.lines.length, preview: w.preview, appended: own, from: head.from })
}

/** Type it myself, after the learner typed the key line: the block the assistant would have written
 * goes in around it, as on a pick. Their line is taken out and comes back inside the block, in its
 * place there, with their own `msg!` text kept */
function fill(s: State, i: number, ask: Ask): State {
  if (!ask.writes) return s
  const { file, block } = ask.writes
  const step = STEPS[i]
  const before = s.files[file] ?? ""
  const key = keyOf(ask)
  const at = key ? typedKey(before, key) : null
  let base = before
  let own = block
  if (at !== null) {
    const rows = before.split("\n")
    own = withOwnText(block, rows[at - 1])
    rows.splice(at - 1, 1)
    base = rows.join("\n")
  }
  const placed = insertBlock(base, own, ask.writes.ref ?? step.target, ask.writes.start ?? step.start)
  const w = write(s, file, placed.code, ask.id)
  return now(w.s, { kind: "wrote", step: i, file, lines: w.lines, added: w.lines.length, preview: w.preview, from: ask.id })
}

/** Everything still waiting, posted at once: a reload doesn't replay the pace */
function flush(s: State): State {
  let next = s
  while (next.queue.length) next = tick(next)
  return next
}

// ---- Runs

/** The instruction a call sends, by its name alone: `hello`, not `hello(name)` */
const bare = (tx: Tx) => tx.instruction.replace(/\(.*$/, "")

function stagesFor(s: State, act: Act | "test", ix?: string): string[] {
  if (act === "build") return [`Compiling ${LESSON.program}`]
  if (act === "buildDeploy") return ["Building", ...deployStages(s)]
  if (act === "deploy") return s.builtLib !== null && sameCode(s.builtLib, s.files[LIB]) ? deployStages(s) : ["Building", ...deployStages(s)]
  if (act === "chop") return ["Sending chop_tree to devnet"]
  if (act === "grow" || act === "send") return [`Sending ${ix ?? "grow"} to devnet`]
  // A client that only reads an account it already made sends nothing
  if (act === "run" && LESSON.game && s.player) return ["Reading your player"]
  return [`Sending ${bare(LESSON.runTx(s))} to devnet`]
}

const PHASE: Record<Act | "test", Phase> = { build: "building", deploy: "deploying", buildDeploy: "deploying", run: "running", call: "calling", chop: "calling", grow: "calling", send: "calling", test: "testing" }

/** Starts the live act, the one a word or a key asked for. Only a card that is up runs: a build
 * started while step 1's question was open failed on half a program, cost the first try and left a
 * second Build card behind once the question was answered */
function startAct(s: State, want?: Act): State {
  if (s.phase !== "idle") return s
  const turn = liveAct(s)?.turn ?? null
  let next = s
  if (!turn) return s
  if (want && turn.act !== want && !(want === "build" && turn.act === "buildDeploy") && !(want === "deploy" && turn.act === "buildDeploy")) return s
  const act = turn.act
  let name: string | undefined
  if (act === "call") {
    name = s.draft.trim()
    if (!name) return s
  }
  // The instruction a send or a grow names: init_map, grow_big
  const ix = (BEATS[turn.beat] as ActBeat | undefined)?.ix
  const stages = stagesFor(next, act, ix)
  next = patch(next, turn.id, { state: "running", name } as Partial<Turn>)
  // The terminal opens by itself the first time a deploy or the client runs (spec 8.5)
  const first = (act === "deploy" || act === "buildDeploy") ? s.deployedLib === null : act === "run" ? !s.thread.some((t) => t.kind === "result" && t.from === "client") : false
  return {
    ...next,
    phase: PHASE[act],
    run: { act, stages, stage: 0, turn: turn.id, at: Date.now(), ix },
    name: act === "call" ? name! : next.name,
    // What was just written stops being lit at the next action
    wrote: null,
    terminal: next.terminal || first,
    log: [],
    error: act === "build" || act === "buildDeploy" || stages[0] === "Building" ? null : next.error,
  }
}

const buildLog = (lib: string) => [...buildOk(), idlLine(lib), "Build successful"]

/** A build checked, as the prototype's compiler: step 1 against its target, later rebuilds against
 * the lib.rs the moment expects. Any lib.rs the lesson builds passes: one typed ahead of the script
 * compiles too */
function checkBuild(s: State): OwnCheck {
  if (s.step === 0 && !s.passed[0]) return checkOwn(s.files[LIB], STEPS[0].target, LIB, "", LESSON)
  const lib = s.files[LIB]
  const targets = [...new Set(STEPS.map(libTargetOf).filter((t): t is string => !!t))]
  if (targets.some((t) => checkOwn(lib, t, LIB, undefined, LESSON).ok)) return { ok: true }
  const at = libStep(s)
  return checkOwn(lib, libTarget(s), LIB, at > 0 ? libOf(at - 1) : STEPS[0].target, LESSON)
}

/** A failed build or run: its card opens with Explain, the editor marks the line, the terminal opens */
function fail(s: State, act: Act, c: Extract<OwnCheck, { ok: false }>, file: string, took: number): State {
  const run = s.run
  // Step 1's first build fails by design on the missing struct: that's the planned failure, and it
  // isn't a miss on the learner's first try
  const planned = s.step === 0 && !s.cursor[0].fail && !s.passed[0] && !!c.planned
  // A build with no card of its own came from the "Fix it" question's Build: the question goes on
  const checked = act === "build" && run?.turn === null
  let next: State = run?.turn ? patch(s, run.turn, { state: "done", took, failed: true } as Partial<Turn>) : s
  const code = s.files[file].split("\n")[c.line - 1]?.trim() ?? ""
  next = now(next, { kind: "result", step: s.step, act, ok: false, log: c.log, fail: { line: c.line, column: c.column, span: c.span, reason: c.reason, explain: c.explain, code }, open: !checked, checked, planned, took, src: s.files[file] })
  return {
    ...next,
    phase: "idle",
    run: null,
    log: c.log,
    terminal: true,
    error: { file, line: c.line, column: c.column, span: c.span, reason: c.reason, explain: c.explain },
    firstTry: planned ? next.firstTry : setAt(next.firstTry, s.step, false),
  }
}

/** The faucet met its limit before a first deploy: the card says so, with the wallet's address and the
 * faucet, and the deploy comes up again under it as Try again. The next airdrop goes through */
function faucetLimit(s: State, took: number): State {
  const run = s.run!
  const turn = run.turn !== null ? s.thread.find((t) => t.id === run.turn) : undefined
  let next: State = run.turn !== null ? patch(s, run.turn, { state: "done", took, failed: true, faucet: true } as Partial<Turn>) : s
  const log = faucetLog()
  next = now(next, { kind: "result", step: s.step, act: run.act as Act, ok: false, log, funding: true, took })
  if (turn && turn.kind === "act") next = now(next, { kind: "act", step: s.step, beat: turn.beat, act: turn.act, state: "live", retry: true })
  return { ...next, phase: "idle", run: null, log, terminal: true, faucetTried: true }
}

/** After an act lands: the step passes on its goal, a scripted act moves the script on, a nudge just ends.
 * A chop's goal is what it shows, so a chop passes its step in `chopped` */
function afterAct(s: State, act: Act, nudge: boolean): State {
  const i = s.step
  if (nudge) return s
  if (!s.passed[i] && STEPS[i].goal === act && act !== "chop" && act !== "grow" && act !== "send") return pass(s, i)
  return flow(s)
}

/** A memory lesson's call from the chat, printed the way the client would make it: the call with its
 * arguments, its logs, then what the account is now */
function sendLog(s: State, tx: Tx, ix: string, out: string[] = []) {
  // Numbers as they are, text in quotes, as the client writes them
  const args = Object.values(LESSON.memory!.args(s, ix))
    .map((v) => (/^\d+$/.test(v) ? v : JSON.stringify(v)))
    .join(", ")
  return [`$ pg.program.methods.${camel(ix)}(${args}).rpc()`, "Sending transaction...", ...programLog(tx), ...out]
}

/** A stage finished: the next one starts, or the run lands */
function stage(s: State): State {
  const run = s.run
  if (!run) return s
  const took = Date.now() - run.at
  const turn = run.turn !== null ? s.thread.find((t) => t.id === run.turn) : undefined
  const nudge = !!(turn && turn.kind === "act" && turn.nudge)
  const done = run.stages[run.stage]
  // The airdrop before a first deploy: the faucet can say no, and then nothing is deployed
  if (done === FUNDING) {
    if (DEMO_FAUCET && !s.faucetTried) return faucetLimit(s, took)
    s = { ...s, funded: true }
  }
  // The build half of a deploy: checked before anything is written to devnet
  if (done === "Building") {
    const c = checkBuild(s)
    if (!c.ok) return fail(s, run.act as Act, c, LIB, took)
    s = { ...s, builtLib: s.files[LIB] }
  }
  if (run.stage + 1 < run.stages.length) return { ...s, run: { ...run, stage: run.stage + 1 } }

  const closeAct = (x: State, extra: Partial<Turn> = {}) => (run.turn !== null ? patch(x, run.turn, { state: "done", took, ...extra } as Partial<Turn>) : x)
  const idle = (x: State): State => ({ ...x, phase: "idle", run: null })

  if (run.act === "build") {
    const c = checkBuild(s)
    if (!c.ok) return fail(s, "build", c, LIB, took)
    const log = buildLog(s.files[LIB])
    let next = idle(closeAct({ ...s, builtLib: s.files[LIB], log, error: null }))
    next = now(next, { kind: "result", step: s.step, act: "build", ok: true, log, took, args: signature(deployedArgs(s.files[LIB])), src: s.files[LIB] })
    // A build that passes on its own resolves every open question of the step, typed by hand
    if (s.step === 0 && !s.passed[0]) {
      next = { ...next, thread: next.thread.map((t) => (t.kind === "ask" && t.step === 0 && t.done === null ? { ...t, done: "typed" } : t)), cursor: setAt(next.cursor, 0, { at: 99, fail: next.cursor[0].fail }) }
      return pass(next, 0)
    }
    return afterAct(next, "build", nudge)
  }

  if (run.act === "deploy" || run.act === "buildDeploy") {
    // The deploy gives the program its address, and Playground writes it into declare_id!, as the
    // real one does: the 1s placeholder was only ever a stand in
    const lib = withId(s.builtLib ?? s.files[LIB], PROGRAM_ID)
    const first = s.deployedLib === null
    const own = withId(s.files[LIB], PROGRAM_ID)
    const idLine = own.split("\n").findIndex((l) => l.includes(PROGRAM_ID)) + 1
    const argsAfter = signature(deployedArgs(lib))
    const changed = first || idlShape(s.deployedLib) !== idlShape(lib)
    const log = first ? deployLog(run.stages.includes(FUNDING)) : upgradeLog()
    let next = idle(closeAct({
      ...s,
      files: { ...s.files, [LIB]: own },
      builtLib: s.builtLib === null ? null : withId(s.builtLib, PROGRAM_ID),
      // The id lit where it landed, the first time, so the change to line 3 doesn't go unseen
      wrote: first && idLine > 0 ? { file: LIB, lines: [idLine], at: Date.now(), from: "deploy" } : s.wrote,
      deployedLib: lib,
      log,
      tabs: s.tabs.includes("test") ? s.tabs : [...s.tabs, "test"],
      testDot: s.testDot || changed,
      idlNew: !first && changed ? true : s.idlNew,
      idlAt: changed ? Date.now() : s.idlAt,
    }))
    next = now(next, { kind: "result", step: s.step, act: run.act, ok: true, log, upgrade: !first, took, args: argsAfter, src: own })
    return afterAct(next, run.act, nudge)
  }

  if (run.act === "run") {
    const c = checkOwn(s.files[CLIENT], clientOf(s.step), CLIENT, "", LESSON)
    if (!c.ok) return fail(s, "run", c, CLIENT, took)
    // A lesson that works its runs out itself: what the client sends and prints, and the accounts after
    if (LESSON.run) {
      const r = LESSON.run(s)
      const log = r.tx ? clientLog(r.tx, r.out) : [`$ run ${CLIENT}`, "Running client...", ...r.out, "Client finished"]
      let next = idle(closeAct({ ...s, log, memory: r.memory, txAt: r.tx ? Date.now() : s.txAt }))
      next = now(next, { kind: "result", step: s.step, act: "run", ok: true, log, tx: r.tx ?? undefined, from: "client", took, src: s.files[CLIENT] })
      return afterAct(next, "run", nudge)
    }
    const game = LESSON.game
    // A game's client creates the player once; later runs only read it back, with nothing to send
    if (game && s.player) {
      const p = s.player
      const log = [`$ run ${CLIENT}`, "Running client...", `Wood: ${p.wood}, energy: ${p.energy}`, "Client finished"]
      const next = idle(closeAct({ ...s, log }))
      return afterAct(now(next, { kind: "result", step: s.step, act: "run", ok: true, log, from: "client", took, src: s.files[CLIENT] }), "run", nudge)
    }
    const tx = LESSON.runTx(s)
    const player = game ? { wood: 0, energy: game.max, last: Date.now() } : null
    const log = clientLog(tx, player ? [`Wood: ${player.wood}, energy: ${player.energy}`] : [])
    let next = idle(closeAct({ ...s, log, txAt: Date.now(), player: player ?? s.player }))
    next = now(next, { kind: "result", step: s.step, act: "run", ok: true, log, tx, from: "client", took, src: s.files[CLIENT] })
    return afterAct(next, "run", nudge)
  }

  if (run.act === "chop") {
    const live = turn && turn.kind === "act" ? turn : null
    const r = LESSON.game!.chop(s)
    const log = ["$ pg.program.methods.chopTree().rpc()", "Sending transaction...", ...programLog(r.tx)]
    let next: State = idle({ ...s, player: r.player, log, txAt: Date.now(), terminal: s.terminal || !r.chop.ok })
    // The card keeps its button for the next chop, with this one listed on it
    if (live) next = patch(next, live.id, { state: "live", took, chops: [...(live.chops ?? []), r.chop] } as Partial<Turn>)
    return chopped(next, r.chop)
  }

  if (run.act === "grow") {
    const live = turn && turn.kind === "act" ? turn : null
    const ix = run.ix ?? "grow"
    const r = LESSON.memory!.grow(s, ix)
    const log = [`$ pg.program.methods.${camel(ix)}(${r.row.ok ? r.row.size : r.row.size + 10 * 1024}).rpc()`, "Sending transaction...", ...programLog(r.tx)]
    let next: State = idle({ ...s, memory: r.memory, log, txAt: Date.now(), terminal: s.terminal || !r.row.ok })
    if (live) next = patch(next, live.id, { state: "live", took, grows: [...(live.grows ?? []), r.row] } as Partial<Turn>)
    return grown(next, r.row)
  }

  if (run.act === "send") {
    const ix = run.ix ?? ""
    const r = LESSON.memory!.panel(s, ix)
    // Already done from the Call panel: nothing to send, and the script goes on
    if ("note" in r) return nudge ? idle(closeAct(s)) : flow(idle(closeAct(s, { via: "test" })))
    const log = sendLog(s, r.tx, ix, r.out)
    let next = idle(closeAct({ ...s, memory: r.memory, log, txAt: Date.now() }))
    next = now(next, { kind: "result", step: s.step, act: "send", ok: true, log, tx: r.tx, from: "chat", took })
    const i = next.step
    if (nudge) return next
    return !next.passed[i] && STEPS[i].goal === "send" && LESSON.memory!.panelPasses(i, ix) ? pass(next, i) : flow(next)
  }

  if (run.act === "call") {
    const name = s.name ?? ""
    const tx = LESSON.callTx!(s, name)
    const log = callLog(tx, name)
    let next = idle(closeAct({ ...s, log, txAt: Date.now() }))
    next = now(next, { kind: "result", step: s.step, act: "call", ok: true, log, tx, from: "chat", took })
    if (!nudge && !next.passed[next.step] && STEPS[next.step].goal === "call") next = nameClient(next, name)
    return afterAct(next, "call", nudge)
  }

  // A call from the Call panel: its result stays in the panel (the chat skips it). In a game it is a
  // move like any other: it can create the player or chop
  if (LESSON.game) return panelGame(idle(s), run.ix ?? "", took)
  if (LESSON.memory) return panelMemory(idle(s), run.ix ?? "", took, run.args)
  // In Hello Anchor it passes steps 3 and 4
  const args = deployedArgs(s.deployedLib)
  const named = args.length > 0
  const name = named ? s.testName.trim() : null
  const tx = named ? LESSON.callTx!(s, name ?? "") : LESSON.runTx(s)
  const log = panelLog(tx, name)
  let next: State = idle({ ...s, log, txAt: Date.now(), name: named ? name : s.name })
  next = now(next, { kind: "result", step: s.step, act: "test", ok: true, log, tx, from: "test", took })
  const i = next.step
  const passes = !next.passed[i] && ((i === 2 && next.deployedLib !== null) || (i === 3 && named && !!name))
  if (!passes) return next
  if (i === 3 && name) next = nameClient(next, name)
  return passedByPanel(next, i)
}

/** The act the panel's call stood in for is done, without its button ever pressed, and a question still
 * open in the step folds into its record, so nothing above the win can still be picked */
function passedByPanel(s: State, i: number): State {
  const next: State = {
    ...s,
    thread: s.thread.map((t) =>
      t.kind === "act" && t.step === i && t.state !== "done"
        ? { ...t, state: "done", via: "test" }
        : t.kind === "ask" && t.step === i && t.done === null
          ? { ...t, done: "test" }
          : t
    ),
  }
  return pass(next, i, "test")
}

/** A chop landed, from the chat or the panel: the step passes when it shows what the step is about,
 * and the card it came from turns into its record */
function chopped(s: State, c: Chop, via?: "test"): State {
  const i = s.step
  if (s.passed[i] || STEPS[i].goal !== "chop" || !LESSON.game!.chopPasses(s, i, c)) return s
  if (via) return passedByPanel(s, i)
  const card = liveAct(s)?.turn
  const next = card && card.act === "chop" ? patch(s, card.id, { state: "done" } as Partial<Turn>) : s
  return pass(next, i)
}

/** A grow landed, from the chat or the panel: the step passes when the press shows what it's about. A
 * grow that's a move on the way, not the step's goal, ends its card once the account is big enough,
 * and the script goes on */
function grown(s: State, row: Grow, via?: "test"): State {
  const i = s.step
  const card = liveAct(s)?.turn
  if (!s.passed[i] && STEPS[i].goal !== "grow" && card?.act === "grow" && LESSON.memory!.grownEnough(s, row))
    return flow(patch(s, card.id, { state: "done", via } as Partial<Turn>))
  if (s.passed[i] || STEPS[i].goal !== "grow" || !LESSON.memory!.growPasses(s, i, row)) return s
  if (via) return passedByPanel(s, i)
  const next = card && card.act === "grow" ? patch(s, card.id, { state: "done" } as Partial<Turn>) : s
  return pass(next, i)
}

/** A call from a memory lesson's Call panel: grow is a press like the chat's; the others send what the
 * chat's cards would, so the panel can make a map, or paint once the big map is there. A card in the
 * chat for the same call is done then, and the script goes on past it */
function panelMemory(s: State, ix: string, took: number, args?: Record<string, string>): State {
  if (ix === "grow" || ix === "grow_big") {
    const r = LESSON.memory!.grow(s, ix, args)
    const log = panelLog(r.tx, null)
    let next: State = { ...s, memory: r.memory, log, txAt: Date.now() }
    next = now(next, { kind: "result", step: s.step, act: "test", ok: r.row.ok, log, tx: r.tx, from: "test", took, sent: args })
    return grown(next, r.row, "test")
  }
  const r = LESSON.memory!.panel(s, ix, args)
  if ("note" in r) return s
  const log = panelLog(r.tx, null)
  let next: State = { ...s, memory: r.memory, log, txAt: Date.now() }
  next = now(next, { kind: "result", step: s.step, act: "test", ok: !r.tx.error, log, tx: r.tx, from: "test", took, sent: args })
  if (r.tx.error) return next
  const i = next.step
  if (!next.passed[i] && LESSON.memory!.panelPasses(i, ix)) return passedByPanel(next, i)
  const card = liveAct(next)?.turn
  return card?.act === "send" && (BEATS[card.beat] as ActBeat).ix === ix ? flow(patch(next, card.id, { state: "done", via: "test" } as Partial<Turn>)) : next
}

/** A call from a game's Call panel: init_player creates the player (and passes the step that asks for
 * it), chop_tree is a chop like the chat's */
function panelGame(s: State, ix: string, took: number): State {
  const game = LESSON.game!
  if (ix === "init_player") {
    if (s.player) return s
    const tx = LESSON.runTx(s)
    const log = panelLog(tx, null)
    let next: State = { ...s, log, txAt: Date.now(), player: { wood: 0, energy: game.max, last: Date.now() } }
    next = now(next, { kind: "result", step: s.step, act: "test", ok: true, log, tx, from: "test", took })
    const i = next.step
    return !next.passed[i] && STEPS[i].goal === "run" ? passedByPanel(next, i) : next
  }
  const r = game.chop(s)
  const log = panelLog(r.tx, null)
  let next: State = { ...s, log, txAt: Date.now(), player: r.player }
  next = now(next, { kind: "result", step: s.step, act: "test", ok: r.chop.ok, log, tx: r.tx, from: "test", took })
  return chopped(next, r.chop, "test")
}


/** Step 4 called hello with a name: client.ts still calls it without one, which the new hello
 * refuses, so its call takes the same name. Only the call's own parentheses change; the rest of the
 * file stays as the learner left it */
function nameClient(s: State, name: string): State {
  const before = s.files[CLIENT] ?? ""
  const after = before.replace(/(\.methods\s*\.\s*hello\()[^)]*(\))/, (_, open: string, close: string) => `${open}${JSON.stringify(name)}${close}`)
  if (!before.trim() || after === before) return s
  const next = post(s, {
    kind: "say",
    step: s.step,
    text: "`client.ts` still called `hello` without a name, and the new `hello` needs one. I've passed yours there too, so it runs as it is.",
  })
  return { ...next, queue: [...next.queue, { kind: "file", step: s.step, file: CLIENT, code: after, from: "name" }] }
}

/** The context the canned answers read */
function context(s: State, phone = false): Context {
  const ask = liveAsk(s)
  const step = STEPS[s.step]
  return { step: s.step, hint: ask?.beat.hint ?? null, writes: !!ask?.beat.writes, failed: !!liveFail(s), deployed: s.deployedLib !== null, chips: [...step.chips, ...(step.errorChips ?? [])], phone }
}

/** While a step's question waits, its act isn't up yet: a word or a key that would run it gets this */
const PICK_FIRST = "Pick an answer above first, or press Skip. Then the button's yours."

/** Whether a question still waits on the learner, so the step's act can't run yet. A nudge to
 * redeploy isn't the step's act, so it runs whatever is open */
export function askBlocks(s: State) {
  if (!liveAsk(s)) return false
  const act = liveAct(s)
  return !act || !act.turn.nudge
}

/** After the learner changed lib.rs once it's on devnet: a nudge with Build and deploy, unless the
 * script is about to ask for one anyway (spec 10.4). One at a time */
function nudge(s: State): State {
  if (!deployChanged(s)) return s
  const live = liveAct(s)
  if (live && (live.turn.act === "deploy" || live.turn.act === "buildDeploy")) return s
  if (s.queue.some((p) => p.kind === "turn" && p.turn.kind === "act" && (p.turn.act === "deploy" || p.turn.act === "buildDeploy"))) return s
  const step = STEPS[s.step]
  const ahead = (s.cursor[s.step].fail ? step.onFail ?? [] : step.beats).slice(s.cursor[s.step].at)
  if (!s.passed[s.step] && ahead.some((b) => b.kind === "act" && (b.act === "deploy" || b.act === "buildDeploy"))) return s
  let next = post(s, { kind: "say", step: s.step, text: "You changed lib.rs after deploying. Devnet still runs the old version.", nudge: true })
  next = post(next, { kind: "act", step: s.step, beat: (firstAct("buildDeploy") ?? firstAct("deploy"))!.id, act: "buildDeploy", state: "live", nudge: true })
  return next
}

/** The new log line for "change what hello says": the learner's words, with the name after step 4 */
function storyLine(s: State, text: string) {
  const lib = s.files[LIB]
  const line = msgLine(lib)
  const old = lib.split("\n")[line - 1] ?? ""
  const indent = old.match(/^\s*/)?.[0] ?? "        "
  const words = text.trim().replace(/"/g, "'").replace(/[.!]+$/, "")
  const named = /name\s*:\s*String/.test(lib)
  const after = named ? `${indent}msg!("${words}, {}!", name);` : `${indent}msg!("${words}");`
  const rows = lib.split("\n")
  rows[line - 1] = after
  return { line, after: rows.join("\n") }
}

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case "open":
      // Coming back to a tutorial in progress shows it scrolled to the live card; leaving keeps it all
      return { ...s, screen: a.screen }
    case "start": {
      if (s.started) return { ...s, screen: "step" }
      let next: State = { ...s, screen: "step", started: true, startedAt: s.startedAt ?? Date.now(), open: LIB }
      next = { ...next, thread: next.thread.map((t) => (t.kind === "intro" ? { ...t, done: true } : t)) }
      next = post(next, { kind: "anchor", step: 0 })
      return flow(next)
    }
    case "restart":
      return { ...initial(), screen: "step" }
    case "tick":
      return tick(s)
    case "answer": {
      const t = s.thread.find((x) => x.id === a.turn)
      if (!t || t.kind !== "ask" || t.done !== null) return s
      const ask = BEATS[t.beat] as Ask
      if (a.choice !== ask.answer) return t.picks.includes(a.choice) ? s : patch(s, t.id, { picks: [...t.picks, a.choice] } as Partial<Turn>)
      let next = patch(s, t.id, { done: "right" } as Partial<Turn>)
      next = post(next, { kind: "you", step: t.step, text: ask.options[a.choice], code: ask.code })
      next = post(next, { kind: "say", step: t.step, beat: ask.id, text: ask.right })
      if (ask.writes) next = { ...next, queue: [...next.queue, { kind: "write", step: t.step, file: ask.writes.file, block: ask.writes.block, from: ask.id, ref: ask.writes.ref, start: ask.writes.start }] }
      return t.step === next.step ? flow(next) : next
    }
    case "skip": {
      const t = s.thread.find((x) => x.id === a.turn)
      if (!t || t.kind !== "ask" || t.done !== null) return s
      const ask = BEATS[t.beat] as Ask
      let next = patch(s, t.id, { done: "skipped" } as Partial<Turn>)
      next = post(next, { kind: "say", step: t.step, text: ask.skipped ?? "No problem. Here's the line, and I'll walk you through the rest." })
      if (ask.writes) next = { ...next, queue: [...next.queue, { kind: "write", step: t.step, file: ask.writes.file, block: ask.writes.block, from: ask.id, ref: ask.writes.ref, start: ask.writes.start }] }
      return t.step === next.step ? flow(next) : next
    }
    case "hint": {
      // The question's hint, one tap from the card: your "I'm stuck" and the assistant's nudge, once
      const t = s.thread.find((x) => x.id === a.turn)
      if (!t || t.kind !== "ask" || t.done !== null || t.hinted) return s
      const next = post(patch(s, t.id, { hinted: true } as Partial<Turn>), { kind: "you", step: t.step, text: STUCK })
      const ask = BEATS[t.beat] as Ask
      return post(next, { kind: "say", step: t.step, text: stuckAnswer({ ...context(s), hint: ask.hint, writes: !!ask.writes }).text })
    }
    case "typeIt": {
      // Type it myself: the editor takes the caret where the answer lands. On the ghost line that is
      // past the end of the file, so the file grows the empty lines down to it: the editor can only put
      // a caret on a line that exists, and typing at the end of the last one stuck to its code
      const t = s.thread.find((x) => x.id === a.turn)
      if (!t || t.kind !== "ask") return s
      const ask = BEATS[t.beat] as Ask
      if (!ask.writes) return s
      const file = ask.writes.file
      const step = STEPS[t.step]
      const code = s.files[file] ?? ""
      const dry = insertBlock(code, ask.writes.block, ask.writes.ref ?? step.target, ask.writes.start ?? step.start)
      const placed = dry.code.split("\n")
      const line = dry.lines.find((n) => (placed[n - 1] ?? "").trim() !== "") ?? dry.lines[0] ?? 1
      const rows = code.split("\n")
      if (line > rows.length || (rows[line - 1] ?? "").trim() === "") {
        while (rows.length < line) rows.push("")
        rows[line - 1] = placed[line - 1]?.match(/^\s*/)?.[0] ?? ""
      }
      const files = { ...s.files, [file]: rows.join("\n") }
      return { ...s, files, open: file, tabs: s.tabs.includes(file) ? s.tabs : [...s.tabs, file], reveal: { file, lines: [line], at: Date.now(), caret: true } }
    }
    case "act":
      return startAct(s, a.act)
    case "checkFix": {
      // The open "Fix it" question's Build: the learner's own edit, built as it stands, with no act card.
      // A failure opens on the compiler's words; a pass resolves the question as typed and the step
      const ask = liveAsk(s)
      if (s.phase !== "idle" || !ask || ask.beat.kicker !== "Fix it") return s
      return { ...s, phase: "building", run: { act: "build", stages: [`Compiling ${LESSON.program}`], stage: 0, turn: null, at: Date.now() }, wrote: null, log: [], error: null }
    }
    case "stage":
      return stage(s)
    case "test": {
      if (s.phase !== "idle" || s.deployedLib === null) return s
      const ix = a.ix ?? idlOf(s.deployedLib).instructions[0].name
      const named = deployedArgs(s.deployedLib).length > 0
      if (!LESSON.game && named && !s.testName.trim()) return s
      // The player is made once: the panel says so instead of sending a call that would fail
      if (ix === "init_player" && s.player) return s
      return { ...s, phase: "testing", run: { act: "test", stages: [`Sending ${ix} to devnet`], stage: 0, turn: null, at: Date.now(), ix, args: a.args }, log: [] }
    }
    case "explain": {
      const f = liveFail(s)
      if (!f) return s
      let next = patch(s, f.id, { open: false } as Partial<Turn>)
      next = post(next, { kind: "you", step: s.step, text: "Explain the error" })
      if (f.planned) return flow({ ...next, cursor: setAt(next.cursor, 0, { at: 0, fail: true }) })
      next = post(next, { kind: "say", step: s.step, text: f.fail?.explain ?? STEPS[s.step].explainStep, quote: f.fail ? { file: f.act === "run" ? CLIENT : LIB, line: f.fail.line, tone: "error" } : undefined })
      next = post(next, { kind: "say", step: s.step, text: "Fix it in the editor and build again, or I can show you the lines this step needs.", follow: "showFix" })
      return repost(next, f)
    }
    case "fixMyself": {
      const f = liveFail(s)
      if (!f) return s
      let next = patch(s, f.id, { open: false } as Partial<Turn>)
      const file = f.act === "run" ? CLIENT : LIB
      const end = (s.files[file] ?? "").split("\n").length
      next = { ...next, open: file, reveal: { file, lines: [f.planned ? end + 2 : f.fail?.line ?? end], at: Date.now(), caret: true } }
      if (f.planned) {
        // The fix question still follows, carrying the explanation's first sentence as its say
        next = post(next, { kind: "say", step: 0, text: STEPS[0].plannedShort ?? STEPS[0].explainStep })
        return flow({ ...next, cursor: setAt(next.cursor, 0, { at: 1, fail: true }) })
      }
      return repost(next, f)
    }
    case "showFix":
    case "follow": {
      const t = s.thread.find((x) => x.id === a.turn)
      if (!t || t.kind !== "say" || t.followDone) return s
      if (t.follow !== "showFix") return s
      // The step's target lines, proposed as a change to review: what the learner wrote is kept where it
      // fits, and nothing lands in the file until Apply
      const file = s.error?.file === CLIENT || (STEPS[s.step].file === CLIENT && !s.passed[s.step]) ? CLIENT : LIB
      const target = file === CLIENT ? clientOf(s.step) : s.step === 0 ? STEPS[0].target : libTarget(s)
      const before = s.files[file] ?? ""
      const fixed = fixOf(before, file === LIB && s.deployedLib !== null ? withId(target, PROGRAM_ID) : target)
      const next = patch(s, t.id, { followDone: true } as Partial<Turn>)
      if (fixed === before) return post(next, { kind: "say", step: s.step, text: `${file === CLIENT ? "client.ts" : "lib.rs"} already has the lines this step needs. Run it again.` })
      const line = before.split("\n").findIndex((l, i) => l !== fixed.split("\n")[i]) + 1 || 1
      return post(next, { kind: "apply", step: s.step, file, before, after: fixed, line, done: null, fix: true, source: t.id })
    }
    case "ask": {
      const text = a.text.trim()
      if (!text) return s
      const you: Body = { kind: "you", step: s.started ? s.step : -1, text }
      const step = s.started ? s.step : 0
      const word = actionWord(text)
      if (word && s.started) {
        // A word that runs something is echoed at once, so its pill sits above what it runs
        const said = now(s, you)
        const live = liveAct(s)
        if (word === "next" && liveWin(s)) return reducer(said, { type: "next" })
        if (word === "explain" && liveFail(s)) return reducer(s, { type: "explain" })
        // With the Call panel open, "call" or the older "send" calls from it
        if ((word === "send" || word === "call") && s.open === "test") return reducer(said, { type: "test" })
        // A question comes before its act's button: a word typed while it waits is pointed back to it
        if (askBlocks(s)) return post(said, { kind: "say", step: s.step, text: PICK_FIRST })
        if (live && live.turn.state !== "running" && wordFits(word, live.turn.act)) return startAct(said, live.turn.act)
      }
      let next = post(s, you)
      if (!s.started && /^(start|begin|go)\b/i.test(text)) return reducer(next, { type: "start" })
      if (s.awaiting === "story" && LESSON.story) {
        const { line, after } = storyLine(s, text)
        next = post({ ...next, awaiting: null }, { kind: "say", step, text: `Here's line ${line} with your text.` })
        return post(next, { kind: "apply", step, file: LIB, before: s.files[LIB], after, line, done: null })
      }
      if (LESSON.story && (text === CHANGE_CHIP || CHANGE_TEXT.test(text))) {
        if (!s.files[LIB].includes("msg!")) return post(next, { kind: "say", step, text: "There's no `msg!` line in lib.rs yet. Once `hello` is written, I can change what it says." })
        return post({ ...next, awaiting: "story" }, { kind: "say", step, text: "Sure. What should `hello` say?" })
      }
      const answer = answerFor(context({ ...s, step }, a.phone), text)
      return post(next, { kind: "say", step, text: answer.text, follow: answer.follow })
    }
    case "apply": {
      const t = s.thread.find((x) => x.id === a.turn)
      if (!t || t.kind !== "apply" || t.done !== null) return s
      let next = patch(s, t.id, { done: "applied" } as Partial<Turn>)
      if (t.fix) {
        // Typed into since the proposal: the fix goes in around what's there now, not over it
        const after = s.files[t.file] === t.before ? t.after : fixOf(s.files[t.file] ?? "", t.after)
        const w = write(next, t.file, after, "fix")
        next = now({ ...w.s, error: null }, { kind: "wrote", step: next.step, file: t.file, lines: w.lines, added: w.lines.length, preview: w.preview, from: "fix" })
        // A question whose code the fix just wrote has nothing left to ask
        const asked = (x: Turn) => x.kind === "ask" && x.done === null && !!(BEATS[x.beat] as Ask).writes && holds(after, (BEATS[x.beat] as Ask).writes!.block)
        next = { ...next, thread: next.thread.map((x) => (asked(x) ? ({ ...x, done: "skipped" } as Turn) : x)) }
        // The act waiting above the proposal comes down under the fix, so the next press is where you are
        const act = liveAct(next)?.turn
        if (!act || act.state !== "live" || act.id > t.id) return next
        next = { ...next, thread: next.thread.filter((x) => x.id !== act.id) }
        return now(next, { kind: "act", step: act.step, beat: act.beat, act: act.act, state: "live", nudge: act.nudge })
      }
      const w = write(next, t.file, t.after, "apply")
      next = now(w.s, { kind: "wrote", step: next.step, file: t.file, lines: w.lines, added: w.lines.length, preview: w.preview, from: "apply" })
      if (next.deployedLib !== null) return nudge(next)
      if (next.passed[0]) return post(post(next, { kind: "say", step: next.step, text: "That's in lib.rs. Build it to check it still compiles.", nudge: true }), { kind: "act", step: next.step, beat: firstAct("build")!.id, act: "build", state: "live", nudge: true })
      return next
    }
    case "keep": {
      const t = s.thread.find((x) => x.id === a.turn)
      if (!t || t.kind !== "apply" || t.done !== null) return s
      let next = patch(s, t.id, { done: "kept" } as Partial<Turn>)
      // A fix turned down can be asked for again: its button comes back
      if (t.fix && t.source !== undefined) {
        next = patch(next, t.source, { followDone: false } as Partial<Turn>)
        return post(next, { kind: "say", step: s.step, text: "Kept as it is. Fix it in the editor, or press Show me the fix again." })
      }
      return post(next, { kind: "say", step: s.step, text: "Kept as it is. Ask again any time." })
    }
    case "edit": {
      let next: State = { ...s, files: { ...s.files, [a.file]: a.code }, fresh: { ...s.fresh, [a.file]: 0 } }
      // Typing clears a failed build's red line: the error was about the code before the change
      if (s.error?.file === a.file && !sameCode(a.code, s.files[a.file])) next = { ...next, error: null }
      if (s.wrote?.file === a.file) next = { ...next, wrote: null }
      // A question whose block is now in the file resolves as typed by you. So does one whose key line
      // the learner typed, the line a pick would have answered with: the assistant fills in the rest
      // of the block around it, as it would on a pick, and the step goes on the same way. Wrong code
      // has no key line, so it resolves nothing
      const ask = liveAsk(next)
      if (ask && ask.beat.writes && ask.beat.writes.file === a.file) {
        const key = keyOf(ask.beat)
        const whole = holds(a.code, ask.beat.writes.block)
        const typed = !whole && key !== null && typedKey(a.code, key) !== null && typedKey(straightQuotes(s.files[a.file] ?? ""), key) === null
        if (whole || typed) {
          next = patch(next, ask.turn.id, { done: "typed" } as Partial<Turn>)
          next = post(next, { kind: "say", step: ask.turn.step, text: whole ? "You beat me to it. That's exactly it." : (ask.beat.typed ?? ask.beat.right) })
          if (typed) next = { ...next, queue: [...next.queue, { kind: "fill", step: ask.turn.step, beat: ask.beat.id }] }
          if (ask.turn.step === next.step) next = flow(next)
        }
      }
      return a.file === LIB ? nudge(next) : next
    }
    case "openFile": {
      if (a.file !== "test" && !(a.file in s.files)) return s
      const tabs = s.tabs.includes(a.file) ? s.tabs : [...s.tabs, a.file]
      // Opening a file from another tab counts as having seen what was written there
      const fresh = s.open !== a.file ? { ...s.fresh, [a.file]: 0 } : s.fresh
      const recent = a.file === "test" ? s.recent : [a.file, ...s.recent.filter((f) => f !== a.file)].slice(0, 5)
      return { ...s, tabs, recent, open: a.file, fresh, idlNew: s.open === "test" && a.file !== "test" ? false : s.idlNew, testDot: a.file === "test" ? false : s.testDot }
    }
    case "openTest":
      if (!s.tabs.includes("test")) return s
      return { ...s, open: "test", testDot: false }
    case "reveal":
      return { ...s, open: a.file, reveal: { file: a.file, lines: a.lines, at: Date.now(), caret: a.caret }, fresh: { ...s.fresh, [a.file]: 0 } }
    case "tree":
      return { ...s, tree: a.state }
    case "terminal":
      return { ...s, terminal: a.open }
    case "testName":
      return { ...s, testName: a.text }
    case "draft":
      return { ...s, draft: a.text }
    case "next": {
      const win = liveWin(s)
      if (!win) return s
      let next = patch(s, win.id, { done: true } as Partial<Turn>)
      // An open question passed by through the Call panel stays a record of how it went
      next = { ...next, thread: next.thread.map((t) => (t.kind === "ask" && t.step === win.step && t.done === null ? { ...t, done: "test" } : t)) }
      if (win.step >= STEPS.length - 1) return next
      next = { ...next, step: win.step + 1, error: null, wrote: null }
      next = post(next, { kind: "anchor", step: win.step + 1 })
      return flow(next)
    }
    case "goto": {
      // The step bar's jump: the step's main file, from its top. The feed's scroll is the view's
      const file = STEPS[a.step].file
      if (!s.tabs.includes(file)) return s
      return { ...s, open: file, reveal: { file, lines: [1], at: Date.now(), top: true }, fresh: { ...s.fresh, [file]: 0 } }
    }
    case "resetFile": {
      const step = STEPS[s.step]
      const start = step.file === LIB && s.deployedLib !== null ? withId(step.start, PROGRAM_ID) : step.start
      return { ...s, files: { ...s.files, [step.file]: start }, error: null, wrote: null }
    }
  }
}

/** A generic failure's act comes back live under the explanation, so the next build is one press away */
function repost(s: State, f: Extract<Turn, { kind: "result" }>): State {
  const prev = [...s.thread].reverse().find((t) => t.kind === "act" && t.step === f.step)
  if (!prev || prev.kind !== "act") return s
  // Never a second live card for the same act
  if (actUp(s, prev.act)) return s
  return post(s, { kind: "act", step: f.step, beat: prev.beat, act: prev.act, state: "live", nudge: prev.nudge })
}

/** Saved progress, as the reload finds it: queued turns posted, runs cut short (spec 10.6). `screen`
 * is where a lesson just switched to opens, whatever it was left on */
function load(screen?: Screen): State {
  const s = loadSaved()
  return screen ? { ...s, screen } : s
}

/** A save this version can open: the state's shape, and every beat its turns name still in the script */
function current(saved: Partial<State> | null, beats: Set<string>) {
  const known = (t: object): boolean =>
    (!("turn" in t) || typeof t.turn !== "object" || t.turn === null || known(t.turn)) && (!("beat" in t) || typeof t.beat !== "string" || beats.has(t.beat))
  return saved?.v === 2 && [...(saved.thread ?? []), ...(saved.queue ?? [])].every(known)
}

function loadSaved(): State {
  try {
    const raw = localStorage.getItem(key())
    if (raw) {
      const saved = JSON.parse(raw) as Partial<State>
      // A state of another shape would crash the feed, and so would one whose turns name beats the
      // lesson's script no longer has (it was rewritten since), or one with another number of steps:
      // the tutorial starts again at the intro
      if (current(saved, beatIdsOf(LESSON.card.slug)) && saved.cursor?.length === STEPS.length) {
        const s = flush({ ...initial(), ...saved } as State)
        // A save from when the project had a test file may still have it open: those go back to lib.rs
        const tabs = s.tabs.filter((t) => t === "test" || t in INITIAL_FILES)
        return {
          ...s,
          // Files the lesson has that the save doesn't (the review's extra files) start as the lesson has
          // them; files the lesson no longer has (Zero Copy's client.ts) are gone
          files: { ...INITIAL_FILES, ...Object.fromEntries(Object.entries(s.files).filter(([f]) => f in INITIAL_FILES)) },
          tabs,
          open: tabs.includes(s.open) ? s.open : LIB,
          phase: "idle",
          run: null,
          thread: s.thread.map((t) => (t.kind === "act" && t.state === "running" ? { ...t, state: "interrupted" } : t)),
        }
      }
    }
  } catch (e) {
    // Storage blocked or broken: start fresh, and say why, so a save the code can't replay doesn't
    // vanish without a trace
    console.warn("Saved progress couldn't be restored; the tutorial starts over", e)
  }
  return initial()
}

export function resetStorage() {
  try {
    localStorage.removeItem(key())
  } catch {
    // Nothing stored, nothing to clear
  }
}

const Ctx = createContext<{ s: State; dispatch: Dispatch<Action> } | null>(null)

/** How far a lesson got, from its saved state: for the gallery's cards and banner, which show every
 * lesson while only the open one has a store */
export type Progress = { started: boolean; finished: boolean; passed: boolean[] }

export function savedProgress(slug: string, steps: number): Progress {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey(slug)) ?? "null") as Partial<State> | null
    if (saved && current(saved, beatIdsOf(slug))) return { started: saved.startedAt != null, finished: saved.finishedAt != null, passed: saved.passed ?? [] }
  } catch {
    // Storage blocked or broken: nothing started
  }
  return { started: false, finished: false, passed: Array.from({ length: steps }, () => false) }
}

export const progressOf = (s: State): Progress => ({ started: s.startedAt !== null, finished: s.finishedAt !== null, passed: s.passed })

export function Store({ children, screen }: { children: ReactNode; screen?: Screen }) {
  const [s, dispatch] = useReducer(reducer, screen, load)
  useEffect(() => {
    try {
      localStorage.setItem(key(), JSON.stringify(s))
    } catch {
      // Private mode: progress lives only in memory
    }
  }, [s])
  return (
    <Ctx.Provider value={{ s, dispatch }}>
      <Runner s={s} dispatch={dispatch} />
      {children}
    </Ctx.Provider>
  )
}

export function useStore() {
  const v = useContext(Ctx)
  if (!v) throw new Error("useStore must be used inside <Store>")
  return v
}
