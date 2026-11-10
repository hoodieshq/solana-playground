import { toast } from "sonner"

import { shortKey } from "../../../lessons/common"
import { MAIN_FILE } from "../../data"
import { STARTERS } from "../../starters"
import { ask, behind, busy, deploy, hashFiles, liveAction, liveTurn, onChain, refCall, retryDeploy, runLive, stale, type Project, type StepId, type Turn } from "../../store"

export { shortKey }

/* What the shell's parts work out from a project, kept apart from the drawing */

export const FAUCET_URL = "https://faucet.solana.com"

export const baseName = (file: string) => file.split("/").pop() ?? file

/** The file a project lands on: a catalog program's processor, a starter's own */
export const mainFile = (p: Project) => (p.source === "example" || p.slug ? MAIN_FILE : STARTERS[p.framework].main)

export function copyText(value: string, what: string) {
  navigator.clipboard
    ?.writeText(value)
    .then(() => toast(`${what} copied`))
    .catch(() => toast(`Couldn't copy the ${what.toLowerCase()}`))
}

/** The files that moved since what the code is measured against: the deploy once there is one, else
 * the last good build */
export function changedFiles(p: Project): string[] {
  const ref = onChain(p) ? p.deployed : p.build.s === "ok" ? p.built : undefined
  if (!ref || !(behind(p) || stale(p))) return []
  return Object.keys(p.files).filter((f) => !f.endsWith(".md") && p.files[f] !== ref[f])
}

export const firstChanged = (p: Project) => changedFiles(p)[0] ?? p.open

/** Which step a turn belongs to, for the strip's jumps */
export function stepOf(t: Turn): StepId | null {
  switch (t.k) {
    case "build-ok":
    case "build-fail":
      return "build"
    case "deploy-ok":
    case "deploy-fail":
      return "deploy"
    case "call-ok":
    case "call-fail":
    case "run-ok":
    case "milestone":
      return "call"
    case "stop":
      return t.stop
    case "act":
      // A TS client's one step, Run, takes the strip's first slot
      if (t.act === "overview" || t.act === "instructions" || t.act === "accounts") return t.act
      return t.act === "build" || t.act === "run" ? "build" : t.act === "deploy" || t.act === "upgrade" ? "deploy" : "call"
    default:
      return null
  }
}

const RESULTS = new Set(["build-ok", "build-fail", "deploy-ok", "deploy-fail", "call-ok", "call-fail", "run-ok"])

/** The latest finished run in the feed */
export const lastResult = (p: Project) => [...p.feed].reverse().find((t) => RESULTS.has(t.k))

/** A failure card is live while nothing has moved past it: the build still failed on this code, or
 * the deploy still waits on Try again. Then it holds the step's buttons */
export function failLive(p: Project, t: Turn) {
  if (t.k === "build-fail") {
    const last = [...p.feed].reverse().find((x) => x.k === "build-fail")
    return last === t && t.kind === "compile" && p.build.s === "failed" && p.build.src === hashFiles(p.files) && !busy(p)
  }
  if (t.k === "deploy-fail") {
    const last = [...p.feed].reverse().find((x) => x.k === "deploy-fail")
    return last === t && !!p.deployFailed && !busy(p)
  }
  return false
}

/** Whether a turn is the feed's last, so its buttons may be the one primary */
export const isLast = (p: Project, t: Turn) => p.feed[p.feed.length - 1] === t

/** What ⌘↵ does now: the live card's action, or the live failure's first button */
export function runPrimary(id: string, p: Project) {
  if (busy(p)) return
  if (liveAction(p) && liveTurn(p)) return runLive(id)
  // Read mode: the failed call's Try again
  if (p.read) return lastResult(p)?.k === "call-fail" ? refCall(id) : undefined
  const fail = [...p.feed].reverse().find((t) => failLive(p, t))
  if (fail?.k === "build-fail") ask(id, "Explain the error")
  else if (fail?.k === "deploy-fail") retryDeploy(id)
  else if (liveAction(p)) runLive(id)
  else if (onChain(p) && behind(p)) deploy(id)
}

