import * as React from "react"

const REDUCE = "(prefers-reduced-motion: reduce)"

type TypewriterOptions = {
  /** about how long the whole text takes, whatever its length */
  ms?: number
  /** a wait before the first characters, while what it answers is still landing */
  delay?: number
  /** called once, when the whole text is out */
  onDone?: () => void
}

/**
 * A text as it comes in: the whole of it types out in about half a second
 * however long it is, so a message reads alive without slowing anyone
 * down. A text that goes on from what is already shown, as a streamed
 * reply does, keeps typing from there; any other text starts over. With
 * reduced motion it is all there at once. The delay is read once, as the
 * hook mounts: it belongs to the moment the text came in.
 */
function useTypewriter(text: string, { ms = 500, delay = 0, onDone }: TypewriterOptions = {}) {
  const [reduce] = React.useState(() => typeof window !== "undefined" && window.matchMedia(REDUCE).matches)
  const [wait] = React.useState(delay)
  const [state, setState] = React.useState({ text, n: reduce ? text.length : 0 })
  let n = state.n
  if (state.text !== text) {
    n = reduce ? text.length : text.startsWith(state.text.slice(0, state.n)) ? state.n : 0
    setState({ text, n })
  }
  const done = n >= text.length
  /* Characters per 16ms frame, so any length takes about ms */
  const per = Math.max(2, Math.ceil(text.length / (ms / 16)))

  const finish = React.useRef(onDone)
  React.useEffect(() => {
    finish.current = onDone
  })
  const told = React.useRef<string | null>(null)

  React.useEffect(() => {
    if (done) {
      if (told.current !== text) {
        told.current = text
        finish.current?.()
      }
      return
    }
    const t = window.setTimeout(
      () => setState((s) => ({ ...s, n: Math.min(s.text.length, s.n + per) })),
      n === 0 && wait ? wait : 16
    )
    return () => window.clearTimeout(t)
  }, [n, done, text, wait, per])

  return { text: text.slice(0, n), done }
}

export { useTypewriter }
export type { TypewriterOptions }
