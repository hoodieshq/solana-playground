import { rpcLabel, setChoices, type Choices } from "../desktop/navLit/choices"
import { NAV_STATES, setNavState, type NavStateId } from "../navStates"
import { isSettingsState, PICK_KEY, setSettingsState, STATE_KEY, type SettingsState } from "./design"
import type { Section } from "./open"
import { clearSettings } from "./store"
import { clearTheme } from "./theme"
import type { FieldStatus } from "./UrlField"

/* The bar's Settings states (CONSENSUS section 6): what each seeds in the shared stores, here, in the
   window whose bar was used, and the scene the layer then opens on, in the window that draws the app.
   A framed tablet hears the seeds through storage */

const HELIUS = "https://devnet.helius-rpc.com/?api-key=demo"
const ALCHEMY = "https://solana-devnet.g.alchemy.com/v2/demo"

/** What the open page starts with; the person clicks on from there */
export type Scene = {
  section?: Section
  rpcForm?: boolean
  advanced?: boolean
  field?: { value: string; status: FieldStatus; hold?: boolean }
  /** Just removed, held while the state is picked so it can be looked at */
  removed?: { url: string; label: string }
  notAnswering?: boolean
  confirmDelete?: boolean
  confirmAccountDelete?: boolean
}

export const SCENES: Partial<Record<SettingsState, Scene>> = {
  advanced: { advanced: true },
  "rpc-form": { section: "network", rpcForm: true },
  "rpc-invalid": { section: "network", field: { value: "helius devnet", status: "invalid" } },
  "rpc-checking": { section: "network", field: { value: HELIUS, status: "checking", hold: true } },
  "rpc-unreachable": { section: "network", field: { value: "https://rpc.down.example.com", status: "down" } },
  "rpc-offline": { section: "network", field: { value: HELIUS, status: "offline" } },
  "rpc-saved": { section: "network" },
  "rpc-removed": { section: "network", removed: { url: HELIUS, label: rpcLabel(HELIUS, [{ url: HELIUS }]) } },
  "not-answering": { notAnswering: true },
  "key-delete": { confirmDelete: true },
  "account-delete": { section: "account", confirmAccountDelete: true },
}

let navNow: NavStateId = "first-visit"
try {
  const v = localStorage.getItem("pg-proto-nav-state")
  if (v && v in NAV_STATES) navNow = v as NavStateId
} catch {
  // Storage off: the default stands
}

/** A nav state that would hide the row a state is about (offline, the AI limit) gives way to all set */
const nav = (id: NavStateId) => {
  navNow = id
  setNavState(id)
}
const leaveTrouble = () => {
  if (navNow === "offline" || navNow === "ai-limit" || navNow === "loading") nav("all-set")
}

const BUILT_IN: Partial<Choices> = { model: "GLM 5.3 Flash", key: undefined }
const OWN_KEY: Partial<Choices> = { model: "Opus 5.5 · Anthropic", key: "Anthropic", connected: true }
const NO_RPCS: Partial<Choices> = { network: "Devnet", rpcs: [] }

function seed(id: SettingsState) {
  switch (id) {
    case "mainnet":
      setChoices({ network: "Mainnet", picked: true })
      break
    case "rpc-form":
    case "rpc-invalid":
    case "rpc-checking":
    case "rpc-unreachable":
      leaveTrouble()
      setChoices(NO_RPCS)
      break
    case "rpc-offline":
      nav("offline")
      setChoices(NO_RPCS)
      break
    case "rpc-saved":
      leaveTrouble()
      setChoices({ rpcs: [{ url: HELIUS }, { url: ALCHEMY }], network: rpcLabel(HELIUS, [{ url: HELIUS }, { url: ALCHEMY }]), picked: true })
      break
    case "rpc-removed":
      leaveTrouble()
      setChoices({ rpcs: [{ url: ALCHEMY }], network: "Devnet" })
      break
    case "assistant-off":
      nav("first-visit")
      setChoices({ ...BUILT_IN, connected: false })
      break
    case "limit":
      nav("ai-limit")
      setChoices(BUILT_IN)
      break
    case "not-answering":
      leaveTrouble()
      setChoices({ ...BUILT_IN, connected: true })
      break
    case "account-delete":
      nav("all-set")
      break
    case "own-key":
    case "key-delete":
      leaveTrouble()
      setChoices(OWN_KEY)
      break
  }
}

/** A pick in the bar: seeds the stores, then tells the layer, here or in the frame, to set it up */
export function applySettingsState(id: SettingsState) {
  seed(id)
  setSettingsState(id, true)
}

/** The bar's Reset: Dark, Devnet, GLM 5.3 Flash, no RPCs, Settings closed */
export function resetSettings() {
  try {
    ;[STATE_KEY, PICK_KEY, "pg-proto-nav-choices"].forEach((k) => localStorage.removeItem(k))
  } catch {
    // Nothing stored
  }
  clearSettings()
  clearTheme()
}

// The address wins on load: ?settings=<state> seeds it before the frame or the layer reads anything
const asked = new URLSearchParams(location.search).get("settings")
if (isSettingsState(asked)) {
  seed(asked)
  setSettingsState(asked)
}
