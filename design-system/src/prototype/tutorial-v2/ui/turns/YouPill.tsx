import { useLayoutEffect, useRef } from "react"

import { cn } from "@/lib/utils"

import { highlight } from "../CodeView"
import { Prose } from "../Prose"
import { READ_CODE, reducedMotion } from "../type"

const EASE = "cubic-bezier(0.2, 0, 0, 1)"
// A question asked with a chip, on its way from the chip into the feed: the chip's box, and when.
// The pill that lands takes it
const FLIGHT_MS = 240
let flight: { text: string; from: DOMRect; at: number } | null = null

/** Called by the chip as it's pressed, before its question is posted */
export const launch = (text: string, from: DOMRect) => {
  flight = { text, from, at: performance.now() }
}

/** What you said or picked, right aligned: a click that speaks for you is echoed here too. A pill
 * asked with a chip arrives from the chip: it starts in the chip's box and settles into its own
 * place (FLIP), so the chip reads as having become the question. A code pick shows as code */
export function YouPill({ text, code = false }: { text: string; code?: boolean }) {
  const ref = useRef<HTMLParagraphElement>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el || flight?.text !== text) return
    const f = flight
    flight = null
    if (performance.now() - f.at > 900 || reducedMotion()) return
    const to = el.getBoundingClientRect()
    const dx = f.from.left - to.left
    const dy = f.from.top - to.top
    el.animate(
      [
        { transform: `translate(${dx}px, ${dy}px) scale(${f.from.width / to.width}, ${f.from.height / to.height})`, borderRadius: "9999px" },
        { transform: "none", borderRadius: getComputedStyle(el).borderRadius },
      ],
      { duration: FLIGHT_MS, easing: EASE }
    )
  }, [text])
  return (
    <p
      ref={ref}
      className={cn(
        "ml-auto w-fit max-w-[85%] origin-top-left rounded-panel bg-surface-raised px-3 py-2",
        code ? "font-mono text-[0.8125rem] leading-[1.5] break-words text-syntax-plain" : "text-[0.9375rem] leading-[1.6]"
      )}
    >
      {/* A prose answer keeps its code in chips, as the option it came from showed it, not in raw backticks */}
      {code ? highlight(text) : <Prose text={text} {...READ_CODE} />}
    </p>
  )
}
