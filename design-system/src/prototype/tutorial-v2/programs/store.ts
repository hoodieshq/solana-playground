import { useSyncExternalStore } from "react"

import { MAIN_FILE, WALLET_KEY, fakeKey, filesOf, programBySlug, type Ix, type ProgramMeta } from "./data"
import { STOP_LABEL, readAnswer, readPath, type Stop } from "./read"
import { STARTERS } from "./starters"

/* The redesigned Programs flow's state: where it is (catalog, a preview, a project), the projects made
   from programs or from New project, and the runs inside them. One module level store, so New project
   can open a project without sharing a React tree. The shape follows ux-architecture.md section 5,
   with the Guide's feed as a list of turns, as a lesson's chat is (CONSENSUS.md, row 2) */

export type Framework = "anchor" | "native" | "seahorse" | "ts-client"
export type Source = "starter" | "example" | "import" | "describe"

/** The live card's action: build mode's steps, or read mode's stops (Call on devnet is "call" in both) */
export type Act = "build" | "deploy" | "call" | "upgrade" | "no-idl" | "run" | Exclude<Stop, "call">

export type Turn =
  | { k: "intro"; id: number }
  | { k: "act"; id: number; act: Act; retry?: boolean }
  | { k: "build-ok"; id: number; took: number; ixs: number }
  | { k: "build-fail"; id: number; kind: "compile" | "noAnswer"; file?: string; line?: number; col?: number; code?: string; message?: string; quote?: string }
  | { k: "deploy-ok"; id: number; programId: string; took: number; cost: number; upgrade: boolean }
  | { k: "deploy-fail"; id: number; kind: "faucet" | "network"; stage: string; cost: number }
  | { k: "call-ok"; id: number; ix: string; args: Record<string, string>; sig: string; cu: number; fee: number; log: string[]; from: "guide" | "panel" }
  | { k: "call-fail"; id: number; ix: string; kind: "program" | "network" | "faucet"; error: string; log: string[] }
  | { k: "run-ok"; id: number; log: string[]; took: number }
  | { k: "user"; id: number; text: string }
  | { k: "assistant"; id: number; text: string; chips?: string[] }
  /** A read mode stop's answer, drawn from the program's data */
  | { k: "stop"; id: number; stop: Exclude<Stop, "call"> }
  | { k: "milestone"; id: number }

/** A turn before the feed gives it an id */
export type NewTurn = Turn extends infer T ? (T extends Turn ? Omit<T, "id"> : never) : never

export type Build = { s: "none" } | { s: "running"; slow: boolean } | { s: "ok"; src: string; at: number } | { s: "failed"; src: string; kind: "compile" | "noAnswer" }
export type Deploy = { s: "none" } | { s: "running"; stages: string[]; stage: number; upgrade: boolean; prev: Deploy } | { s: "ok"; programId: string; src: string; at: number; count: number }

export type Project = {
  id: string
  name: string
  slug?: string
  framework: Framework
  source: Source
  files: Record<string, string>
  /** The files as they came, for the "changed" marks */
  original: Record<string, string>
  open: string
  /** The workspace shows the editor or the Call panel */
  pane: "code" | "call"
  terminal: boolean
  log: string[]
  build: Build
  deploy: Deploy
  /** The files as the last good build and the last deploy saw them, for the changed marks on the tabs */
  built?: Record<string, string>
  deployed?: Record<string, string>
  /** Set while the last deploy failed; the failure card holds Try again */
  deployFailed: "faucet" | "network" | null
  calling: { ix: string; from: "guide" | "panel"; stage?: string } | null
  lastCallOkAt: number
  /** The values the Guide card and the Call panel share, per instruction */
  values: Record<string, Record<string, string>>
  /** The instruction the Call panel has picked */
  ix: string | null
  idl: boolean
  ranSrc: string | null
  feed: Turn[]
  /** Runs the bar asked to go wrong, used once */
  force: { build?: "failed" | "slow" | "noAnswer"; deploy?: "faucet" | "network"; call?: "failed" | "network" | "faucet" }
  /** Chained runs: a head Deploy before a build, or an upgrade */
  chain: "deploy" | "upgrade" | null
  doneAt: number | null
  createdAt: number
  /** Opened from the catalog in build mode and not saved yet: not in your projects until a first edit or
   * deploy, and dropped when you leave it untouched (CONSENSUS-delta 2.7) */
  example?: boolean
  /** Read mode: a catalog program the build server can't build. Never a project, never counted */
  read?: boolean
  /** When the read path was finished */
  readAt?: number
  /** The notice in the editor's chip slot: typing in read mode, or a first edit with the projects full */
  notice?: "read" | "full" | null
  /** The import from GitHub, shown in the shell now there's no preview page: reading, downloading,
   * failed, or the pick when a folder holds several programs. Unset once the files are in */
  opening?: Opening
}

export type OpenFail = "notFound" | "rateLimited" | "network"
export type Opening = { s: "reading" } | { s: "downloading"; n: number; total: number } | { s: "failed"; kind: OpenFail } | { s: "pick"; options: string[] }

export type Route = { at: "catalog" } | { at: "project"; id: string }

export type ProgramsState = {
  route: Route
  projects: Record<string, Project>
  funded: boolean
  seq: number
  /** The build server builds Native: the bar's "Later" states. Off today, so catalog programs are read */
  native: boolean
  /** The account's other projects, made up for the quota states */
  account: { name: string; at: number }[]
}

// v2: read mode (11/07) changed what a catalog project holds
const KEY = "oak.programs.v2"

const fresh = (native = false): ProgramsState => ({ route: { at: "catalog" }, projects: {}, funded: false, seq: 1, native, account: [] })

/** A saved state, with every run that was going when the page went away stopped: a reload is not a deploy */
function settle(p: Project): Project {
  return {
    ...p,
    build: p.build.s === "running" ? { s: "none" } : p.build,
    deploy: p.deploy.s === "running" ? p.deploy.prev : p.deploy,
    calling: null,
    chain: null,
    feed: p.feed.filter((t) => t.k !== "act"),
  }
}

function loadState(): ProgramsState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return fresh()
    const s = JSON.parse(raw) as ProgramsState
    const on = s.route?.at === "project" ? s.route.id : null
    const projects = Object.fromEntries(
      Object.entries(s.projects ?? {})
        // An import cut off by the reload is no project yet; an untouched example is kept only while on screen
        .filter(([k, p]) => !p.opening && (!p.example || k === on))
        .map(([k, p]) => [k, ensureLive(settle(p))])
    )
    // The preview page is gone (Almaz, 6 Nov): a saved route to it lands on the catalog
    const route: Route = on && on in projects ? { at: "project", id: on } : { at: "catalog" }
    return { route, projects, funded: !!s.funded, seq: s.seq ?? 1, native: !!s.native, account: s.account ?? [] }
  } catch {
    return fresh()
  }
}

