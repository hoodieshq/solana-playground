/* How Settings and the shortcuts overlay open from anywhere: the account menu, ⌘K, the Status popover's
   Add custom RPC, the lesson's ⋯. The request waits here until the layer reads it, as newProject/next/open.ts
   does. Kept apart from the layer itself, so the nav can import it without pulling the page in */

export type Section = "top" | "assistant" | "network" | "advanced" | "account"
export type Request = { section?: Section; rpcForm?: boolean }

const bus = new EventTarget()
let pending: Request = {}
let opener: HTMLElement | null = null

/** Where the focus goes back to on close. A menu item goes with its menu, so a pick from a menu hands
 * back to the button that opened the menu */
function findOpener(): HTMLElement | null {
  const el = document.activeElement
  if (!(el instanceof HTMLElement) || el === document.body) return null
  const menu = el.closest<HTMLElement>('[role="menu"]')
  if (!menu?.id) return el
  return document.querySelector<HTMLElement>(`[aria-controls="${menu.id}"]`)
}

export function openSettings(request: Request = {}) {
  pending = request
  opener = findOpener()
  bus.dispatchEvent(new Event("settings"))
}

/** The request the last opening made, once */
export function takeRequest(): Request {
  const r = pending
  pending = {}
  return r
}

/** Whoever opened Settings last, while it's still on the page */
export const takeOpener = () => {
  const el = opener
  opener = null
  return el?.isConnected ? el : null
}

export const openShortcuts = () => {
  opener = findOpener()
  bus.dispatchEvent(new Event("shortcuts"))
}

export function onOpen(name: "settings" | "shortcuts", fn: () => void) {
  bus.addEventListener(name, fn)
  return () => bus.removeEventListener(name, fn)
}

/** Words ⌘K's Open settings answers to, and the group each opens at */
const WORDS: Record<Section, string[]> = {
  top: ["wrap"],
  assistant: ["model", "key", "assistant"],
  network: ["network", "devnet", "testnet", "mainnet", "localnet", "surfpool", "rpc", "airdrop"],
  advanced: ["commitment", "fee", "preflight", "explorer", "server", "vim"],
  account: ["account", "delete my"],
}

export const SETTINGS_KEYWORDS = Object.values(WORDS).flat()

/** The group a search names, by the first word it starts: "main" opens at Network */
export function sectionFor(query: string): Section | undefined {
  const q = query.trim().toLowerCase()
  if (!q) return undefined
  return (Object.keys(WORDS) as Section[]).find((s) => WORDS[s].some((w) => w.includes(q) || q.includes(w)))
}