/** The console strip's words and dot for where the project is (ux-architecture.md 3.6.6) */
export function statusOf(p: Project): { dot: "idle" | "running" | "success" | "warning" | "error"; text: string } {
  if (p.build.s === "running") return { dot: "running", text: p.build.slow ? `Still compiling ${p.name}` : `Compiling ${p.name}` }
  if (p.deploy.s === "running") return { dot: "running", text: `Deploying · ${p.deploy.stages[p.deploy.stage]}` }
  if (p.calling) return { dot: "running", text: p.calling.ix === "client.ts" ? "Running client.ts" : p.read ? `Calling ${p.calling.ix} on devnet` : `Calling ${p.calling.ix}` }
  if (p.read) {
    const r = lastResult(p)
    return r?.k === "call-ok" ? { dot: "success", text: `Confirmed · ${r.ix}` } : r?.k === "call-fail" ? { dot: "error", text: r.kind === "faucet" ? "Call failed · the faucet is at its limit" : "Call failed · devnet didn't answer" } : { dot: "idle", text: "Ready · Devnet" }
  }
  const src = hashFiles(p.files)
  if (p.framework === "ts-client" && p.ranSrc && p.ranSrc !== src) return { dot: "warning", text: "client.ts changed since the last run" }
  if (behind(p)) return { dot: "warning", text: `${baseName(firstChanged(p))} changed since the last deploy` }
  if (stale(p)) return { dot: "warning", text: `${baseName(firstChanged(p))} changed since the last build` }
  if (p.build.s === "failed" && p.build.src !== src) return { dot: "warning", text: "Code changed since the failed build" }
  const r = lastResult(p)
  if (!r) return { dot: "idle", text: "Ready · Devnet" }
  switch (r.k) {
    case "build-ok":
      return { dot: "success", text: `Build successful · IDL: ${r.ixs} ${r.ixs === 1 ? "instruction" : "instructions"}` }
    case "build-fail":
      return r.kind === "compile" ? { dot: "error", text: `Build failed · line ${r.line}` } : { dot: "error", text: "Build didn't start · the build server didn't answer" }
    case "deploy-ok":
      return r.upgrade ? { dot: "success", text: `Upgraded · ${shortKey(r.programId)}` } : { dot: "success", text: `Deployed · ${r.cost} devnet SOL from your wallet` }
    case "deploy-fail":
      return r.kind === "faucet" ? { dot: "error", text: "Not enough devnet SOL · the faucet is at its limit" } : { dot: "error", text: `Deploy failed · devnet stopped answering at ${r.stage.toLowerCase()}` }
    case "call-ok":
      return { dot: "success", text: `Confirmed · ${r.ix}` }
    case "call-fail":
      return { dot: "error", text: `Call failed · ${r.error}` }
    case "run-ok":
      return { dot: "success", text: "Ran client.ts · confirmed" }
    default:
      return { dot: "idle", text: "Ready · Devnet" }
  }
}

/** "just now", "4 min ago", "2 h ago", "3 days ago" */
export function ago(at: number) {
  const s = Math.max(0, Math.round((Date.now() - at) / 1000))
  if (s < 60) return "just now"
  const m = Math.round(s / 60)
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} h ago`
  const d = Math.round(h / 24)
  return `${d} ${d === 1 ? "day" : "days"} ago`
}

/* Messages between the shell's parts that share no React state: a line to show in the editor, the
   composer to focus, the feed to scroll to a step */
const bus = new EventTarget()
/** `lit` lights the range from `line` to `to` in the neutral tint until the next one (a line link) */
type Reveal = { file: string; line: number; to?: number; lit?: boolean }
export const reveal = (file: string, line: number, o: { to?: number; lit?: boolean } = {}) => bus.dispatchEvent(new CustomEvent("reveal", { detail: { file, line, ...o } }))
export const onReveal = (fn: (d: Reveal) => void) => {
  const h = (e: Event) => fn((e as CustomEvent).detail)
  bus.addEventListener("reveal", h)
  return () => bus.removeEventListener("reveal", h)
}
export const focusComposer = () => bus.dispatchEvent(new Event("composer"))
export const onFocusComposer = (fn: () => void) => {
  bus.addEventListener("composer", fn)
  return () => bus.removeEventListener("composer", fn)
}
/** The Read only mark flashes: ⌘⇧B, or a keystroke in the read only editor */
export const flashReadOnly = () => bus.dispatchEvent(new Event("read-only"))
export const onFlashReadOnly = (fn: () => void) => {
  bus.addEventListener("read-only", fn)
  return () => bus.removeEventListener("read-only", fn)
}
/** Manage projects, from the quota card and the full notice */
export const openManage = () => bus.dispatchEvent(new Event("manage"))
export const onManage = (fn: () => void) => {
  bus.addEventListener("manage", fn)
  return () => bus.removeEventListener("manage", fn)
}
/** Restarts the flash on an element */
export function flash(el: Element | null) {
  if (!el) return
  el.classList.remove("pg-anchor-flash")
  void (el as HTMLElement).offsetWidth
  el.classList.add("pg-anchor-flash")
}
export const focusEditor = () => requestAnimationFrame(() => document.querySelector<HTMLTextAreaElement>("[data-shell-editor] textarea")?.focus())

/** What the program itself said in a call: its msg! lines, else the runtime's last word */
export const saidLines = (log: string[]) => {
  const said = log.filter((l) => l.startsWith("Program log: ") && !l.startsWith("Program log: Signed by"))
  return said.length ? said : log.slice(-1)
}
