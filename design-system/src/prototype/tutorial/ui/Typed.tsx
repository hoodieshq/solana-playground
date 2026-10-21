import { useEffect, useRef, useState } from "react"

import { Prose } from "./Prose"

const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches

/** The assistant's reply as it streams in. Give it a key per text. `delay` holds the first characters
 * back, while the question it answers is still landing */
export function Typed({ text, onDone, delay = 0 }: { text: string; onDone?: () => void; delay?: number }) {
  const [n, setN] = useState(reduce ? text.length : 0)
  // Read once: the wait belongs to the moment the reply came in
  const [wait] = useState(delay)
  const done = useRef(false)
  useEffect(() => {
    if (n >= text.length) {
      if (!done.current) {
        done.current = true
        onDone?.()
      }
      return
    }
    const t = window.setTimeout(() => setN((v) => Math.min(text.length, v + 3)), n === 0 && wait ? wait : 16)
    return () => window.clearTimeout(t)
  }, [n, text.length, onDone, wait])
  // Code in ticks shows as chips as it streams, the same as in the lesson
  return (
    <span aria-live="polite">
      <Prose text={text.slice(0, n)} />
    </span>
  )
}
