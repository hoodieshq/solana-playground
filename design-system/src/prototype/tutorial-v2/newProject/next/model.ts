import { useNavState } from "../../navStates"
import type { Source } from "../../programs/project"
import { usePrograms } from "../../programs/store"
import { BASICS, frameworkOf, SAMPLE_PROGRAMS, SAMPLE_REPO, type FrameworkId, type RepoProgram } from "./data"

/* First Light's state (CONSENSUS.md, 4.1), its reducer, and what is derived from it: the name rule,
   the default name, the primary's label. The dialog and the phone page share all of it */

export type { Source }

export type ImportProblem = "not-found" | "not-found-signed-in" | "private" | "no-program" | "rate-limited" | "too-large" | "broke"

/** Where a copy stands: the checklist's step, and files loaded of total */
export type Fetching = { url: string; step: 0 | 1 | 2 | 3; loaded?: number; total?: number; found?: number; program?: RepoProgram }

export type ImportState =
  | { state: "empty" }
  | { state: "typed"; url: string }
  | ({ state: "fetching" } & Fetching)
  | { state: "choose"; url: string; programs: RepoProgram[]; picked?: string }
  | { state: "failed"; url: string; kind: ImportProblem; at: 0 | 1 | 2; loaded?: number; details: boolean }

export type Run =
  | { state: "idle" }
  // `copy` is set while a catalog program downloads: the panel shows its checklist
  | { state: "creating"; copy?: { step: 0 | 1 | 2; loaded: number } }
  | { state: "failed"; error: string; details: boolean }

export type FirstLightState = {
  source: Source
  framework: FrameworkId
  name: { value: string; touched: boolean }
  run: Run
  examples: { programs: "loading" | "ready" | "failed"; query: string; picked?: string }
  import: ImportState
  describe: { text: string }
  into?: string
}

export const INITIAL: FirstLightState = {
  source: "starter",
  framework: "anchor",
  name: { value: "", touched: false },
  run: { state: "idle" },
  examples: { programs: "loading", query: "" },
  import: { state: "empty" },
  describe: { text: "" },
}

export type Action =
  | { type: "source"; source: Source }
  | { type: "framework"; framework: FrameworkId }
  | { type: "name"; value: string }
  | { type: "run"; run: Run }
  | { type: "details" }
  | { type: "examples"; patch: Partial<FirstLightState["examples"]> }
  | { type: "import"; import: ImportState }
  | { type: "describe"; patch: Partial<FirstLightState["describe"]> }
  | { type: "into"; into?: string }

export function reducer(s: FirstLightState, a: Action): FirstLightState {
  switch (a.type) {
    case "source":
      return { ...s, source: a.source, run: s.run.state === "failed" ? { state: "idle" } : s.run }
    case "framework":
      return { ...s, framework: a.framework }
    case "name":
      return { ...s, name: { value: a.value, touched: true } }
    case "run":
      return { ...s, run: a.run }
    case "details":
      if (s.run.state === "failed") return { ...s, run: { ...s.run, details: !s.run.details } }
      if (s.import.state === "failed") return { ...s, import: { ...s.import, details: !s.import.details } }
      return s
    case "examples":
      return { ...s, examples: { ...s.examples, ...a.patch } }
    case "import":
      return { ...s, import: a.import }
    case "describe":
      return { ...s, describe: { ...s.describe, ...a.patch } }
    case "into":
      return { ...s, into: a.into }
  }
}

// ----- The environment, read from the nav state (5.4) ---------------------------------------------

export type Env = {
  online: boolean
  account: "out" | "in" | "ended"
  assistant: "ready" | "off" | "limit"
  /** Every name a new project can't take, lower case */
  names: string[]
}

/** The names Oak always has, and the ones made in this window (the shell keeps the ones it holds) */
const BASE_NAMES = ["anchor-project", "counter", "token-faucet", "voting"]
const made = new Set<string>()
export const remember = (name: string) => made.add(name.toLowerCase())

export function useEnv(): Env {
  const [id, nav] = useNavState()
  const session = nav.account?.session
  const assistantDot = nav.statusRows?.find((r) => r.name === "Assistant")?.dot
  const projects = Array.isArray(nav.projects) ? nav.projects.map((p) => p.name) : []
  const shell = usePrograms((s) => s.projects)
  return {
    online: id !== "offline",
    account: session === "in" || session === "offline" ? "in" : session === "ended" ? "ended" : "out",
    assistant: assistantDot === "idle" ? "off" : id === "ai-limit" ? "limit" : "ready",
    names: [...new Set([...BASE_NAMES, ...projects, ...made, ...Object.values(shell).map((p) => p.name)].map((n) => n.toLowerCase()))],
  }
}

// ----- Names (3.9) ---------------------------------------------------------------------------------

/** What `PgExplorer.isWorkspaceNameValid` lets through */
export const isNameValid = (name: string) => /^(?!\s)[\w\s-]+$/.test(name)

export const isTaken = (name: string, env: Env) => env.names.includes(name.trim().toLowerCase())

/** The first free of base, base-2, base-3... */
export function freeName(base: string, env: Env) {
  if (!isTaken(base, env)) return base
  for (let n = 2; ; n++) if (!isTaken(`${base}-${n}`, env)) return `${base}-${n}`
}

