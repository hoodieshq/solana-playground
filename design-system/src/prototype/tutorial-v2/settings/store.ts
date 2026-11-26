import { useEffect, useState } from "react"

import { view } from "../view"

/* Settings' own values, in oak.settings. Network, model and RPCs live in choices.ts with the Status
   popover, and the theme in theme.ts. In Oak only word wrap changes what is drawn; the Advanced values
   are stored and read back. Storage off is silent: the values last in memory until the page reloads */

export type Settings = {
  /** Unset until the person sets it: then it follows the view */
  wordWrap?: boolean
  airdrop: boolean
  commitment: string
  priorityFee: string
  priorityFeeCustom: string
  preflight: boolean
  explorer: string
  txLink: boolean
  txDetails: boolean
  shorterErrors: boolean
  buildServer: string
  buildServerUrl: string
  vim: boolean
  /** Sole, the cat on the assistant's field (ui/RoofCat): this one is Settings' switch, and says whether the cat's
   * icon is under the field at all */
  sole: boolean
  /** Whether the cat sits on the field, as its icon under the field last left it (Almaz, 26 Nov) */
  soleOn: boolean
}

const KEY = "oak.settings"
const EVENT = "oak.settings"

const DEFAULTS: Settings = {
  airdrop: true,
  commitment: "Confirmed",
  priorityFee: "Median",
  priorityFeeCustom: "",
  preflight: true,
  explorer: "Solana Explorer",
  txLink: true,
  txDetails: false,
  shorterErrors: true,
  buildServer: "Foundation server",
  buildServerUrl: "",
  vim: false,
  sole: true,
  soleOn: true,
}

/** Whole lines on a 375 screen are the one Settings job a learner has, so the phone's screens wrap */
export const WRAP_DEFAULT = view === "phone" || view === "portrait"

let memory: Partial<Settings> = {}

export function readSettings(): Settings & { wordWrap: boolean } {
  let stored: Partial<Settings> = memory
  try {
    stored = { ...JSON.parse(localStorage.getItem(KEY) ?? "{}"), ...memory }
  } catch {
    // Storage off: what was set in this window
  }
  const s = { ...DEFAULTS, ...stored }
  return { ...s, wordWrap: s.wordWrap ?? WRAP_DEFAULT }
}

export function setSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
  memory = { ...memory, [key]: value }
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...JSON.parse(localStorage.getItem(KEY) ?? "{}"), [key]: value }))
    memory = {}
  } catch {
    // Storage off: kept in memory above
  }
  window.dispatchEvent(new Event(EVENT))
}

/** The cat is on the field while its icon is there and was left on */
export const catShown = (s: Settings) => s.sole && s.soleOn

/** Settings' switch: off takes the icon away with the cat, on brings both back */
export function setSole(on: boolean) {
  setSetting("sole", on)
  if (on) setSetting("soleOn", true)
}

/** The icon under the field, or asking: hiding keeps the icon, bringing the cat back brings its icon too */
export function setCatShown(on: boolean) {
  if (on) setSole(true)
  else setSetting("soleOn", false)
}

/** Listens for changes, this window's and the tablet frame's */
export function onSettings(fn: () => void) {
  const storage = (e: StorageEvent) => (e.key === KEY || e.key === null) && fn()
  window.addEventListener(EVENT, fn)
  window.addEventListener("storage", storage)
  return () => {
    window.removeEventListener(EVENT, fn)
    window.removeEventListener("storage", storage)
  }
}

export function useSettings() {
  const [s, setS] = useState(readSettings)
  useEffect(() => onSettings(() => setS(readSettings())), [])
  return s
}

export const clearSettings = () => {
  memory = {}
  try {
    localStorage.removeItem(KEY)
  } catch {
    // Nothing stored
  }
  window.dispatchEvent(new Event(EVENT))
}
