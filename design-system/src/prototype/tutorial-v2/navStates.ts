import { useEffect, useState } from "react"

/* The left nav's states, as client-v2 draws them on scope/interface-2 (widgets/app-nav,
   setup-list, status, session-footer), picked from the prototype bar to compare them side by side.
   "prototype" is the nav as this prototype had it before: its own projects, Devnet, Sign in.
   The choice lives in localStorage, so the tablet's iframe follows the bar too */

export type Dot = "success" | "warning" | "error" | "idle" | "running"

export type ProjectRow = {
  name: string
  lesson?: boolean
  current?: boolean
  pinned?: boolean
  /** Where its work lives when the account doesn't hold it */
  marker?: "This browser" | "Not synced"
  /** A lesson's page, "2 of 4", or done */
  progress?: string | "done"
  /** Lit Path reads a lesson's progress as numbers: the step you're on (lit as you enter it), of how
   * many, and the next step's name for the row's tooltip */
  steps?: { at: number; of: number; next?: string }
}

export type SetupStep = { label: string; state: "todo" | "done" | "warn"; value?: string }

export type Account = {
  primary: string
  line?: string
  tone?: "muted" | "error" | "warning"
  avatar?: string
  cancel?: boolean
  /** Which session the account menu speaks for (Lit Path) */
  session: "out" | "waiting" | "failed" | "in" | "ended" | "offline"
  /** Lit Path's line 2 where it says less than the product's */
  short?: string
}

/** The one health flag Lit Path keeps: quiet while all is well, busy while connecting, amber when
 * something needs you. `word` is what the chip says, `tip` its tooltip */
export type Health = { tone: "quiet" | "busy" | "attention"; word: string; tip: string }

/** A row of the Status popover */
export type StatusRow = { name: string; hint: string; dot: Dot; value: string; actions?: string[] }

export type NavState = {
  label: string
  /** null: the prototype's own list. "loading": three skeleton rows. []: the No projects card */
  projects: ProjectRow[] | "loading" | null
  setup?: { steps: SetupStep[]; folded?: boolean }
  status?: { dot: Dot; words: string }[]
  account?: Account
  /* Lit Path only (research/nav-redesign/CONSENSUS.md, section 7). The current nav reads status */
  health?: Health
  statusRows?: StatusRow[]
  /** Said under the Status popover's rows */
  statusNote?: string
}

const STEPS = ["Connect the assistant", "Choose a network", "Sign in with GitHub", "Connect a wallet"] as const
const setup = (done: number[], extra: Partial<Record<number, SetupStep>> = {}) =>
  STEPS.map((label, i) => extra[i] ?? { label, state: done.includes(i) ? "done" : "todo", value: i === 1 && done.includes(i) ? "devnet" : undefined }) as SetupStep[]

const STATUS_FIRST: NavState["status"] = [
  { dot: "success", words: "Devnet" },
  { dot: "idle", words: "AI · Off" },
  { dot: "idle", words: "Rust" },
]
const STATUS_READY: NavState["status"] = [
  { dot: "success", words: "Devnet" },
  { dot: "success", words: "GLM 5.3 Flash" },
  { dot: "success", words: "Rust · Ready" },
]
const SIGNED_OUT: Account = { primary: "Sign in", line: "Saved in this browser", session: "out" }
const SIGNED_IN: Account = { primary: "Sam Rivera", line: "@samrivera", avatar: "SR", session: "in" }

/* The Status popover's rows: the hint under each name never changes */
const HINTS: Record<string, string> = {
  Network: "Where your programs run. Devnet is free to test on.",
  Assistant: "Answers your questions in lessons and code.",
  "Rust analyzer": "Checks your code as you type.",
}
const row = (name: string, dot: Dot, value: string, actions?: string[]): StatusRow => ({ name, hint: HINTS[name], dot, value, actions })
const ROWS_FIRST = [row("Network", "success", "Devnet", ["Change"]), row("Assistant", "idle", "Off", ["Connect"]), row("Rust analyzer", "idle", "Idle")]
const ROWS_READY = [row("Network", "success", "Devnet", ["Change"]), row("Assistant", "success", "GLM 5.3 Flash", ["Change"]), row("Rust analyzer", "success", "Ready")]
const QUIET_FIRST: Health = { tone: "quiet", word: "Devnet", tip: "Devnet is connected. The assistant is off." }
const QUIET_READY: Health = { tone: "quiet", word: "Devnet", tip: "Everything works. Network: Devnet" }