let state = loadState()
const listeners = new Set<() => void>()

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // Storage off: the flow lasts until the page reloads
  }
}

function set(next: ProgramsState) {
  state = next
  save()
  listeners.forEach((l) => l())
}

export const getPrograms = () => state

export function usePrograms<T>(pick: (s: ProgramsState) => T): T {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => pick(state)
  )
}

export const useProject = (id: string) => usePrograms((s) => s.projects[id])

// Another window (the tablet's frame) changing the store
window.addEventListener("storage", (e) => {
  if (e.key !== KEY) return
  state = loadState()
  listeners.forEach((l) => l())
})

export function resetPrograms(native = state.native) {
  timers.forEach((t) => clearTimeout(t))
  timers.clear()
  set(fresh(native))
}

// ----- Derived ------------------------------------------------------------------------------------

/** A short stable hash of a project's files, to tell whether the code moved since a build or deploy */
export function hashFiles(files: Record<string, string>) {
  let h = 5381
  for (const [k, v] of Object.entries(files).sort(([a], [b]) => a.localeCompare(b))) {
    if (k.endsWith(".md")) continue
    for (const c of k + v) h = (Math.imul(h, 33) ^ c.charCodeAt(0)) >>> 0
  }
  return h.toString(36)
}

export const metaOf = (p: Project): ProgramMeta | undefined => (p.slug ? programBySlug(p.slug) : undefined)

/** The instructions a project's IDL lists: a catalog program's, or a starter's */
export function ixsOf(p: Project): Ix[] {
  const meta = metaOf(p)
  if (meta) return meta.ixs
  return STARTERS[p.framework].ixs
}

export const firstIx = (p: Project) => metaOf(p)?.first ?? ixsOf(p)[0]?.name ?? null

export const busy = (p: Project) => !!p.opening || p.build.s === "running" || p.deploy.s === "running" || !!p.calling

export const stale = (p: Project) => p.build.s === "ok" && p.build.src !== hashFiles(p.files)
export const behind = (p: Project) => p.deploy.s === "ok" && p.deploy.src !== hashFiles(p.files)

/** The deployed state, through a run: an upgrade in flight still has the program on devnet */
export const onChain = (p: Project) => (p.deploy.s === "ok" ? p.deploy : p.deploy.s === "running" && p.deploy.prev.s === "ok" ? p.deploy.prev : null)

/** The read stops answered so far */
export const answered = (p: Project) => new Set(p.feed.flatMap((t) => (t.k === "stop" ? [t.stop] : [])))

/** The latest call came back failed: its card holds Try again */
const callFailed = (p: Project) => [...p.feed].reverse().find((t) => t.k === "call-ok" || t.k === "call-fail")?.k === "call-fail"

/** Read mode's live card: the next stop not read, then the call on devnet where there is one */
function readLive(p: Project): Act | null {
  const meta = metaOf(p)
  if (!meta) return null
  const path = readPath(meta)
  const done = answered(p)
  const next = path.find((s): s is Exclude<Stop, "call"> => s !== "call" && !done.has(s))
  if (next) return next
  return path.includes("call") && !p.lastCallOkAt && !callFailed(p) ? "call" : null
}

/** The one action the Guide asks for now (ux-architecture.md 5.2), or null when its card is a failure
 * that holds its own buttons, or when everything is done */
export function liveAction(p: Project): Act | null {
  if (p.read) return readLive(p)
  const src = hashFiles(p.files)
  if (p.framework === "ts-client") return p.ranSrc === src ? null : "run"
  if (p.deployFailed) return null
  if (p.build.s === "failed" && p.build.kind === "compile" && p.build.src === src) return null
  const chain = onChain(p)
  if (!chain) return p.build.s === "ok" && p.build.src === src ? "deploy" : "build"
  if (chain.src !== src) return "upgrade"
  // A native starter's client.ts run is its call: once it ran this code, nothing more is asked
  if (!p.idl) return p.framework === "native" && p.ranSrc === src ? null : "no-idl"
  if (p.lastCallOkAt <= chain.at) return "call"
  return null
}

/** The live act card: the last act in the feed, if nothing came after it */
export function liveTurn(p: Project) {
  const last = p.feed[p.feed.length - 1]
  for (let i = p.feed.length - 1; i >= 0; i--) {
    const t = p.feed[i]
    if (t.k === "act") return t
    if (t.k !== "user" && t.k !== "assistant") return null
  }
  return last?.k === "act" ? last : null
}

/** The Guide's steps, as the strip draws them: Build, Deploy, Call, or read mode's stops */
export type StepId = "build" | "deploy" | Stop
export type StepState = "pending" | "current" | "running" | "done" | "failed" | "stale"

export function steps(p: Project): { id: StepId; label: string; state: StepState }[] {
  const meta = metaOf(p)
  if (p.read && meta) {
    const done = answered(p)
    const live = liveAction(p)
    return readPath(meta).map((s) => ({
      id: s,
      label: STOP_LABEL[s],
      state: s === "call" ? (p.calling ? "running" : p.lastCallOkAt ? "done" : callFailed(p) ? "failed" : live === "call" ? "current" : "pending") : done.has(s) ? "done" : live === s ? "current" : "pending",
    }))
  }
  const ix = firstIx(p)
  if (p.framework === "ts-client") {
    const ran = p.ranSrc !== null
    return [
      { id: "build", label: "Run client.ts", state: p.calling ? "running" : ran && p.ranSrc === hashFiles(p.files) ? "done" : ran ? "stale" : "current" },
    ]
  }
  const live = liveAction(p)
  const chain = onChain(p)
  const built = p.build.s === "ok" || !!chain
  const buildState: StepState =
    p.build.s === "running" && !chain ? "running" : p.build.s === "failed" && !chain ? "failed" : built ? (stale(p) && !chain ? "stale" : "done") : live === "build" ? "current" : "pending"
  const deployState: StepState =
    p.deploy.s === "running" || (p.build.s === "running" && !!chain) ? "running" : p.deployFailed && !chain ? "failed" : chain ? (behind(p) ? "stale" : "done") : live === "deploy" ? "current" : "pending"
  // A native starter has no IDL: its client.ts run is the call (liveAction asks nothing more once it ran
  // this code), so the strip names it so and fills it, or the journey ended on an empty third segment
  const runs = p.framework === "native" && !p.idl
  const callState: StepState = p.calling
    ? "running"
    : runs
      ? chain && p.ranSrc === hashFiles(p.files) ? "done" : live === "no-idl" ? "current" : p.ranSrc ? "stale" : "pending"
      : p.lastCallOkAt > 0 && chain && p.lastCallOkAt > chain.at ? "done" : live === "call" || live === "no-idl" ? "current" : p.lastCallOkAt > 0 ? "stale" : "pending"
  return [
    { id: "build", label: "Build", state: buildState },
    { id: "deploy", label: "Deploy", state: deployState },
    { id: "call", label: runs ? "Run client.ts" : ix ? `Call ${ix}` : "Call", state: callState },
  ]
}

