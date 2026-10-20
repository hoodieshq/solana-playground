import { createContext, useContext, useEffect, useReducer, type Dispatch, type ReactNode } from "react"

import { INITIAL_FILES, STEPS, type BuildResult } from "./data"

export type Screen = "gallery" | "overview" | "step" | "finish"
export type Phase = "idle" | "patch" | "building" | "deploying" | "passed" | "failed" | "explain"

export type State = {
  screen: Screen
  step: number
  files: Record<string, string>
  passed: boolean[]
  firstTry: boolean[]
  phase: Phase
  /** Whether the sheet for the current phase is up */
  sheet: boolean
  /** Which patch was applied last on this step */
  applied: "patch" | "fix" | null
  /** Files as they were when the current step started, for Undo */
  undo: { step: number; files: Record<string, string> } | null
  log: string[]
  error: { line: number; reason: string } | null
  explain: "step" | "error"
  deployStage: number
  startedAt: number | null
  finishedAt: number | null
}

export type Action =
  | { type: "open"; screen: Screen }
  | { type: "start" }
  | { type: "restart" }
  | { type: "goto"; step: number }
  | { type: "openStep"; step: number }
  | { type: "askPatch" }
  | { type: "explain"; mode: "step" | "error" }
  | { type: "close" }
  | { type: "apply" }
  | { type: "built" }
  | { type: "retry" }
  | { type: "deploy" }
  | { type: "deployStage" }
  | { type: "undo" }
  | { type: "next" }

const KEY = "pg-proto-tutorial-v1"

export const initial = (): State => ({
  screen: "gallery",
  step: 0,
  files: { ...INITIAL_FILES },
  passed: STEPS.map(() => false),
  firstTry: STEPS.map(() => true),
  phase: "idle",
  sheet: false,
  applied: null,
  undo: null,
  log: [],
  error: null,
  explain: "step",
  deployStage: 0,
  startedAt: null,
  finishedAt: null,
})

const setAt = (xs: boolean[], i: number, v: boolean) => xs.map((x, k) => (k === i ? v : x))

/** The phase a step rests in once nothing is running and no sheet is up */
const resting = (s: State): Phase => (s.error ? "failed" : s.passed[s.step] ? "passed" : "idle")

export function lastResult(s: State): BuildResult | null {
  const step = STEPS[s.step]
  if (step.deploy) return step.deploy.result
  const p = s.applied === "fix" ? step.fix : step.patch
  return p?.result ?? null
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
        phase: same ? resting(s) : "idle",
        error: same ? s.error : null,
        sheet: false,
        startedAt: s.startedAt ?? Date.now(),
      }
    }
    case "restart":
      return { ...initial(), screen: "step", startedAt: Date.now() }
    case "goto":
      return { ...s, step: a.step, phase: s.passed[a.step] ? "passed" : "idle", sheet: false, error: null, undo: null, log: [], applied: null }
    case "openStep":
      // From the overview: straight into a step already reached
      return {
        ...s,
        screen: "step",
        step: a.step,
        phase: s.passed[a.step] ? "passed" : "idle",
        sheet: false,
        error: null,
        undo: null,
        log: [],
        applied: null,
        startedAt: s.startedAt ?? Date.now(),
      }
    case "askPatch":
      return { ...s, phase: "patch", sheet: true }
    case "explain":
      return { ...s, phase: "explain", explain: a.mode, sheet: true }
    case "close":
      if (s.phase === "patch" || s.phase === "explain") return { ...s, phase: resting(s), sheet: false }
      return { ...s, sheet: false }
    case "apply": {
      const fromExplain = s.phase === "explain" && s.explain === "error"
      const p = fromExplain ? step.fix : step.patch
      if (!p) return s
      return {
        ...s,
        undo: s.undo && s.undo.step === s.step ? s.undo : { step: s.step, files: s.files },
        files: { ...s.files, [p.file]: p.after },
        applied: fromExplain ? "fix" : "patch",
        phase: "building",
        sheet: false,
        error: null,
        log: [],
      }
    }
    case "built": {
      const r = lastResult(s)
      if (!r) return s
      if (r.ok) return { ...s, phase: "passed", sheet: false, log: r.log, error: null, passed: setAt(s.passed, s.step, true) }
      return {
        ...s,
        phase: "failed",
        sheet: false,
        log: r.log,
        error: { line: r.line, reason: r.reason },
        firstTry: setAt(s.firstTry, s.step, false),
      }
    }
    case "retry":
      return { ...s, phase: "building", sheet: false, error: null, log: [] }
    case "deploy":
      return { ...s, phase: "deploying", deployStage: 0, sheet: false, log: [] }
    case "deployStage": {
      const d = step.deploy
      if (!d) return s
      if (s.deployStage + 1 < d.stages.length) return { ...s, deployStage: s.deployStage + 1 }
      return { ...s, phase: "passed", sheet: false, log: d.result.log, passed: setAt(s.passed, s.step, true) }
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
        log: [],
        passed: setAt(s.passed, s.step, false),
      }
    case "next":
      if (s.step === STEPS.length - 1)
        return { ...s, screen: "finish", phase: "idle", sheet: false, finishedAt: s.finishedAt ?? Date.now() }
      return { ...s, step: s.step + 1, phase: "idle", sheet: false, error: null, undo: null, log: [], applied: null }
  }
}

function load(): State {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const saved = { ...initial(), ...(JSON.parse(raw) as Partial<State>) }
      // A reload comes back through the gallery, where Continue picks the
      // tutorial up. Timers and sheets don't survive it
      return { ...saved, screen: "gallery", phase: resting(saved), sheet: false }
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