const PROJECTS: ProjectRow[] = [
  { name: "Hello Anchor", lesson: true, current: true, progress: "2 of 4", steps: { at: 2, of: 4, next: "Build & Deploy" } },
  { name: "token-faucet", pinned: true },
  { name: "Lumberjack", lesson: true, progress: "done" },
  { name: "counter", marker: "This browser" },
  { name: "voting" },
]
/** Signed in, the account holds the work, so no row says where it lives */
const SYNCED = PROJECTS.map((p) => ({ ...p, marker: undefined }))
const MANY: ProjectRow[] = [
  ...SYNCED,
  ...["tip-jar", "escrow", "nft-mint", "staking-pool", "dao-votes", "price-feed", "airdrop", "marketplace", "lottery", "vesting"].map((name) => ({ name })),
]

export const NAV_STATES = {
  prototype: { label: "Prototype nav (as before)", projects: null },
  "first-visit": {
    label: "First visit · no projects",
    projects: [],
    setup: { steps: setup([1]) },
    status: STATUS_FIRST,
    account: SIGNED_OUT,
    health: QUIET_FIRST,
    statusRows: ROWS_FIRST,
  },
  loading: {
    label: "Projects loading",
    projects: "loading",
    setup: { steps: setup([1]) },
    status: [
      { dot: "running", words: "Devnet · Connecting" },
      { dot: "idle", words: "AI · Off" },
      { dot: "running", words: "Rust · Starting 12 s" },
    ],
    account: SIGNED_OUT,
    health: { tone: "busy", word: "Devnet", tip: "Connecting to Devnet" },
    statusRows: [row("Network", "running", "Connecting…"), row("Assistant", "idle", "Off", ["Connect"]), row("Rust analyzer", "running", "Starting · 12 s")],
  },
  returning: {
    label: "Returning · projects, signed out",
    projects: PROJECTS,
    setup: { steps: setup([1]), folded: true },
    status: STATUS_FIRST,
    account: SIGNED_OUT,
    health: QUIET_FIRST,
    statusRows: ROWS_FIRST,
  },
  "lessons-done": {
    label: "Returning · every lesson finished",
    projects: PROJECTS.map((p) => (p.name === "Hello Anchor" ? { ...p, current: false, progress: "done", steps: undefined } : p)),
    setup: { steps: setup([1]), folded: true },
    status: STATUS_FIRST,
    account: SIGNED_OUT,
    health: QUIET_FIRST,
    statusRows: ROWS_FIRST,
  },
  "all-set": {
    label: "Signed in · all set",
    projects: SYNCED,
    status: STATUS_READY,
    account: SIGNED_IN,
    health: QUIET_READY,
    statusRows: ROWS_READY,
  },
  "many-projects": {
    label: "Signed in · many projects",
    projects: MANY,
    status: STATUS_READY,
    account: SIGNED_IN,
    health: QUIET_READY,
    statusRows: ROWS_READY,
  },
  "half-set": {
    label: "Get set up · 3 of 4",
    projects: SYNCED,
    setup: { steps: setup([0, 1, 2]) },
    status: STATUS_READY,
    account: SIGNED_IN,
    health: QUIET_READY,
    statusRows: ROWS_READY,
  },
  "signing-in": {
    label: "Signing in · waiting for GitHub",
    projects: PROJECTS,
    setup: { steps: setup([1]) },
    status: STATUS_FIRST,
    account: { primary: "Sign in", line: "Waiting for GitHub…", cancel: true, session: "waiting" },
    health: QUIET_FIRST,
    statusRows: ROWS_FIRST,
  },
  "sign-in-failed": {
    label: "Sign-in failed",
    projects: PROJECTS,
    setup: { steps: setup([1]) },
    status: STATUS_FIRST,
    account: { primary: "Sign in", line: "Couldn't sign in", tone: "error", session: "failed" },
    health: QUIET_FIRST,
    statusRows: ROWS_FIRST,
  },
  "not-synced": {
    label: "Signed in · a project not synced",
    projects: SYNCED.map((p) => (p.name === "counter" ? { ...p, marker: "Not synced" as const } : p)),
    status: STATUS_READY,
    account: SIGNED_IN,
    health: QUIET_READY,
    statusRows: ROWS_READY,
  },
  "session-ended": {
    label: "Session ended",
    projects: SYNCED,
    status: STATUS_READY,
    account: { primary: "Sam Rivera", line: "Your session ended", tone: "warning", avatar: "SR", session: "ended", short: "Session ended" },
    health: QUIET_READY,
    statusRows: ROWS_READY,
  },
  "network-down": {
    label: "Devnet not responding",
    projects: SYNCED,
    setup: { steps: setup([0, 2], { 1: { label: "Choose a network", state: "warn", value: "devnet" } }) },
    status: [
      { dot: "error", words: "Devnet · Not responding" },
      { dot: "success", words: "GLM 5.3 Flash" },
      { dot: "success", words: "Rust · Ready" },
    ],
    account: SIGNED_IN,
    health: { tone: "attention", word: "Devnet down", tip: "Devnet, the test network, isn't answering" },
    statusRows: [row("Network", "warning", "Not responding", ["Check again", "Change"]), ROWS_READY[1], ROWS_READY[2]],
    statusNote: "You can keep coding. Deploying waits until Devnet is back.",
  },
  "ai-limit": {
    label: "AI limit reached",
    projects: SYNCED,
    status: [
      { dot: "success", words: "Devnet" },
      { dot: "warning", words: "AI · Limit reached" },
      { dot: "success", words: "Rust · Ready" },
    ],
    account: SIGNED_IN,
    health: { tone: "attention", word: "AI limit", tip: "Assistant limit reached. Back at 3:00 PM" },
    statusRows: [ROWS_READY[0], row("Assistant", "warning", "Limit reached · back at 3:00 PM", ["Add API key"]), ROWS_READY[2]],
  },
  offline: {
    label: "Offline",
    projects: SYNCED,
    status: [
      { dot: "warning", words: "Devnet · Offline" },
      { dot: "warning", words: "AI · Offline" },
      { dot: "warning", words: "Rust · Offline" },
    ],
    account: { primary: "Sam Rivera", line: "Offline · saving here", avatar: "SR", session: "offline" },
    health: { tone: "attention", word: "Offline", tip: "No internet connection" },
    statusRows: [row("Network", "warning", "Offline"), row("Assistant", "warning", "Offline"), row("Rust analyzer", "warning", "Offline")],
    statusNote: "Your work saves in this browser and uploads when you're back. Building and deploying need a connection.",
  },
} satisfies Record<string, NavState>

