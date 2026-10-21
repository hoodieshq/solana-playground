import { createContext, useContext, useEffect, useReducer, type Dispatch, type ReactNode } from "react"

import { checkOwn, sameCode } from "./check"
import { INITIAL_FILES, STEPS, callLog, clientLog, type BuildResult, type Fail, type Pass, type Patch, type Step } from "./data"
import { diffLines } from "./diff"
import { clientTx, namedTx } from "./tx"
import { KEEP } from "./view"

export type Screen = "gallery" | "overview" | "step" | "finish"
/** `call` is a step with a call (step 4) built and waiting for it, `calling` the call on its way */
export type Phase = "idle" | "patch" | "building" | "deploying" | "call" | "calling" | "passed" | "failed" | "explain"

export type State = {
  screen: Screen
  step: number
  files: Record<string, string>
  passed: boolean[]
  firstTry: boolean[]
  /** A passed step whose code has changed since: it waits for a build again and its old result
   * isn't shown for code nobody built. The check mark in the progress stays until that build */
  changedSincePass: boolean[]
  /** A build of the step has failed at least once, the planned one on step 1 too: the questions
   * about the error stay offered. `firstTry` leaves the planned failure out */
  failedOnce: boolean[]
  phase: Phase
  /** Whether the sheet for the current phase is up */
  sheet: boolean
  /** Which patch was applied last on this step, or "own" for code written by hand */
  applied: "patch" | "fix" | "own" | null
  /** Which proposal the step shows inline while phase is "patch" */
  review: "patch" | "fix"
  /** Files as they were when the current step started, for Undo */
  undo: { step: number; files: Record<string, string> } | null
  log: string[]
  /** `explain` is set when the build checked hand-written code: what the assistant says about it.
   * `column` and `span` mark the token the compiler points at */
  error: { line: number; column?: number; span?: number; reason: string; explain?: string } | null
  explain: "step" | "error"
  /** The assistant has explained the current failure, so the next thing offered is its fix. Kept
   * here so switching views doesn't ask for the explanation again */
  explained: boolean
  deployStage: number
  /** The quick check's answer on each step that asks one. Kept here so switching views doesn't ask again */
  predicted: Record<number, number | "skip">
  startedAt: number | null
  finishedAt: number | null
  /** The current step's code built, on a step that still needs its call: what it waits for is the call */
  built: boolean
  /** What the name field holds, kept here so switching views keeps it */
  draft: string
  /** The name hello was last called with, for its log line and the finish. Kept on this device only */
  name: string | null
  /** When the last transaction came back, so its receipt prints once, as it arrives */
  txAt: number | null
}

export type Action =
  | { type: "open"; screen: Screen }
  | { type: "start" }
  | { type: "restart" }
  | { type: "goto"; step: number }
  | { type: "openStep"; step: number }
  | { type: "askPatch" }
  | { type: "predict"; choice: number | "skip" }
  | { type: "reviewFix" }
  | { type: "explain"; mode: "step" | "error" }
  /** The failure was explained somewhere other than the sheet, as the desktop does in its column */
  | { type: "explained" }
  | { type: "close" }
  | { type: "apply" }
  | { type: "edit"; code: string }
  | { type: "buildOwn" }
  | { type: "built" }
  | { type: "retry" }
  | { type: "deploy" }
  | { type: "deployStage" }
  | { type: "undo" }
  | { type: "next" }
  | { type: "draft"; text: string }
  | { type: "call" }
  | { type: "called" }

const KEY = "pg-proto-tutorial-v1"

export const initial = (): State => ({
  screen: "gallery",
  step: 0,
  files: { ...INITIAL_FILES },
  passed: STEPS.map(() => false),
  firstTry: STEPS.map(() => true),
  changedSincePass: STEPS.map(() => false),
  failedOnce: STEPS.map(() => false),
  phase: "idle",
  sheet: false,
  applied: null,
  review: "patch",
  undo: null,
  log: [],
  error: null,
  explain: "step",
  explained: false,
  deployStage: 0,
  predicted: {},
  startedAt: null,
  finishedAt: null,
  built: false,
  draft: "",
  name: null,
  txAt: null,
})

const setAt = (xs: boolean[], i: number, v: boolean) => xs.map((x, k) => (k === i ? v : x))

/** Whether step `i` stands passed: it passed, and its code hasn't changed since */
const stands = (s: State, i: number) => s.passed[i] && !s.changedSincePass[i]

/** The phase a step rests in once nothing is running and no sheet is up */
const resting = (s: State): Phase =>
  s.error ? "failed" : stands(s, s.step) ? "passed" : STEPS[s.step].call && s.built ? "call" : "idle"

/** The code a step checks hand-written work against: what its fix leaves, or its patch when it has no fix */
export const targetFor = (step: Step) => step.fix?.after ?? step.patch?.after ?? null

/** A step's passing build, for code that reached the target by hand */
const passFor = (step: Step): Pass | null => [step.fix?.result, step.patch?.result].find((r): r is Pass => !!r && r.ok) ?? null