// ----- Updates ------------------------------------------------------------------------------------

const nextId = () => {
  const id = state.seq
  state = { ...state, seq: id + 1 }
  return id
}

/** Keeps the feed's live card in step with the live action: an unanswered act card that no longer fits
 * goes, and the one that does is posted at the end */
export function ensureLive(p: Project): Project {
  if (busy(p)) return p
  const live = liveAction(p)
  const feed = [...p.feed]
  const open = liveTurn({ ...p, feed })
  if (open && open.act === live) return p
  const cleaned = open ? feed.filter((t) => t !== open) : feed
  if (!live) return { ...p, feed: cleaned }
  const retry = cleaned[cleaned.length - 1]?.k === "build-fail" && (cleaned[cleaned.length - 1] as { kind: string }).kind === "noAnswer"
  return { ...p, feed: [...cleaned, { k: "act", id: nextId(), act: live, retry }] }
}

function update(id: string, fn: (p: Project) => Project) {
  const p = state.projects[id]
  if (!p) return
  const next = ensureLive(fn(p))
  set({ ...state, projects: { ...state.projects, [id]: next } })
}

const post = (p: Project, ...turns: NewTurn[]): Project => ({ ...p, feed: [...p.feed, ...turns.map((t) => ({ ...t, id: nextId() }) as Turn)] })

/** Leaving an example you didn't touch drops it: only what you built or changed is yours */
const tidy = (projects: Record<string, Project>, on: string | null) =>
  Object.fromEntries(Object.entries(projects).filter(([k, p]) => k === on || (!p.example && !p.opening)))

export function go(route: Route) {
  set({ ...state, route, projects: tidy(state.projects, route.at === "project" ? route.id : null) })
}

/** The first edit or the first deploy saves a build mode example as a project (CONSENSUS-delta 2.7).
 * Opening, reading, building, calling and pinning never do */
function keep(id: string) {
  const p = state.projects[id]
  if (p?.example) set({ ...state, projects: { ...state.projects, [id]: { ...p, example: false } } })
}

// ----- The account's projects ---------------------------------------------------------------------

export const LIMIT = 10

/** Projects that count toward the account's 10: the made up ones, and every build mode project saved */
export const usedSlots = (s: ProgramsState = state) => s.account.length + Object.values(s.projects).filter((p) => !p.read && !p.example && !p.opening).length

/** A first edit or deploy would save it as a project, and the account has no slot left */
export const blocked = (p: Project, s: ProgramsState = state) => !!p.example && !p.read && usedSlots(s) >= LIMIT

/** Manage projects' delete: a made up project, or a saved one that isn't on screen */
export function deleteProject(name: string) {
  const projects = Object.fromEntries(Object.entries(state.projects).filter(([, p]) => p.name !== name || p.read || p.example))
  set({ ...state, account: state.account.filter((a) => a.name !== name), projects })
}

export function setNotice(id: string, notice: Project["notice"]) {
  if (state.projects[id] && state.projects[id].notice !== notice) update(id, (p) => ({ ...p, notice }))
}

export function edit(id: string, file: string, code: string) {
  const p = state.projects[id]
  if (!p || p.read || p.files[file] === code) return
  // The keystroke doesn't land: saving it would take an 11th project
  if (blocked(p)) return setNotice(id, "full")
  keep(id)
  update(id, (q) => ({ ...q, files: { ...q.files, [file]: code } }))
}

export function openFile(id: string, file: string) {
  update(id, (p) => ({ ...p, open: file, pane: "code" }))
}

export function setPane(id: string, pane: "code" | "call", ix?: string) {
  update(id, (p) => ({ ...p, pane, ix: ix ?? p.ix }))
}

export function setTerminal(id: string, open: boolean) {
  update(id, (p) => ({ ...p, terminal: open }))
}

export function setValue(id: string, ix: string, arg: string, value: string) {
  update(id, (p) => ({ ...p, values: { ...p.values, [ix]: { ...p.values[ix], [arg]: value } } }))
}


// ----- Runs ---------------------------------------------------------------------------------------

const timers = new Set<ReturnType<typeof setTimeout>>()
const later = (ms: number, fn: () => void) => {
  const t = setTimeout(() => {
    timers.delete(t)
    fn()
  }, ms)
  timers.add(t)
}

/** The build's timing and the deploy's per stage, as the tutorial's runner (D29) */
export const BUILD_MS = 1600
export const SLOW_MS = 5200
export const STAGE_MS = 1100
export const CALL_MS = 1600

/** A compiler error where the brackets don't close, the one mistake typing in the prototype can make */
function compileError(files: Record<string, string>) {
  for (const [file, code] of Object.entries(files)) {
    if (!file.endsWith(".rs")) continue
    let depth = 0
    const lines = code.split("\n")
    // The memo program's one name: used in its msg! line after its declaration was renamed away
    const uses = lines.findIndex((l) => l.includes("memo.len()"))
    if (uses !== -1 && !/let\s+memo\b/.test(code))
      return { file, line: uses + 1, col: lines[uses].indexOf("memo") + 1, code: "E0425", message: "cannot find value `memo` in this scope", quote: lines[uses].trim() }
    for (let i = 0; i < lines.length; i++) {
      for (const c of lines[i]) {
        if (c === "{") depth++
        if (c === "}") depth--
        if (depth < 0) return { file, line: i + 1, col: lines[i].indexOf("}") + 1, code: "E0000", message: "unexpected closing delimiter: `}`", quote: lines[i].trim() }
      }
    }
    if (depth > 0) {
      const last = lines.length - (code.endsWith("\n") ? 1 : 0)
      return { file, line: last, col: 1, code: "E0000", message: "this file contains an unclosed delimiter", quote: lines[last - 1]?.trim() ?? "" }
    }
  }
  return null
}