export type NavStateId = keyof typeof NAV_STATES

const KEY = "pg-proto-nav-state"
const EVENT = "pg-proto-nav-state"

/** Which nav draws the states: Lit Path, the redesign (research/nav-redesign/CONSENSUS.md), or the
 * product's current nav. Stored beside the state, so the tablet's iframe follows this one too */
export type NavDesign = "lit" | "current"
const DESIGN_KEY = "pg-proto-nav-design"

const readDesign = (): NavDesign => {
  try {
    return localStorage.getItem(DESIGN_KEY) === "current" ? "current" : "lit"
  } catch {
    return "lit"
  }
}

/** The picked state. Lit Path has no "prototype" nav of its own, so that pick reads as a first visit
 * there; the pick itself stays, and switching back to the current nav finds it */
const read = (): NavStateId => {
  let id: NavStateId = "prototype"
  try {
    const v = localStorage.getItem(KEY)
    if (v && v in NAV_STATES) id = v as NavStateId
  } catch {
    // Storage off: the default stands
  }
  return id === "prototype" && readDesign() === "lit" ? "first-visit" : id
}

export function setNavState(id: NavStateId) {
  try {
    localStorage.setItem(KEY, id)
  } catch {
    // Storage off: the pick lasts in this window only
  }
  window.dispatchEvent(new Event(EVENT))
}

export function setNavDesign(design: NavDesign) {
  try {
    localStorage.setItem(DESIGN_KEY, design)
  } catch {
    // Storage off: the pick lasts in this window only
  }
  window.dispatchEvent(new Event(EVENT))
}

/** Re-reads `get` when the bar picks something: the bar's own window hears its event, the tablet's
 * iframe hears storage */
function usePicked<T>(get: () => T): T {
  const [v, setV] = useState(get)
  useEffect(() => {
    const sync = () => setV(get())
    window.addEventListener(EVENT, sync)
    window.addEventListener("storage", sync)
    return () => {
      window.removeEventListener(EVENT, sync)
      window.removeEventListener("storage", sync)
    }
  }, [get])
  return v
}

/** The picked state */
export function useNavState(): [NavStateId, NavState] {
  const id = usePicked(read)
  return [id, NAV_STATES[id]]
}

/** The picked design */
export const useNavDesign = (): NavDesign => usePicked(readDesign)