const GITHUB = /^https:\/\/(gist\.)?github\.com\/[\w.-]+\/[\w.-]+/

export const isGithubLink = (url: string) => GITHUB.test(url.trim())

/** owner/repo from a link */
export const repoOf = (url: string) => url.trim().replace(/^https:\/\/(gist\.)?github\.com\//, "").split("/").slice(0, 2).join("/")

/** The program a link points at: a known folder of the sample repo, else the last segment that isn't
 * a framework's word */
export function programOfLink(url: string): RepoProgram | undefined {
  const clean = url.trim().replace(/\/+$/, "")
  const known = SAMPLE_PROGRAMS.find((p) => clean.endsWith(`/${p.path}`))
  if (known) return known
  if (!isGithubLink(clean) || clean.split("/").length <= 5) return undefined
  const parts = clean.split("/").filter((p) => !["anchor", "native", "seahorse"].includes(p))
  return { path: "", name: parts[parts.length - 1], framework: "anchor", readme: true }
}

/** What a link would fetch, in Oak: the sample repo's root has three programs; a few made up repos
 * fail the way the product's would */
export function fakeRepo(url: string, env: Env): { programs: RepoProgram[] } | { problem: ImportProblem; at: 0 | 1 | 2 } {
  const repo = repoOf(url)
  if (repo === "acme/escrow-suite") return { problem: env.account === "in" ? "not-found-signed-in" : "not-found", at: 0 }
  if (repo === "acme/private-vault") return { problem: env.account === "in" ? "private" : "not-found", at: 0 }
  if (repo === "acme/website") return { problem: "no-program", at: 1 }
  if (repo === "solana-labs/solana-program-library") return { problem: "too-large", at: 1 }
  if (url.trim().replace(/\/+$/, "") === SAMPLE_REPO) return { programs: SAMPLE_PROGRAMS }
  const one = programOfLink(url)
  return one ? { programs: [one] } : { problem: "no-program", at: 1 }
}

/** The program Import is on: the one fetched, the one picked, or the one the link names */
function importProgram(s: FirstLightState): RepoProgram | undefined {
  const i = s.import
  if (i.state === "fetching") return i.program
  if (i.state === "choose") return i.programs.find((p) => p.name === i.picked)
  if (i.state === "typed" || i.state === "failed") return isGithubLink(i.url) ? programOfLink(i.url) : undefined
  return undefined
}

/** The name the field holds untouched, and Create uses when it is cleared. Empty: nothing to name yet */
export function defaultName(s: FirstLightState, env: Env): string {
  if (s.source === "starter" || s.source === "describe") return freeName(frameworkOf(s.framework).base, env)
  if (s.source === "example") return s.examples.picked ? freeName(s.examples.picked, env) : ""
  const p = importProgram(s)
  return p ? freeName(p.name, env) : ""
}

export type NameCheck = { kind: "helper" } | { kind: "invalid" } | { kind: "taken"; name: string; free: string }

export function checkName(s: FirstLightState, env: Env): NameCheck {
  const v = s.name.value.trim()
  if (!s.name.touched || !v || s.into) return { kind: "helper" }
  if (!isNameValid(v)) return { kind: "invalid" }
  if (isTaken(v, env)) return { kind: "taken", name: v, free: freeName(v, env) }
  return { kind: "helper" }
}

/** The name Create makes */
export const finalName = (s: FirstLightState, env: Env) => (s.name.touched && s.name.value.trim() ? s.name.value.trim() : defaultName(s, env))

// ----- The primary (3.9) ---------------------------------------------------------------------------

export const describeUnavailable = (env: Env) => !env.online || env.assistant !== "ready"

export function primary(s: FirstLightState, env: Env): { label: string; enabled: boolean } {
  const nameOk = checkName(s, env).kind === "helper"
  if (s.import.state === "fetching" && s.source === "import") return { label: "Importing…", enabled: false }
  if (s.run.state === "creating") return { label: "Creating…", enabled: false }
  if (s.into) return { label: `Add ${frameworkOf(s.framework).word} starter`, enabled: true }
  switch (s.source) {
    case "starter":
      return { label: `Create ${frameworkOf(s.framework).word} project`, enabled: nameOk }
    case "example": {
      const picked = s.examples.picked
      if (!picked) return { label: "Pick an example", enabled: false }
      const isProgram = !BASICS.some((b) => b.slug === picked)
      return { label: `Create from ${picked}`, enabled: nameOk && (env.online || !isProgram) }
    }
    case "describe":
      if (!s.describe.text.trim()) return { label: "Write a description", enabled: false }
      return { label: "Create and send to assistant", enabled: nameOk && !describeUnavailable(env) }
    case "import": {
      const i = s.import
      if (!env.online || i.state === "empty") return { label: "Paste a repo link", enabled: false }
      if (i.state === "choose") {
        return i.picked ? { label: `Import ${i.picked}`, enabled: nameOk } : { label: "Pick a program", enabled: false }
      }
      if (i.state === "typed" && !isGithubLink(i.url)) return { label: "Paste a repo link", enabled: false }
      if (i.state === "failed" && i.kind === "rate-limited") return { label: "Import", enabled: false }
      return { label: "Import", enabled: nameOk }
    }
  }
}

export const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