function buildLog(p: Project, ok: boolean) {
  const crate = (p.slug ?? p.name).replace(/-/g, "_")
  return ok
    ? [`$ build`, `   Compiling ${crate} v1.0.0 (/src)`, `    Finished release [optimized] target(s)`, `Build successful. IDL: ${ixsOf(p).length} instruction(s)`]
    : [`$ build`, `   Compiling ${crate} v1.0.0 (/src)`]
}

export function build(id: string, opts: { instant?: boolean; chain?: "deploy" | "upgrade" } = {}) {
  const p0 = state.projects[id]
  if (!p0 || p0.read || busy(p0)) return
  const force = p0.force.build
  update(id, (p) => ({ ...p, build: { s: "running", slow: false }, chain: opts.chain ?? null, force: { ...p.force, build: undefined }, terminal: p.terminal, log: buildLog(p, false) }))
  const finish = () => {
    const p = state.projects[id]
    if (!p || p.build.s !== "running") return
    const src = hashFiles(p.files)
    const err =
      compileError(p.files) ??
      (force === "failed" ? { file: MAIN_FILE in p.files ? MAIN_FILE : Object.keys(p.files)[0], line: 31, col: 19, code: "E0425", message: "cannot find value `memo` in this scope", quote: 'msg!("Memo (len {}): {:?}", memo.len(), memo);' } : null)
    if (force === "noAnswer") {
      update(id, (q) => post({ ...q, build: { s: "failed", src, kind: "noAnswer" }, chain: null, log: [...q.log, "error: the build server didn't answer"] }, { k: "build-fail", kind: "noAnswer" }))
      return
    }
    if (err) {
      update(id, (q) =>
        post(
          { ...q, build: { s: "failed", src, kind: "compile" }, chain: null, terminal: true, log: [...q.log, `error[${err.code}]: ${err.message}`, ` --> ${err.file}:${err.line}:${err.col}`, `   |`, `${err.line}  |     ${err.quote}`] },
          { k: "build-fail", kind: "compile", ...err }
        )
      )
      return
    }
    const chained = p.chain
    update(id, (q) => {
      const done: Project = { ...q, build: { s: "ok", src, at: Date.now() }, built: q.files, log: buildLog(q, true) }
      // An upgrade posts one card for the build and the deploy together; the build alone stays quiet
      return chained === "upgrade" ? done : post(done, { k: "build-ok", took: force === "slow" ? SLOW_MS : BUILD_MS, ixs: ixsOf(q).length })
    })
    if (chained) deploy(id, { instant: opts.instant })
  }
  if (opts.instant) return finish()
  if (force === "slow") {
    later(1200, () => update(id, (p) => (p.build.s === "running" ? { ...p, build: { s: "running", slow: true } } : p)))
    later(SLOW_MS, finish)
  } else later(force === "noAnswer" ? 2400 : BUILD_MS, finish)
}

/** Deploy, building first when the build is missing or behind the code */
export function deploy(id: string, opts: { instant?: boolean } = {}) {
  const p0 = state.projects[id]
  if (!p0 || p0.opening || p0.read) return
  // The projects are full: the card that took the Deploy card's place says so, and flashes
  if (blocked(p0)) return void bus.dispatchEvent(new Event("quota"))
  keep(id)
  const src = hashFiles(p0.files)
  if (p0.build.s === "running") return
  if (p0.build.s !== "ok" || p0.build.src !== src) return build(id, { ...opts, chain: onChain(p0) ? "upgrade" : "deploy" })
  if (p0.deploy.s === "running") return
  const upgrade = p0.deploy.s === "ok"
  const stages = [...(state.funded || upgrade ? [] : ["Funding your wallet"]), upgrade ? "Upgrading the program" : "Writing the program", "Confirming on devnet"]
  const force = p0.force.deploy
  const cost = upgrade ? 0.0021 : (metaOf(p0)?.cost ?? 0.48)
  update(id, (p) => ({ ...p, deploy: { s: "running", stages, stage: 0, upgrade, prev: p.deploy }, deployFailed: null, force: { ...p.force, deploy: undefined }, log: [...p.log, `$ deploy`, `Deploying to devnet...`] }))
  const fail = (kind: "faucet" | "network", stage: string) =>
    update(id, (p) => {
      const prev = p.deploy.s === "running" ? p.deploy.prev : p.deploy
      const line = kind === "faucet" ? "error: airdrop request failed: the faucet has run dry or hit its limit" : `error: devnet stopped answering during "${stage}"`
      return post({ ...p, deploy: prev, deployFailed: kind, chain: null, terminal: true, log: [...p.log, line] }, { k: "deploy-fail", kind, stage, cost })
    })
  const step = (i: number): void => {
    const p = state.projects[id]
    if (!p || p.deploy.s !== "running") return
    if (force === "faucet" && stages[i] === "Funding your wallet") return fail("faucet", stages[i])
    if (force === "faucet" && i === 0 && upgrade) return fail("faucet", stages[i])
    if (force === "network" && i === stages.length - 1) return fail("network", stages[i])
    if (stages[i] === "Funding your wallet") state = { ...state, funded: true }
    if (i + 1 < stages.length) {
      update(id, (q) => (q.deploy.s === "running" ? { ...q, deploy: { ...q.deploy, stage: i + 1 } } : q))
      return opts.instant ? step(i + 1) : later(STAGE_MS, () => step(i + 1))
    }
    const programId = p.deploy.prev.s === "ok" ? p.deploy.prev.programId : fakeKey(`${p.id}-program`)
    const count = p.deploy.prev.s === "ok" ? p.deploy.prev.count + 1 : 1
    const took = stages.length * STAGE_MS + (p.chain ? BUILD_MS : 0)
    update(id, (q) =>
      post(
        {
          ...q,
          deploy: { s: "ok", programId, src: hashFiles(q.files), at: Date.now(), count },
          deployed: q.files,
          chain: null,
          log: [...q.log, `Program Id: ${programId}`, upgrade ? `Upgraded. ${cost} SOL from ${WALLET_KEY.slice(0, 6)}…` : `Deployed. ${cost} SOL from ${WALLET_KEY.slice(0, 6)}…`],
        },
        { k: "deploy-ok", programId, took, cost, upgrade }
      )
    )
  }
  if (opts.instant) step(0)
  else later(STAGE_MS, () => step(0))
}

