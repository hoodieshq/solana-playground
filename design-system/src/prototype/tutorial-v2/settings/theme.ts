import { useEffect, useState } from "react"

import { onSettings, readSettings } from "./store"

/* The theme. Oak is dark only (Almaz, 10 Nov): Light is gone from Settings, and a Light stored in
   oak.theme before reads as Dark. It lives on <html>, which the entry page starts dark. Every window
   applies it (the bar's and the tablet frame's), following each other through storage. Word wrap hangs
   off <html> too, as html.oak-wrap, so the code views can read it from CSS */

export type Theme = "dark" | "light"

const KEY = "oak.theme"
const EVENT = "oak.theme"
const META = { dark: "#101011", light: "#ffffff" }

export function readTheme(): Theme {
  return "dark"
}

let current: Theme = readTheme()

function apply(theme: Theme) {
  current = theme
  const html = document.documentElement
  // Everything switches at once: a fade would show the two themes mixed for a moment
  html.classList.add("no-transition")
  html.classList.toggle("dark", theme === "dark")
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", META[theme])
  requestAnimationFrame(() => requestAnimationFrame(() => html.classList.remove("no-transition")))
  window.dispatchEvent(new Event(EVENT))
}

export function clearTheme() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // Nothing stored
  }
  apply("dark")
}

const wrap = () => document.documentElement.classList.toggle("oak-wrap", readSettings().wordWrap)

apply(current)
wrap()
onSettings(wrap)
window.addEventListener("storage", (e) => {
  if (e.key === KEY || e.key === null) apply(readTheme())
})

/** The theme now, for the Toasters, which draw their own colours */
export function useTheme(): Theme {
  const [t, setT] = useState(current)
  useEffect(() => {
    const sync = () => setT(current)
    window.addEventListener(EVENT, sync)
    return () => window.removeEventListener(EVENT, sync)
  }, [])
  return t
}
