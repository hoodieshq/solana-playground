import { createContext, useContext, useEffect, useReducer, type Dispatch, type ReactNode } from "react"

import { CHANGE_CHIP, CHANGE_TEXT, STUCK, actionWord, answerFor, stuckAnswer, wordFits, type Context } from "./answers"
import { checkOwn, fixOf, holds, insertBlock, msgLine, sameCode, straightQuotes, typedKey, uncomment, withId, withOwnText, type OwnCheck } from "./check"
import {
  BEATS,
  BUILD_OK,
  CLIENT,
  CLIENT_CALL,
  DEPLOY_LOG,
  INITIAL_FILES,
  LIB,
  LIB_FIXED,
  LIB_NAMED,
  PROGRAM_ID,
  STEPS,
  UPGRADE_LOG,
  callLog,
  clientLog,
  panelLog,
  type Act,
  type ActBeat,
  type Ask,
  type Beat,
  type Follow,
  type Quote,
  type Tx,
} from "./data"
import { diffLines } from "./diff"
import { deployedArgs, signature } from "./idl"
import { Runner } from "./runner"
import { clientTx, namedTx } from "./tx"

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
    | { kind: "act"; beat: string; act: Act; state: "live" | "running" | "done" | "interrupted"; took?: number; nudge?: boolean; name?: string; via?: "test"; failed?: boolean }
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
  | { kind: "write"; step: number; file: string; block: string; from: string }
  | { kind: "create"; step: number; file: string }
  // The rest of a question's block, around the line the learner typed themselves
  | { kind: "fill"; step: number; beat: string }
  // A change to lines already there, worked out when it was queued
  | { kind: "file"; step: number; file: string; code: string; from: string }

/** A run going: which act, its stages and the one running, and the card it belongs to */
export type Run = { act: Act | "test"; stages: string[]; stage: number; turn: number | null; at: number }

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
  | { type: "test" }
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

const KEY = "pg-proto-tutorial-v2"

/** Timings of D29. The prototype has no build server: these are what a run would take */
export const STAGE_MS: Record<string, number> = { Building: 1600, "Compiling hello_anchor": 1600 }
export const stageMs = (stage: string) => STAGE_MS[stage] ?? (stage.startsWith("Sending") ? 1600 : 1100)

// The IDL goes up with the program, as anchor deploy does since 0.30, so Explorer can read the calls.
// An upgrade rewrites the one already there
const deployStages = (s: State) => ["Writing buffer", "Deploying", s.deployedLib === null ? "Uploading IDL" : "Upgrading IDL", "Confirming"]

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

/** The lib.rs a build of the moment is checked against: the named one once step 4's question is
 * behind, the fixed one before */
function libTarget(s: State) {
  if (s.passed[3] || (s.step === 3 && s.cursor[3].at > 2)) return LIB_NAMED
  return LIB_FIXED
}

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
      next = { ...next, queue: [...next.queue, "create" in b.writes ? { kind: "create", step: i, file: b.writes.create } : { kind: "write", step: i, file: b.writes.file, block: b.writes.block, from: b.id }] }
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
  const placed = insertBlock(before, head.block, step.target, step.start)
  // Lines of the learner's own that the step's code doesn't know: then the block went at the end
  const own = before.split("\n").some((l) => uncomment(l).trim() !== "" && !holds(step.target, l) && !holds(step.start, l))
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
  const placed = insertBlock(base, own, step.target, step.start)
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

function stagesFor(s: State, act: Act | "test"): string[] {
  if (act === "build") return ["Compiling hello_anchor"]
  if (act === "buildDeploy") return ["Building", ...deployStages(s)]
  if (act === "deploy") return s.builtLib !== null && sameCode(s.builtLib, s.files[LIB]) ? deployStages(s) : ["Building", ...deployStages(s)]
  return ["Sending hello to devnet"]
}

const PHASE: Record<Act | "test", Phase> = { build: "building", deploy: "deploying", buildDeploy: "deploying", run: "running", call: "calling", test: "testing" }

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
  const stages = stagesFor(next, act)
  next = patch(next, turn.id, { state: "running", name } as Partial<Turn>)
  // The terminal opens by itself the first time a deploy or the client runs (spec 8.5)
  const first = (act === "deploy" || act === "buildDeploy") ? s.deployedLib === null : act === "run" ? !s.thread.some((t) => t.kind === "result" && t.from === "client") : false
  return {
    ...next,
    phase: PHASE[act],
    run: { act, stages, stage: 0, turn: turn.id, at: Date.now() },
    name: act === "call" ? name! : next.name,
    // What was just written stops being lit at the next action
    wrote: null,
    terminal: next.terminal || first,
    log: [],
    error: act === "build" || act === "buildDeploy" || stages[0] === "Building" ? null : next.error,
  }
}