function callLog(p: Project, programId: string, ix: string, args: Record<string, string>, ok: boolean) {
  const head = [`Program ${programId} invoke [1]`]
  if (!ok) return [...head, `Program log: Instruction: ${pascal(ix)}`, `Program ${programId} consumed 3121 of 200000 compute units`, `Program ${programId} failed: custom program error: 0x1`]
  if (p.slug === "spl-memo" || (!p.slug && ix === "memo")) {
    const text = args.text ?? ""
    return [...head, `Program log: Signed by ${WALLET_KEY}`, `Program log: Memo (len ${text.length}): ${JSON.stringify(text)}`, `Program ${programId} consumed 1042 of 200000 compute units`, `Program ${programId} success`]
  }
  if (ix === "noop") return [...head, `Program ${programId} consumed 116 of 200000 compute units`, `Program ${programId} success`]
  return [...head, `Program log: Instruction: ${pascal(ix)}`, `Program ${programId} consumed 4518 of 200000 compute units`, `Program ${programId} success`]
}

const pascal = (s: string) => s.replace(/(^|_)(\w)/g, (_, __, c: string) => c.toUpperCase())

export function valuesFor(p: Project, ix: string) {
  const def = ixsOf(p).find((i) => i.name === ix)
  return Object.fromEntries((def?.args ?? []).map((a) => [a.name, p.values[ix]?.[a.name] ?? a.example]))
}

export function call(id: string, ix: string, from: "guide" | "panel" = "guide", opts: { instant?: boolean } = {}) {
  const p0 = state.projects[id]
  const chain = p0 && onChain(p0)
  if (!p0 || !chain || busy(p0)) return
  const args = valuesFor(p0, ix)
  const force = p0.force.call
  update(id, (p) => ({ ...p, calling: { ix, from }, force: { ...p.force, call: undefined }, log: [...p.log, `$ call ${ix}`] }))
  const finish = () => {
    const p = state.projects[id]
    if (!p) return
    const ok = force !== "failed"
    const log = callLog(p, chain.programId, ix, args, ok)
    if (!ok) {
      update(id, (q) => post({ ...q, calling: null, log: [...q.log, ...log] }, { k: "call-fail", ix, kind: "program", error: "custom program error: 0x1", log }))
      return
    }
    const first = !p.doneAt
    const cu = Number(log.find((l) => l.includes("consumed"))?.match(/consumed (\d+)/)?.[1] ?? 0)
    update(id, (q) => {
      const done = post({ ...q, calling: null, lastCallOkAt: Date.now(), doneAt: q.doneAt ?? Date.now(), log: [...q.log, ...log] }, { k: "call-ok", ix, args, sig: fakeKey(`${q.id}-${Date.now()}`, 88), cu, fee: 0.000005, log, from })
      return first ? post(done, { k: "milestone" }) : done
    })
  }
  if (opts.instant) finish()
  else later(CALL_MS, finish)
}

/** Read mode's call: Solana's own copy on devnet, no build or deploy. The wallet is funded first if it's
 * empty; the bar can make the faucet refuse or devnet not answer */
export function refCall(id: string, opts: { instant?: boolean } = {}) {
  const p0 = state.projects[id]
  const meta = p0 && metaOf(p0)
  const programId = meta?.devnetId
  if (!p0 || !p0.read || !programId || busy(p0)) return
  const ix = meta.first
  const args = valuesFor(p0, ix)
  const force = p0.force.call
  const stages = [...(state.funded ? [] : ["Funding your wallet"]), `Sending ${ix} to devnet`]
  update(id, (p) => ({ ...p, calling: { ix, from: "guide", stage: stages[0] }, force: { ...p.force, call: undefined }, log: [...p.log, `$ call ${ix} on devnet`] }))
  const fail = (kind: "network" | "faucet") =>
    update(id, (q) => {
      const line = kind === "faucet" ? "error: airdrop request failed: the faucet has run dry or hit its limit" : "error: devnet didn't answer, the call wasn't sent"
      return post({ ...q, calling: null, log: [...q.log, line] }, { k: "call-fail", ix, kind, error: line, log: [line] })
    })
  const step = (i: number): void => {
    const p = state.projects[id]
    if (!p?.calling) return
    if (stages[i] === "Funding your wallet") {
      if (force === "faucet") return fail("faucet")
      state = { ...state, funded: true }
    }
    if (i + 1 < stages.length) {
      update(id, (q) => (q.calling ? { ...q, calling: { ...q.calling, stage: stages[i + 1] } } : q))
      return opts.instant ? step(i + 1) : later(STAGE_MS, () => step(i + 1))
    }
    if (force === "network") return fail("network")
    const log = callLog(p, programId, ix, args, true)
    const cu = Number(log.find((l) => l.includes("consumed"))?.match(/consumed (\d+)/)?.[1] ?? 0)
    update(id, (q) => {
      const done = post({ ...q, calling: null, lastCallOkAt: Date.now(), log: [...q.log, ...log] }, { k: "call-ok", ix, args, sig: fakeKey(`${q.id}-${Date.now()}`, 88), cu, fee: 0.000005, log, from: "guide" })
      return q.readAt ? done : post({ ...done, readAt: Date.now() }, { k: "milestone" })
    })
  }
  if (opts.instant) step(0)
  else later(STAGE_MS, () => step(0))
}

/** Posts the live stop's answer; the last stop of a path with no call finishes it */
function answerStop(id: string) {
  update(id, (p) => {
    const stop = liveAction(p)
    if (!p.read || !stop || stop === "call") return p
    const q = post(p, { k: "stop", stop: stop as Exclude<Stop, "call"> })
    return liveAction(q) || q.readAt ? q : post({ ...q, readAt: Date.now() }, { k: "milestone" })
  })
}

/** The strip's jump to a stop not reached yet: the stops before it are read on the way */
export function readTo(id: string, stop: StepId) {
  for (let n = 0; n < 4; n++) {
    const p = state.projects[id]
    const live = p && liveAction(p)
    if (!p?.read || !live || live === stop || live === "call") return
    answerStop(id)
  }
}

/** A TS client project's run: client.ts against a program already on devnet */
export function runClient(id: string, opts: { instant?: boolean } = {}) {
  if (state.projects[id] && !busy(state.projects[id])) keep(id)
  const p0 = state.projects[id]
  if (!p0 || busy(p0)) return
  update(id, (p) => ({ ...p, calling: { ix: "client.ts", from: "guide" }, log: [...p.log, "$ run client.ts"] }))
  const finish = () =>
    update(id, (q) => {
      // A starter's client.ts calls its own program, so the run shows what that program logs, read from
      // the code as it is now: change the msg! text, upgrade, run, and the new words come back
      const chain = onChain(q)
      const log = q.framework !== "ts-client" && chain ? programLogOf(q, chain.programId) : [`My address: ${WALLET_KEY}`, `My balance: 4.99 SOL`, `Memo program says: "gm from Playground"`]
      const done = post({ ...q, calling: null, ranSrc: hashFiles(q.files), doneAt: q.doneAt ?? Date.now(), log: [...q.log, ...log] }, { k: "run-ok", log, took: CALL_MS })
      // A deployed native starter's first run is its first call: it ends the journey as a call does
      return q.framework === "native" && !q.doneAt && onChain(q) ? post(done, { k: "milestone" }) : done
    })
  if (opts.instant) finish()
  else later(CALL_MS, finish)
}

