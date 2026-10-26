import { useEffect, useRef, useState } from "react"

import { Prose } from "./Prose"

const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches

/** The assistant's text as it comes in: the whole message types out in about half a second however
 * long it is, so it reads alive without slowing the first minute (D28). Give it a key per text.
 * `delay` holds the first characters back, while the question it answers is still landing */
export function Typed({ text, onDone, delay = 0, ms = 500, code }: { text: string; onDone?: () => void; delay?: number; ms?: number; code?: { chip?: string; ink?: string } }) {
  const [n, setN] = useState(reduce ? text.length : 0)
  // Read once: the wait belongs to the moment the reply came in
  const [wait] = useState(delay)
  const done = useRef(false)
  // Characters per 16ms frame, so any length takes about `ms`
  const per = Math.max(2, Math.ceil(text.length / (ms / 16)))
  useEffect(() => {
    if (n >= text.length) {
      if (!done.current) {
        done.current = true
        onDone?.()
      }
      return
    }
    const t = window.setTimeout(() => setN((v) => Math.min(text.length, v + per)), n === 0 && wait ? wait : 16)
    return () => window.clearTimeout(t)
  }, [n, text.length, onDone, wait, per])
  // Code in ticks shows as chips as it streams
  return <Prose text={text.slice(0, n)} {...code} />
}
