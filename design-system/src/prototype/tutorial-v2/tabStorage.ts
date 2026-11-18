/* Each browser tab keeps its own Oak state (Almaz, 17 Nov: several tabs open at once must not touch each
   other, and Reset clears the flow in the tab it is pressed in, and only there).

   localStorage is one store for every tab of the origin, so a write in one tab reached the others. Here
   every Oak key (pg-proto-*, oak.*) lives in the tab's sessionStorage instead: per tab, kept across
   reloads, and shared with the tab's own frames (the tablet and phone frames still follow the bar).
   Each write is also copied to localStorage under a mirror prefix, and a tab that opens for the first
   time starts from that copy, so a new tab continues from the last state any tab saved. No listener
   reads the mirror keys, so another tab's write is never seen.

   It works by standing in for window.localStorage, so the stores keep calling localStorage as before.
   This module must load before any store: it is the first import of every Oak entry */

const MIRROR = "oak-tab-mirror:"
const SEEDED = "oak-tab-seeded"

const isOak = (key: string) => key.startsWith("pg-proto-") || key.startsWith("oak.")

let real: Storage | null = null
let session: Storage | null = null
try {
  real = window.localStorage
  session = window.sessionStorage
} catch {
  // Storage blocked: the stores already cope with no storage at all
}

/** After Reset this tab writes nothing more until it reloads: a timer still running in a store (a build,
 * a lesson's next beat) would otherwise put the state back between the clear and the reload */
let frozen = false

function seed(local: Storage, tab: Storage) {
  if (tab.getItem(SEEDED)) return
  for (let i = 0; i < local.length; i++) {
    const k = local.key(i)
    if (!k) continue
    if (k.startsWith(MIRROR)) tab.setItem(k.slice(MIRROR.length), local.getItem(k) ?? "")
  }
  // Before this module, Oak wrote its keys to localStorage as they are: a tab with no mirror yet takes those
  for (let i = 0; i < local.length; i++) {
    const k = local.key(i)
    if (k && isOak(k) && tab.getItem(k) === null) tab.setItem(k, local.getItem(k) ?? "")
  }
  tab.setItem(SEEDED, "1")
}

function install(local: Storage, tab: Storage) {
  seed(local, tab)

  const tabKeys = () => {
    const out: string[] = []
    for (let i = 0; i < tab.length; i++) {
      const k = tab.key(i)
      if (k && isOak(k)) out.push(k)
    }
    return out
  }
  const otherKeys = () => {
    const out: string[] = []
    for (let i = 0; i < local.length; i++) {
      const k = local.key(i)
      if (k && !isOak(k) && !k.startsWith(MIRROR)) out.push(k)
    }
    return out
  }
  const keys = () => [...tabKeys(), ...otherKeys()]

  const api = {
    getItem(key: string) {
      return isOak(key) ? tab.getItem(key) : local.getItem(key)
    },
    setItem(key: string, value: string) {
      if (!isOak(key)) return local.setItem(key, value)
      if (frozen) return
      tab.setItem(key, String(value))
      try {
        local.setItem(MIRROR + key, String(value))
      } catch {
        // The mirror is only for new tabs: a full store keeps this tab working
      }
    },
    removeItem(key: string) {
      if (!isOak(key)) return local.removeItem(key)
      if (frozen) return
      tab.removeItem(key)
      local.removeItem(MIRROR + key)
    },
    clear() {
      tabKeys().forEach((k) => api.removeItem(k))
    },
    key(index: number) {
      return keys()[index] ?? null
    },
    get length() {
      return keys().length
    },
  }

  const proxy = new Proxy(api, {
    get(target, prop) {
      if (typeof prop === "string" && prop in target) {
        const v = target[prop as keyof typeof target]
        return typeof v === "function" ? v.bind(target) : v
      }
      return typeof prop === "string" ? (target.getItem(prop) ?? undefined) : undefined
    },
    set(target, prop, value) {
      if (typeof prop === "string") target.setItem(prop, String(value))
      return true
    },
    has(_target, prop) {
      return typeof prop === "string" && keys().includes(prop)
    },
    ownKeys() {
      return keys()
    },
    getOwnPropertyDescriptor(target, prop) {
      if (typeof prop !== "string" || !keys().includes(prop)) return undefined
      return { enumerable: true, configurable: true, writable: true, value: target.getItem(prop) }
    },
    deleteProperty(target, prop) {
      if (typeof prop === "string") target.removeItem(prop)
      return true
    },
  }) as unknown as Storage

  Object.defineProperty(window, "localStorage", { configurable: true, get: () => proxy })
}

if (real && session) {
  try {
    install(real, session)
  } catch {
    // The browser would not let localStorage be stood in for: tabs share their state, as before
  }
}

/** Reset: this tab's Oak state goes, and nothing more is written until the reload. Other tabs keep theirs;
 * the mirror goes too, so a tab opened next starts clean as well */
export function clearTabState() {
  if (!real || !session) return
  for (let i = session.length - 1; i >= 0; i--) {
    const k = session.key(i)
    if (k && isOak(k)) {
      session.removeItem(k)
      real.removeItem(MIRROR + k)
    }
  }
  frozen = true
}