/** Runs whatever the live card asks for: ⌘↵, the composer's action words */
export function runLive(id: string) {
  const p = state.projects[id]
  if (!p) return
  const live = liveAction(p)
  if (p.read) return live === "call" ? refCall(id) : live && answerStop(id)
  if (live === "build") build(id)
  else if (live === "deploy" || live === "upgrade") deploy(id)
  else if (live === "call") call(id, firstIx(p) ?? "")
  else if (live === "run") runClient(id)
}

export function retryDeploy(id: string) {
  update(id, (p) => ({ ...p, deployFailed: null }))
  deploy(id)
}

/** Upload IDL: the prototype has one ready (decision 17) */
export function uploadIdl(id: string) {
  update(id, (p) => post({ ...p, idl: true }, { k: "assistant", text: "IDL uploaded. The call form is built from it now, so the instructions show up in the Call panel." }))
}

// ----- The assistant (canned, decision 20) --------------------------------------------------------

/** The plain reason a compiler error comes with, when asked why Rust wants it */
const WHY_RUST: Record<string, string> = {
  E0425: "Rust checks every name when it compiles: a name has to be declared before it's used, so a typo or a rename can't slip through to devnet.",
  E0000: "Rust reads blocks by their braces, so one missing `}` leaves it unsure where a function ends. It stops there rather than guess.",
}

function answerFor(p: Project, text: string): NewTurn {
  const t = text.toLowerCase()
  const meta = metaOf(p)
  if (p.read && meta) return { k: "assistant", text: readAnswer(meta, text) }
  const fail = [...p.feed].reverse().find((x) => x.k === "build-fail") as Extract<Turn, { k: "build-fail" }> | undefined
  const lastFail = [...p.feed].reverse().find((x) => x.k === "build-fail" || x.k === "call-fail")
  if (t.includes("explain") && lastFail?.k === "call-fail")
    return {
      k: "assistant",
      text: `\`${lastFail.ix}\` reached the program, and the program returned \`${lastFail.error}\`. Error 0x1 is the first error the program defines, usually an account it didn't expect or one already in use. Nothing changed on chain except the fee. Try the call again, or change the values in the Call panel.`,
    }
  if (t.includes("idl"))
    return { k: "assistant", text: "An IDL lists a program's instructions, their arguments and accounts, as JSON. Playground draws the Call panel from it. Anchor makes one when it builds; a native Rust program doesn't, so you upload one or call it from `client.ts`." }
  if (t.includes("explain") && fail?.kind === "compile")
    return {
      k: "assistant",
      text: `The compiler stopped at \`${fail.file}\` line ${fail.line}: ${fail.message}. ${fail.code === "E0425" ? "The code uses a name that was never declared in this scope." : "A `{` opens a block that never closes, or a `}` closes one that never opened."} The fix is one line.`,
      chips: ["Show me the line", "Why does Rust need this?"],
    }
  if (t.includes("show me the line") && fail?.line) return { k: "assistant", text: `It's line ${fail.line} in \`${(fail.file ?? MAIN_FILE).split("/").pop()}\`, lit in the editor.` }
  if (t.includes("why does rust") && fail) return { k: "assistant", text: WHY_RUST[fail.code ?? ""] ?? "Rust checks the whole program when it compiles, so a mistake stops the build instead of a call on devnet." }
  // The assistant explains and never writes code (Sergey, 11/07): where and what, in words
  if (/\b(fix|change|make it|add|write)\b/.test(t))
    return {
      k: "assistant",
      text:
        fail?.kind === "compile"
          ? `The compiler stopped at \`${(fail.file ?? MAIN_FILE).split("/").pop()}\` line ${fail.line}: ${fail.message}. ${fail.code === "E0425" ? "Declare the name before that line, or use the one that is declared." : "Close the block that's left open, or drop the brace that has no match."} Change it there, then Build and deploy.`
          : `Each instruction is handled in \`${MAIN_FILE}\`, one function each, so a change to what one does goes in its function there. Change it there, then Build and deploy.`,
    }
  if (t.includes("cost")) return { k: "assistant", text: `A first deploy of ${p.name} takes about ${meta?.cost ?? 0.48} devnet SOL, mostly rent for the program's account. Devnet SOL is free test money from the faucet, and the Guide gets it for you.` }
  if (t.includes("safe")) return { k: "assistant", text: "Yes. Everything here runs on devnet, a test network. Nothing touches real money, and you can deploy and call as often as you like." }
  if (t.includes("walk") || t.includes("read first") || t.includes("file"))
    return { k: "assistant", text: `Start with \`${MAIN_FILE}\`: \`process_instruction\` gets every call, reads which instruction it is, and runs it. \`entrypoint.rs\` only hands the call over, and \`lib.rs\` ties the files together.` }
  const ix = meta?.ixs.find((i) => t.includes(i.name))
  if (ix) return { k: "assistant", text: `\`${ix.name}\`: ${ix.line} ${ix.accounts.length ? `It takes ${ix.accounts.length} accounts (${ix.accounts.join(", ")}).` : "It needs no accounts, only your wallet's signature."}` }
  // Anything else, "what now?" included: say the one next step, not a list of things to ask
  return { k: "assistant", text: nextStep(p) }
}