/** The assistant's patch for the step. It starts from the code as it is now, so anything typed by
 * hand shows in the diff as what the patch replaces, instead of being overwritten unseen */
export function patchFor(s: State): Patch | null {
  const step = STEPS[s.step]
  if (!step.patch) return null
  const now = s.files[step.file]
  return now === step.patch.before ? step.patch : { ...step.patch, before: now }
}

/** What Review the fix shows. After the assistant's patch it's the step's own fix. After code
 * written by hand it's the way from that code to the target, with the step's notes */
export function fixFor(s: State): Patch | null {
  const step = STEPS[s.step]
  if (s.applied !== "own") return step.fix ?? null
  const after = targetFor(step)
  const result = passFor(step)
  if (!after || !result) return null
  return {
    file: step.file,
    before: s.files[step.file],
    after,
    summary: "Here is what this step needs, next to what you wrote.",
    // The fix's own notes first: the first note is the one that opens by itself
    notes: [...(step.fix?.notes ?? []), ...(step.patch?.notes ?? [])],
    result,
  }
}

export function lastResult(s: State): BuildResult | null {
  const step = STEPS[s.step]
  if (step.deploy) return step.deploy.result
  if (s.applied === "own") {
    const target = targetFor(step)
    if (!target) return null
    const c = checkOwn(s.files[step.file], target, step.file)
    return c.ok ? passFor(step) : c
  }
  // A passed step reopened from elsewhere has no patch applied, but it did pass
  if (s.applied === null && stands(s, s.step)) return passFor(step)
  const p = s.applied === "fix" ? step.fix : step.patch
  return p?.result ?? null
}

/** Lines of the step's file the last patch added. They stay tinted while the build checks them
 * and until the next action, so you can see what is being checked */
export function freshLines(s: State): number[] {
  const step = STEPS[s.step]
  const p = s.applied === "fix" ? step.fix : s.applied === "patch" ? step.patch : undefined
  if (!p || !(s.phase === "building" || s.phase === "call" || s.phase === "calling" || s.phase === "passed" || s.phase === "failed")) return []
  // The step's patch went onto whatever the file held when it was applied, which Undo keeps
  const before = s.applied === "patch" && s.undo?.step === s.step ? s.undo.files[step.file] : p.before
  let n = 0
  const lines: number[] = []
  for (const row of diffLines(before, p.after)) {
    if (row.kind === "removed") continue
    n++
    if (row.kind === "added") lines.push(n)
  }
  return lines
}

