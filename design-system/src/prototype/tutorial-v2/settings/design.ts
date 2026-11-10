import { useEffect, useState } from "react"

/* Which Settings state the prototype bar put Oak in, in localStorage so the tablet's frame follows the
   bar. A pick also stamps oak.settingsPick, so picking the same state again sets it up again. On load
   ?settings=<state> wins (bar.ts seeds it), as programs/design.ts does */

export const SETTINGS_STATES = {
  closed: "Closed",
  open: "Open",
  advanced: "Advanced open",
  mainnet: "Mainnet",
  "rpc-form": "Custom: field open",
  "rpc-invalid": "Custom: not a URL",
  "rpc-checking": "Custom: checking",
  "rpc-unreachable": "Custom: no answer",
  "rpc-offline": "Custom: offline",
  "rpc-saved": "Custom: saved",
  "rpc-removed": "Custom: removed",
  "assistant-off": "Assistant off",
  limit: "AI limit",
  "not-answering": "Not answering",
  "own-key": "Own key",
  "key-delete": "Delete key",
  "account-delete": "Delete account",
  shortcuts: "Shortcuts overlay",
} as const

export type SettingsState = keyof typeof SETTINGS_STATES

export const STATE_KEY = "oak.settingsState"
export const PICK_KEY = "oak.settingsPick"
const EVENT = "oak.settings-state"

export const isSettingsState = (v: string | null): v is SettingsState => !!v && v in SETTINGS_STATES

export function readSettingsState(): SettingsState {
  try {
    const v = localStorage.getItem(STATE_KEY)
    return isSettingsState(v) ? v : "closed"
  } catch {
    return "closed"
  }
}

/** `pick` stamps the pick, so the layer sets the state up again even when it's the one already picked */
export function setSettingsState(id: SettingsState, pick = false) {
  try {
    localStorage.setItem(STATE_KEY, id)
    if (pick) localStorage.setItem(PICK_KEY, String(Date.now()))
  } catch {
    // Storage off: the pick lasts in this window only
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { id, pick } }))
}

/** Listens for bar picks: this window's event, the frame's storage */
export function onSettingsPick(fn: () => void) {
  const local = (e: Event) => (e as CustomEvent<{ pick: boolean }>).detail?.pick && fn()
  const storage = (e: StorageEvent) => (e.key === PICK_KEY || e.key === null) && fn()
  window.addEventListener(EVENT, local)
  window.addEventListener("storage", storage)
  return () => {
    window.removeEventListener(EVENT, local)
    window.removeEventListener("storage", storage)
  }
}

export function useSettingsState() {
  const [v, setV] = useState(readSettingsState)
  useEffect(() => {
    const sync = () => setV(readSettingsState())
    window.addEventListener(EVENT, sync)
    window.addEventListener("storage", sync)
    return () => {
      window.removeEventListener(EVENT, sync)
      window.removeEventListener("storage", sync)
    }
  }, [])
  return v
}
