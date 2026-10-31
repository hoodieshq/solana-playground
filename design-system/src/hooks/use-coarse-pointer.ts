import * as React from "react"

const QUERY = "(pointer: coarse)"

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(QUERY)
  mql.addEventListener("change", onChange)
  return () => mql.removeEventListener("change", onChange)
}

/**
 * Whether the main pointer is a finger. Sizes for a finger belong in CSS,
 * with pointer-coarse:; this is for behaviour, such as scrolling a row
 * sideways instead of folding it into a menu. It follows the setting live,
 * as a tablet with a trackpad switches, and reads false on the server.
 */
function useCoarsePointer() {
  return React.useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false
  )
}

export { useCoarsePointer }
