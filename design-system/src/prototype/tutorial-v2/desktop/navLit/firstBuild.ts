import { useEffect, useState } from "react"

/* The first green build in this browser, lesson or project: Get set up waits for it (Spec 06, "Get set up
   shows after the first green build"). Before it a checklist of settings only stood between a newcomer and
   the first program. A pg-proto key, so each tab keeps its own and Reset clears it */

const KEY = "pg-proto-first-build"
const EVENT = "pg-proto-first-build"

const read = () => {
  try {
    return localStorage.getItem(KEY) === "1"
  } catch {
    return false
  }
}

export function markBuilt() {
  if (read()) return
  try {
    localStorage.setItem(KEY, "1")
  } catch {
    // Storage off: Get set up shows for the rest of this page
  }
  window.dispatchEvent(new Event(EVENT))
}

export function useBuiltOnce() {
  const [built, setBuilt] = useState(read)
  useEffect(() => {
    const sync = () => setBuilt(read())
    window.addEventListener(EVENT, sync)
    return () => window.removeEventListener(EVENT, sync)
  }, [])
  return built
}
