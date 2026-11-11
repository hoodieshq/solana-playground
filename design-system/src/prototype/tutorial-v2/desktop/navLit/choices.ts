import { useEffect, useState } from "react"

import type { Health, StatusRow } from "../../navStates"

/** What the learner picked in the Status popover's Change: the network and the assistant's model. Kept
 * in this browser, laid over whatever nav state the prototype shows */
/** `picked` is a network chosen on purpose, which finishes setup's network step. `rpcs` are the custom
 * RPCs saved in Settings (`network` names one by its URL), each with the name its owner gave it,
 * if any; `key` is whose API key is in use */
export type Rpc = { url: string; name?: string }
export type Choices = { network: string; model: string; connected: boolean; picked: boolean; rpcs: Rpc[]; key?: string }

const KEY = "pg-proto-nav-choices"
const DEFAULTS: Choices = { network: "Devnet", model: "GLM 5.3 Flash", connected: false, picked: false, rpcs: [] }
const EVENT = "pg-proto-nav-choices"

const read = (): Choices => {
  try {
    const c: Choices = { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") }
    // Picks stored before Settings: "Mainnet Beta" is "Mainnet" now, and the Claude list was fiction
    if (c.network === "Mainnet Beta") c.network = "Mainnet"
    // A pick stored as a chip's label, or of an RPC since removed, falls back to Devnet
    if (!NETWORKS.some((n) => n.name === c.network) && !c.rpcs.some((r) => r.url === c.network)) c.network = DEFAULTS.network
    if (!c.key && !MODELS.some((m) => m.name === c.model)) c.model = DEFAULTS.model
    return c
  } catch {
    return DEFAULTS
  }
}

export function setChoices(c: Partial<Choices>) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...read(), ...c }))
  } catch {
    // Storage off: the pick lasts until the page reloads
  }
  window.dispatchEvent(new Event(EVENT))
}

export function useChoices() {
  const [c, setC] = useState(read)
  useEffect(() => {
    const update = () => setC(read())
    window.addEventListener(EVENT, update)
    window.addEventListener("storage", update)
    return () => {
      window.removeEventListener(EVENT, update)
      window.removeEventListener("storage", update)
    }
  }, [])
  return c
}

export type Network = { id?: string; name: string; hint: string; warn?: boolean; local?: boolean; url?: string }

/** Free networks first, so a thumb and Tab land on them. `local` ones run on your machine, so they only
 * show on the desktop: on a phone or tablet localhost is the device */
export const NETWORKS: Network[] = [
  { name: "Devnet", hint: "Free test SOL. Where lessons run" },
  { name: "Testnet", hint: "Where validators try new releases. Free SOL too" },
  { name: "Localnet", hint: "A validator on your machine, at localhost:8899", local: true },
  { name: "Surfpool", hint: "Surfnet on your machine, at localhost:8899", local: true },
  { name: "Mainnet", hint: "Real SOL: every deploy and fee costs money", warn: true },
]

/** The product's one built in model; your own key comes after it */
export const MODELS = [{ name: "GLM 5.3 Flash", hint: "Built in. No key needed" }]

/** An RPC's URL with its API key hidden: the dots already say a key is inside */
export const maskUrl = (url: string) => url.replace(/([?&]api-key=)[^&#]*/i, "$1••••")

const hostOf = (url: string) => {
  try {
    return new URL(url).host.replace(/^www\./, "")
  } catch {
    return url
  }
}

/** A saved RPC's word: the name it was given, else its whole host, subdomain and all, since two RPCs
 * of one provider differ only there (Sergey, 11 Nov) */
export const rpcLabel = (url: string, rpcs: Rpc[]) => rpcs.find((r) => r.url === url)?.name || hostOf(url)

/** The networks a view offers, then the saved RPCs. `id` is what `network` keeps: a network's name, a
 * saved RPC's URL, so two RPCs with one name are still two */
export function networksFor(view: string, c: Choices): Network[] {
  const own = NETWORKS.filter((n) => !n.local || view === "desktop")
  const rpcs = c.rpcs.map((r) => ({ id: r.url, name: rpcLabel(r.url, c.rpcs), hint: maskUrl(r.url), url: r.url, warn: /mainnet/i.test(r.url) || undefined }))
  return [...own, ...rpcs]
}

/** The picked network's word: its name, or the saved RPC's */
export const networkWord = (c: Choices) => (c.rpcs.some((r) => r.url === c.network) ? rpcLabel(c.network, c.rpcs) : c.network)

/** Where real SOL is spent: Mainnet, or a saved RPC whose URL says mainnet */
export const isMainnet = (c: Choices) => c.network === "Mainnet" || (c.rpcs.some((r) => r.url === c.network) && /mainnet/i.test(c.network))

/** The state's rows with the picks laid over the healthy ones: a network that answers shows the one
 * picked (amber on Mainnet, where SOL is real), an assistant that's on shows its model, and one that was
 * off shows the model once connected */
export function withChoices(rows: StatusRow[], c: Choices): StatusRow[] {
  return rows.map((r) => {
    if (r.name === "Network" && r.dot === "success") return { ...r, value: networkWord(c), dot: isMainnet(c) ? "warning" : "success" }
    if (r.name === "Assistant" && r.dot === "success") return { ...r, value: c.model }
    if (r.name === "Assistant" && r.value === "Off" && c.connected) return { ...r, value: c.model, dot: "success", actions: ["Change"] }
    return r
  })
}

/** The chip's word follows the network picked, while the network is the thing it names. Real SOL turns
 * it amber, as the popover's row is */
export const healthWith = (h: Health, c: Choices): Health =>
  h.word !== "Devnet" ? h : isMainnet(c) ? { tone: "attention", word: networkWord(c), tip: `${networkWord(c)}: deploys cost real SOL` } : { ...h, word: networkWord(c) }