const buildLog = (lib: string) => [...BUILD_OK, `IDL: 1 instruction · hello${signature(deployedArgs(lib)) === "()" ? "" : signature(deployedArgs(lib))}`, "Build successful"]

/** A build checked, as the prototype's compiler: step 1 against its target, later rebuilds against
 * the lib.rs the moment expects */
function checkBuild(s: State): OwnCheck {
  if (s.step === 0 && !s.passed[0]) return checkOwn(s.files[LIB], LIB_FIXED, LIB, "")
  const lib = s.files[LIB]
  if (checkOwn(lib, LIB_NAMED, LIB).ok || checkOwn(lib, LIB_FIXED, LIB).ok) return { ok: true }
  return checkOwn(lib, libTarget(s), LIB, LIB_FIXED)
}

/** A failed build or run: its card opens with Explain, the editor marks the line, the terminal opens */
function fail(s: State, act: Act, c: Extract<OwnCheck, { ok: false }>, file: string, took: number): State {
  const run = s.run
  // Step 1's first build fails by design on the missing struct: that's the planned failure, and it
  // isn't a miss on the learner's first try
  const planned = s.step === 0 && !s.cursor[0].fail && !s.passed[0] && c.reason.includes("`Hello` struct")
  let next: State = run?.turn ? patch(s, run.turn, { state: "done", took, failed: true } as Partial<Turn>) : s
  const code = s.files[file].split("\n")[c.line - 1]?.trim() ?? ""
  next = now(next, { kind: "result", step: s.step, act, ok: false, log: c.log, fail: { line: c.line, column: c.column, span: c.span, reason: c.reason, explain: c.explain, code }, open: true, planned, took, src: s.files[file] })
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

/** After an act lands: the step passes on its goal, a scripted act moves the script on, a nudge just ends */
function afterAct(s: State, act: Act, nudge: boolean): State {
  const i = s.step
  if (nudge) return s
  if (!s.passed[i] && STEPS[i].goal === act) return pass(s, i)
  return flow(s)
}

/** A stage finished: the next one starts, or the run lands */
function stage(s: State): State {
  const run = s.run
  if (!run) return s
  const took = Date.now() - run.at
  const turn = run.turn !== null ? s.thread.find((t) => t.id === run.turn) : undefined
  const nudge = !!(turn && turn.kind === "act" && turn.nudge)
  const done = run.stages[run.stage]
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
    const argsBefore = signature(deployedArgs(s.deployedLib))
    const argsAfter = signature(deployedArgs(lib))
    const changed = first || argsBefore !== argsAfter
    const log = first ? DEPLOY_LOG : UPGRADE_LOG
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
    const c = checkOwn(s.files[CLIENT], CLIENT_CALL, CLIENT, "")
    if (!c.ok) return fail(s, "run", c, CLIENT, took)
    const tx = clientTx(s)
    const log = clientLog(tx)
    let next = idle(closeAct({ ...s, log, txAt: Date.now() }))
    next = now(next, { kind: "result", step: s.step, act: "run", ok: true, log, tx, from: "client", took, src: s.files[CLIENT] })
    return afterAct(next, "run", nudge)
  }

  if (run.act === "call") {
    const name = s.name ?? ""
    const tx = namedTx(s, name)
    const log = callLog(tx, name)
    let next = idle(closeAct({ ...s, log, txAt: Date.now() }))
    next = now(next, { kind: "result", step: s.step, act: "call", ok: true, log, tx, from: "chat", took })
    if (!nudge && !next.passed[next.step] && STEPS[next.step].goal === "call") next = nameClient(next, name)
    return afterAct(next, "call", nudge)
  }

  // A call from the Call panel: its result stays in the panel (the chat skips it), and it passes steps 3 and 4
  const args = deployedArgs(s.deployedLib)
  const named = args.length > 0
  const name = named ? s.testName.trim() : null
  const tx = named ? namedTx(s, name ?? "") : clientTx(s)
  const log = panelLog(tx, name)
  let next: State = idle({ ...s, log, txAt: Date.now(), name: named ? name : s.name })
  next = now(next, { kind: "result", step: s.step, act: "test", ok: true, log, tx, from: "test", took })
  const i = next.step
  const passes = !next.passed[i] && ((i === 2 && next.deployedLib !== null) || (i === 3 && named && !!name))
  if (!passes) return next
  if (i === 3 && name) next = nameClient(next, name)
  // The act the panel's call stood in for is done, without its button ever pressed, and a question still
  // open in the step folds into its record, so nothing above the win can still be picked
  next = {
    ...next,
    thread: next.thread.map((t) =>
      t.kind === "act" && t.step === i && t.state !== "done"
        ? { ...t, state: "done", via: "test" }
        : t.kind === "ask" && t.step === i && t.done === null
          ? { ...t, done: "test" }
          : t
    ),
  }
  return pass(next, i, "test")
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
  next = post(next, { kind: "act", step: s.step, beat: "s4.ship", act: "buildDeploy", state: "live", nudge: true })
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
      if (ask.writes) next = { ...next, queue: [...next.queue, { kind: "write", step: t.step, file: ask.writes.file, block: ask.writes.block, from: ask.id }] }
      return t.step === next.step ? flow(next) : next
    }
    case "skip": {
      const t = s.thread.find((x) => x.id === a.turn)
      if (!t || t.kind !== "ask" || t.done !== null) return s
      const ask = BEATS[t.beat] as Ask
      let next = patch(s, t.id, { done: "skipped" } as Partial<Turn>)
      next = post(next, { kind: "say", step: t.step, text: ask.skipped ?? "No problem. Here's the line, and I'll walk you through the rest." })
      if (ask.writes) next = { ...next, queue: [...next.queue, { kind: "write", step: t.step, file: ask.writes.file, block: ask.writes.block, from: ask.id }] }
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
      const dry = insertBlock(code, ask.writes.block, step.target, step.start)
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
    case "stage":
      return stage(s)
    case "test": {
      if (s.phase !== "idle" || s.deployedLib === null) return s
      const named = deployedArgs(s.deployedLib).length > 0
      if (named && !s.testName.trim()) return s
      return { ...s, phase: "testing", run: { act: "test", stages: ["Sending hello to devnet"], stage: 0, turn: null, at: Date.now() }, log: [] }
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
        next = post(next, { kind: "say", step: 0, text: "Line 9 asks for `Context<Hello>`, and `Hello` doesn't exist yet." })
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
      const file = s.error?.file === CLIENT || (s.step === 2 && !s.passed[2]) ? CLIENT : LIB
      const target = file === CLIENT ? CLIENT_CALL : s.step === 0 ? LIB_FIXED : libTarget(s)
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
      if (s.awaiting === "story") {
        const { line, after } = storyLine(s, text)
        next = post({ ...next, awaiting: null }, { kind: "say", step, text: `Here's line ${line} with your text.` })
        return post(next, { kind: "apply", step, file: LIB, before: s.files[LIB], after, line, done: null })
      }
      if (text === CHANGE_CHIP || CHANGE_TEXT.test(text)) {
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
      if (next.passed[0]) return post(post(next, { kind: "say", step: next.step, text: "That's in lib.rs. Build it to check it still compiles.", nudge: true }), { kind: "act", step: next.step, beat: "s1.build", act: "build", state: "live", nudge: true })
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
      return { ...s, tabs, open: a.file, fresh, idlNew: s.open === "test" && a.file !== "test" ? false : s.idlNew, testDot: a.file === "test" ? false : s.testDot }
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

/** Saved progress, as the reload finds it: queued turns posted, runs cut short (spec 10.6) */
function load(): State {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const saved = JSON.parse(raw) as Partial<State>
      // A state of another shape would crash the feed: the tutorial starts again at the intro
      if (saved.v === 2) {
        const s = flush({ ...initial(), ...saved } as State)
        // A save from when the project had a test file may still have it open: those go back to lib.rs
        const tabs = s.tabs.filter((t) => t === "test" || t in INITIAL_FILES)
        return {
          ...s,
          tabs,
          open: tabs.includes(s.open) ? s.open : LIB,
          phase: "idle",
          run: null,
          thread: s.thread.map((t) => (t.kind === "act" && t.state === "running" ? { ...t, state: "interrupted" } : t)),
        }
      }
    }
  } catch {
    // Storage blocked or broken: start fresh
  }
  return initial()
}

export function resetStorage() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // Nothing stored, nothing to clear
  }
}

const Ctx = createContext<{ s: State; dispatch: Dispatch<Action> } | null>(null)

export function Store({ children }: { children: ReactNode }) {
  const [s, dispatch] = useReducer(reducer, undefined, load)
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(s))
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