/** What a starter's program logs when it's called: its first msg! line, with the program's id for {} */
function programLogOf(p: Project, programId: string): string[] {
  const said = Object.values(p.files).map((f) => f.match(/msg!\(\s*"([^"]*)"/)?.[1]).find((m) => m !== undefined)
  const id = `${programId.slice(0, 6)}…${programId.slice(-6)}`
  return said === undefined ? [`Program ${id} success`] : [`Program log: ${said.replace(/\{\}/g, id)}`]
}

/** A project's new name, from its head. The id stays, so the feed, the pins and the deploy keep it */
export function renameProject(id: string, name: string) {
  const n = name.trim()
  if (n) update(id, (p) => (p.name === n ? p : { ...p, name: n }))
}

/** A line from the Guide with no question before it, as a card's next step asks for */
export function say(id: string, text: string) {
  update(id, (p) => post(p, { k: "assistant", text }))
}

/** The Guide's next step in words, for a question the answers above don't cover */
function nextStep(p: Project): string {
  const ix = firstIx(p)
  switch (liveAction(p)) {
    case "build":
      return `Next is Build: it compiles \`${MAIN_FILE.split("/").pop()}\` on Playground's build server. Press Build in the card above.`
    case "deploy":
      return "Next is Deploy: it puts your program on devnet, the free test network. Press Deploy in the card above."
    case "upgrade":
      return "You changed the code since the last deploy. Next is Build and deploy: it upgrades your program on devnet."
    case "call":
      return `Next is Call \`${ix ?? "the program"}\`: it sends that instruction to your program on devnet. Press Call in the card above.`
    case "no-idl":
    case "run":
      return "Next is Run client.ts: it calls your program on devnet and prints what comes back. Press Run in the card above."
    default:
      return `That's the whole path: ${p.name} is built, on devnet and it answered. Change the code and upgrade, or ask what a line does.`
  }
}

export function ask(id: string, text: string) {
  const words = text.trim().toLowerCase()
  update(id, (p) => post(p, { k: "user", text }))
  const p = state.projects[id]
  // Read mode: "next" runs the next stop and "call" the call card; "build" and "deploy" get the Why answer
  if (p?.read ? words === "next" || (words === "call" && liveAction(p) === "call") : ["build", "deploy", "call", "run", "build it", "deploy it"].includes(words)) return runLive(id)
  later(700, () => update(id, (q) => post(q, answerFor(q, text))))
}

// ----- Projects and the import --------------------------------------------------------------------

function blank(name: string, framework: Framework, source: Source, files: Record<string, string>): Project {
  return {
    id: name,
    name,
    framework,
    source,
    files,
    original: files,
    open: MAIN_FILE,
    pane: "code",
    terminal: false,
    log: [],
    build: { s: "none" },
    deploy: { s: "none" },
    deployFailed: null,
    calling: null,
    lastCallOkAt: 0,
    values: {},
    ix: null,
    idl: true,
    ranSrc: null,
    feed: [],
    force: {},
    chain: null,
    doneAt: null,
    createdAt: Date.now(),
  }
}

/** The project made from a catalog program, if there is one */
export const projectOfSlug = (slug: string) => Object.values(state.projects).find((p) => p.slug === slug)

function makeFromProgram(meta: ProgramMeta, name = meta.name): Project {
  const files = filesOf(meta)
  // Read mode while the build server can't build Native, which today is every catalog program
  return { ...blank(name, "native", "example", files), slug: meta.slug, idl: true, read: !state.native }
}

export type OpenProject = {
  name: string
  framework: Framework
  source: Source
  openFile?: string
  prompt?: string
  /** New project's only: it draws its one time hint on [data-oak="build"] itself */
  firstRun?: boolean
  slug?: string
  /** Starts the live action right after landing (Home's "Run the Anchor starter") */
  build?: boolean
}

/** Who shows the Programs screen when a project opens from elsewhere: set by the bridge DesktopApp mounts */
let show: () => void = () => {}
export const setShowPrograms = (fn: () => void) => {
  show = fn
}

const bus = new EventTarget()
/** A Deploy pressed with the projects full: the quota card scrolls into view and flashes */
export function onQuotaFlash(fn: () => void) {
  bus.addEventListener("quota", fn)
  return () => bus.removeEventListener("quota", fn)
}
export function onProjectsEvent(name: "project:open", fn: (detail: unknown) => void) {
  const h = (e: Event) => fn((e as CustomEvent).detail)
  bus.addEventListener(name, h)
  return () => bus.removeEventListener(name, h)
}

/** The shell's one entry, shared with New project (BRIEF.md, last section). A catalog program that is
 * already a project opens that project: no second copy */
export function openProject(o: OpenProject) {
  bus.dispatchEvent(new CustomEvent("project:open", { detail: o }))
  const meta = o.slug ? programBySlug(o.slug) : undefined
  const existing = o.slug ? projectOfSlug(o.slug) : state.projects[o.name]
  let p: Project
  if (existing) p = existing
  else if (meta) p = ensureLive(post(makeFromProgram(meta, o.name), { k: "intro" }))
  else {
    const starter = STARTERS[o.framework]
    p = ensureLive(post({ ...blank(o.name, o.framework, o.source, starter.files), open: starter.main, idl: o.framework !== "native" }, { k: "intro" }))
  }
  if (o.openFile && o.openFile in p.files) p = { ...p, open: o.openFile }
  set({ ...state, projects: { ...state.projects, [p.id]: p }, route: { at: "project", id: p.id } })
  if (o.prompt) ask(p.id, o.prompt)
  // Read mode lands on its landing: Build has nothing to run there
  if (o.build && !p.read) runLive(p.id)
  show()
}

/** When the bar forces "several programs": the name service folder, as if it held a second program.
 * spl-name-registry is made up (flagged fake on the board) */
const SEVERAL = ["spl-name-service", "spl-name-registry"]

/** A catalog program, from the catalog or its banner: straight into the shell, the project already
 * made if there is one. There is no preview page (Almaz, 6 Nov): the Guide's first words say what the
 * program is, and the import from GitHub runs in the shell. It opens as an example, yours once you
 * build or change it. The bar's states: `fail` ends the first try there, `hold` stops it mid download,
 * `several` asks which program first */
export function openProgram(slug: string, o: { fail?: OpenFail; hold?: boolean; several?: boolean } = {}) {
  const meta = programBySlug(slug)
  if (!meta) return
  const existing = projectOfSlug(slug)
  if (existing) return openProject({ name: existing.name, framework: existing.framework, source: existing.source, slug })
  const p = ensureLive(post({ ...makeFromProgram(meta), example: state.native, opening: o.several ? { s: "pick", options: SEVERAL } : { s: "reading" } }, { k: "intro" }))
  set({ ...state, projects: tidy({ ...state.projects, [p.id]: p }, p.id), route: { at: "project", id: p.id } })
  show()
  if (!o.several) runOpening(p.id, o)
}

/** Reading, then downloading n of total, then the files are in */
function runOpening(id: string, o: { fail?: OpenFail; hold?: boolean } = {}) {
  const p = state.projects[id]
  const meta = p && metaOf(p)
  if (!meta) return
  const total = Object.keys(filesOf(meta)).length
  const at = (opening: Opening | undefined) => update(id, (q) => ({ ...q, opening }))
  const tick = (n: number) => {
    if (!state.projects[id]?.opening) return
    if (n > total) return at(undefined)
    at({ s: "downloading", n, total })
    if (o.hold && n >= Math.ceil(total / 2)) return
    later(160, () => tick(n + 1))
  }
  later(800, () => {
    if (!state.projects[id]?.opening) return
    if (o.fail) return at({ s: "failed", kind: o.fail })
    tick(1)
  })
}

export function retryOpening(id: string) {
  update(id, (p) => ({ ...p, opening: { s: "reading" } }))
  runOpening(id)
}

/** The pick made: the project takes that program's name and the import runs */
export function pickProgram(id: string, name: string) {
  update(id, (p) => ({ ...p, name, opening: { s: "reading" } }))
  runOpening(id)
}

/** Cancel or Back to Programs while it opens: nothing was made */
export function cancelOpening(id: string) {
  const rest = { ...state.projects }
  delete rest[id]
  set({ ...state, projects: rest, route: { at: "catalog" } })
}

// ----- Bar states ---------------------------------------------------------------------------------

/** The build server learns Native (the bar's Later states) or not: every catalog project flips at once */
export function setNative(native: boolean) {
  if (state.native === native) return
  const projects = Object.fromEntries(Object.entries(state.projects).map(([k, p]) => [k, p.slug ? ensureLive({ ...p, read: !native }) : p]))
  set({ ...state, native, projects })
}

/** Other projects the account holds, for the quota states; last opened a day or more ago */
const FAKES = ["hello-anchor", "counter", "token-swap", "nft-mint", "escrow", "vault", "todo-list", "voting", "staking-demo", "fizzbuzz"]
const account = (n: number) => FAKES.slice(0, n).map((name, i) => ({ name, at: Date.now() - (i + 1) * 26 * 3600_000 }))

/** Puts a project where a bar state shows: fresh spl-memo (or spl-record for the read path states), runs
 * made at once. Read states run while the server can't build Native, the build ones while it can */
export function seed(kind: string) {
  const meta = programBySlug(kind === "read-mid" || kind === "read-done" ? "spl-record" : "spl-memo")!
  const id = meta.name
  // Opened from the catalog: in build mode not a project until a first edit or deploy
  const base = ensureLive(post({ ...makeFromProgram(meta), example: state.native }, { k: "intro" }))
  const fakes = kind === "projects-9" ? 9 : kind.startsWith("projects-full") ? 10 : 0
  set({ ...state, account: account(fakes), projects: { ...state.projects, [id]: base }, route: { at: "project", id } })
  const instant = { instant: true }
  const force = (f: Project["force"]) => update(id, (p) => ({ ...p, force: f }))
  const read = (n: number) => Array.from({ length: n }, () => answerStop(id))
  switch (kind) {
    case "read-mid":
      read(1)
      break
    case "read-done":
      read(3)
      break
    case "read-typing":
      setNotice(id, "read")
      break
    case "build-slow":
      force({ build: "slow" })
      build(id)
      break
    case "build-failed":
      // A real mistake in the file, so the error's --> link has a line to point at
      edit(id, MAIN_FILE, base.files[MAIN_FILE].replace("let memo = from_utf8", "let text = from_utf8"))
      force({ build: "failed" })
      build(id, instant)
      break
    case "build-no-answer":
      force({ build: "noAnswer" })
      build(id, instant)
      break
    case "deploy-network":
      build(id, instant)
      force({ deploy: "network" })
      deploy(id, instant)
      break
    case "no-idl":
      update(id, (p) => ({ ...p, idl: false }))
      build(id, instant)
      deploy(id, instant)
      break
    case "returning-deployed":
    case "returning-edited":
      build(id, instant)
      deploy(id, instant)
      call(id, "memo", "guide", instant)
      if (kind === "returning-edited") {
        const p = state.projects[id]
        edit(id, MAIN_FILE, p.files[MAIN_FILE].replace('msg!("Memo (len {}): {:?}", memo.len(), memo);', 'msg!("Memo (len {}): {:?}", memo.len(), memo);\n    msg!("Thanks for the memo");'))
      }
      break
    case "projects-9":
    case "projects-full-deploy":
      build(id, instant)
      break
    case "projects-full-edit":
      setNotice(id, "full")
      break
  }
}

export function seedTsClient() {
  const name = "memo-client"
  const { [name]: _, ...rest } = state.projects
  set({ ...state, projects: rest })
  openProject({ name, framework: "ts-client", source: "starter", firstRun: true })
}

/** Catalog returning: read mode has spl-memo read to the end and spl-record two stops in; build mode
 * has spl-memo deployed and spl-record opened */
/** The bar's "Your programs: 1, 3, 5": that many of your own, an hour apart, each at another place a
 * project can stand, shown on the catalog. One is under way, as a first visit back is; five is three rows
 * and Show all 5 */
export function seedYours(n: number) {
  const instant = { instant: true }
  const mine: [string, Framework, (id: string) => void][] = [
    ["token-vault", "anchor", (id) => (build(id, instant), deploy(id, instant))],
    [
      "counter",
      "anchor",
      (id) => {
        build(id, instant)
        deploy(id, instant)
        call(id, firstIx(state.projects[id]) ?? "initialize", "guide", instant)
        // Instant runs share a millisecond, and a call counts only after the deploy it went to
        update(id, (p) => ({ ...p, lastCallOkAt: p.lastCallOkAt + 1 }))
      },
    ],
    ["hello-native", "native", (id) => build(id, instant)],
    ["tip-jar", "seahorse", (id) => (update(id, (p) => ({ ...p, force: { build: "failed" } })), build(id, instant))],
    ["price-check", "ts-client", () => {}],
  ]
  const now = Date.now()
  // Oldest first, so the runs' times fall in the list's order too
  mine
    .slice(0, n)
    .map((m, i) => [m, i] as const)
    .reverse()
    .forEach(([[name, framework, run], i]) => {
      const starter = STARTERS[framework]
      const p = ensureLive(post({ ...blank(name, framework, "starter", starter.files), open: starter.main, idl: framework !== "native", createdAt: now - i * 3600e3 }, { k: "intro" }))
      set({ ...state, projects: { ...state.projects, [p.id]: p } })
      run(name)
    })
  go({ at: "catalog" })
}

export function seedReturning() {
  if (state.native) seed("returning-deployed")
  else {
    seed("live")
    readPath(programBySlug("spl-memo")!).forEach(() => answerStop("spl-memo"))
  }
  const record = programBySlug("spl-record")!
  set({ ...state, projects: { ...state.projects, [record.name]: ensureLive(post(makeFromProgram(record), { k: "intro" })) }, route: { at: "catalog" } })
  if (!state.native) {
    answerStop(record.name)
    answerStop(record.name)
  }
}