function reducer(s: State, a: Action): State {
  const step = STEPS[s.step]
  switch (a.type) {
    case "open":
      return { ...s, screen: a.screen, sheet: false, phase: resting(s) }
    case "start": {
      const first = s.passed.findIndex((p) => !p)
      const at = first === -1 ? 0 : first
      const same = at === s.step
      return {
        ...s,
        screen: "step",
        step: at,
        phase: same ? resting(s) : stands(s, at) ? "passed" : "idle",
        error: same ? s.error : null,
        // Another step's patch, log and Undo would speak for this one: its status read the last
        // step's patch as its own result
        ...(same ? {} : { applied: null, undo: null, log: [], explained: false, built: false }),
        sheet: false,
        startedAt: s.startedAt ?? Date.now(),
      }
    }
    case "restart":
      return { ...initial(), screen: "step", startedAt: Date.now() }
    case "goto":
      return { ...s, step: a.step, phase: stands(s, a.step) ? "passed" : "idle", sheet: false, error: null, undo: null, log: [], applied: null, explained: false, built: false }
    case "openStep":
      // From the overview: straight into a step already reached
      return {
        ...s,
        screen: "step",
        step: a.step,
        phase: stands(s, a.step) ? "passed" : "idle",
        sheet: false,
        error: null,
        undo: null,
        log: [],
        applied: null,
        explained: false,
        built: false,
        startedAt: s.startedAt ?? Date.now(),
      }
    // A proposal shows inline, in the code it changes: no sheet
    case "askPatch":
      return { ...s, phase: "patch", review: "patch", sheet: false }
    case "predict":
      return { ...s, predicted: { ...s.predicted, [s.step]: a.choice } }
    case "reviewFix":
      return fixFor(s) ? { ...s, phase: "patch", review: "fix", sheet: false } : s
    case "explain":
      // The phone's sheet explains the error as it opens
      return { ...s, phase: "explain", explain: a.mode, sheet: true, explained: s.explained || (a.mode === "error" && !!s.error) }
    case "explained":
      return s.error ? { ...s, explained: true } : s
    case "close":
      if (s.phase === "patch" || s.phase === "explain") return { ...s, phase: resting(s), sheet: false }
      return { ...s, sheet: false }
    case "apply": {
      const p = s.review === "fix" ? fixFor(s) : patchFor(s)
      if (!p) return s
      return {
        ...s,
        undo: s.undo && s.undo.step === s.step ? s.undo : { step: s.step, files: s.files },
        files: { ...s.files, [p.file]: p.after },
        // A fix for hand-written code lands on the target, and the build checks it as hand-written
        applied: s.review === "fix" && s.applied === "own" ? "own" : s.review,
        phase: "building",
        sheet: false,
        error: null,
        explained: false,
        log: [],
        built: false,
      }
    }
    case "edit": {
      // Typing clears a failed build's red line: the error was about the code before the change.
      // A passed step goes back to waiting for a build, and Next comes back with the next pass
      const files = { ...s.files, [step.file]: a.code }
      // Only whitespace changed: nothing a build checks did, so a pass stands. Enter typed in the
      // editor after a pass keeps Next where it was, and a build waiting for its call keeps waiting
      const same = sameCode(a.code, s.files[step.file])
      if ((s.phase === "passed" || s.phase === "call") && same) return { ...s, files }
      // Anything else on a passed step means the pass was for other code
      const changedSincePass = s.passed[s.step] && !same ? setAt(s.changedSincePass, s.step, true) : s.changedSincePass
      return { ...s, files, changedSincePass, error: null, explained: false, sheet: false, phase: "idle", built: false }
    }
    case "buildOwn":
      return { ...s, applied: "own", phase: "building", sheet: false, error: null, explained: false, log: [], built: false }
    case "built": {
      const r = lastResult(s)
      if (!r) return s
      // Built, but this step is done only when its instruction is called: the build waits for the call
      if (r.ok && step.call) return { ...s, phase: "call", sheet: false, log: r.log, error: null, built: true }
      if (r.ok) {
        // The client's run is a transaction: its log carries what the program said
        const client = step.id === "call-client"
        return {
          ...s,
          phase: "passed",
          sheet: false,
          log: client ? clientLog(clientTx(s)) : r.log,
          error: null,
          passed: setAt(s.passed, s.step, true),
          changedSincePass: setAt(s.changedSincePass, s.step, false),
          txAt: client ? Date.now() : s.txAt,
        }
      }
      // Step 1's patch fails by design, to show how Anchor reports a missing piece: that isn't a
      // miss on the learner's first try
      const planned = s.applied === "patch" && step.patch?.result.ok === false
      return {
        ...s,
        phase: "failed",
        sheet: false,
        log: r.log,
        error: { line: r.line, column: r.column, span: r.span, reason: r.reason, explain: (r as Fail & { explain?: string }).explain },
        explained: false,
        firstTry: planned ? s.firstTry : setAt(s.firstTry, s.step, false),
        failedOnce: setAt(s.failedOnce, s.step, true),
      }
    }
    case "retry":
      return { ...s, phase: "building", sheet: false, error: null, explained: false, log: [], built: false }
    case "deploy":
      return { ...s, phase: "deploying", deployStage: 0, sheet: false, explained: false, log: [] }
    case "deployStage": {
      const d = step.deploy
      if (!d) return s
      if (s.deployStage + 1 < d.stages.length) return { ...s, deployStage: s.deployStage + 1 }
      return {
        ...s,
        phase: "passed",
        sheet: false,
        log: d.result.log,
        passed: setAt(s.passed, s.step, true),
        changedSincePass: setAt(s.changedSincePass, s.step, false),
      }
    }
    case "undo":
      if (!s.undo) return s
      return {
        ...s,
        files: s.undo.files,
        undo: null,
        applied: null,
        phase: "idle",
        sheet: false,
        error: null,
        explained: false,
        log: [],
        built: false,
        passed: setAt(s.passed, s.step, false),
        changedSincePass: setAt(s.changedSincePass, s.step, false),
      }
    case "next":
      if (s.step === STEPS.length - 1)
        return { ...s, screen: "finish", phase: "idle", sheet: false, finishedAt: s.finishedAt ?? Date.now() }
      return { ...s, step: s.step + 1, phase: "idle", sheet: false, error: null, undo: null, log: [], applied: null, explained: false, built: false }
    case "draft":
      return { ...s, draft: a.text }
    case "call": {
      // Any text works, but some text: an empty name would log "Hello, !"
      const name = s.draft.trim()
      if (!step.call || s.phase !== "call" || !name) return s
      return { ...s, phase: "calling", name, log: [] }
    }
    case "called": {
      if (!step.call || s.phase !== "calling" || s.name === null) return s
      return {
        ...s,
        phase: "passed",
        log: callLog(namedTx(s, s.name), s.name),
        passed: setAt(s.passed, s.step, true),
        changedSincePass: setAt(s.changedSincePass, s.step, false),
        txAt: Date.now(),
      }
    }
  }
}

function load(): State {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const saved = { ...initial(), ...(JSON.parse(raw) as Partial<State>) }
      // A reload comes back through the gallery, where Continue picks the tutorial up. Switching
      // views keeps the screen, and a patch under review stays up. Timers and sheets don't survive
      const phase = KEEP && saved.phase === "patch" ? "patch" : resting(saved)
      return { ...saved, screen: KEEP ? saved.screen : "gallery", phase, sheet: false }
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
  return <Ctx.Provider value={{ s, dispatch }}>{children}</Ctx.Provider>
}

export function useStore() {
  const v = useContext(Ctx)
  if (!v) throw new Error("useStore must be used inside <Store>")
  return v
}
