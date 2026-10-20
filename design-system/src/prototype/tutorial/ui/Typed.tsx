import { useEffect, useRef, useState } from "react"

const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches

/** The assistant's reply as it streams in. Give it a key per text */
export function Typed({ text, onDone }: { text: string; onDone?: () => void }) {
  const [n, setN] = useState(reduce ? text.length : 0)
  const done = useRef(false)
  useEffect(() => {
    if (n >= text.length) {
      if (!done.current) {
        done.current = true
        onDone?.()
      }
      return
    }
    const t = window.setTimeout(() => setN((v) => Math.min(text.length, v + 3)), 16)
    return () => window.clearTimeout(t)
  }, [n, text.length, onDone])
  // A word joiner keeps attributes like #[derive(Accounts)] from breaking after the #
  return <span aria-live="polite">{text.slice(0, n).replaceAll("#[", "#⁠[")}</span>
}
