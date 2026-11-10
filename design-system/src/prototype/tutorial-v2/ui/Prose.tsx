import type { ReactNode } from "react"

// [words](address) as in Markdown, or a bare address without the punctuation that ends the
// sentence after it. The tail forms catch a link still being typed out by Typed, so its
// brackets and address never flash on screen
const LINK = /\[([^\]]+)\]\(([^)\s]+)\)|(https?:\/\/[^\s`]*[^\s`.,;:!?)])|(?<!#)\[([^\]]*)\]?\(?[^)\s]*$/

/** The code chip's ground: darker than the surface under it, with a 1px ring inside. On paper a faint
 * tint of the text with the border's ring, since black at 35% made the code unreadable there */
export const CHIP = "bg-foreground/[0.06] shadow-[inset_0_0_0_1px_var(--border)] dark:bg-black/35 dark:shadow-[inset_0_0_0_1px_rgb(255_255_255/0.18)]"

const linkClass =
  "text-foreground underline decoration-foreground/40 underline-offset-[3px] transition-colors hover:decoration-foreground"

function words(text: string, key: string): ReactNode[] {
  const out: ReactNode[] = []
  let rest = text
  let n = 0
  for (let m = rest.match(LINK); m; m = rest.match(LINK)) {
    const at = m.index ?? 0
    out.push(rest.slice(0, at).replaceAll("#[", "#⁠["))
    const [, label, href, bare, typing] = m
    if (label && href)
      out.push(
        <a key={`${key}-${n++}`} href={href} target="_blank" rel="noreferrer" className={linkClass}>
          {label}
        </a>
      )
    else if (bare)
      out.push(
        <a key={`${key}-${n++}`} href={bare} target="_blank" rel="noreferrer" className={linkClass}>
          {bare.replace(/^https?:\/\/(www\.)?/, "").replace(/#.*$/, "")}
        </a>
      )
    // Still typing: the words so far, the address not yet
    else out.push(typing ?? "")
    rest = rest.slice(at + m[0].length)
  }
  out.push(rest.replaceAll("#[", "#⁠["))
  return out
}

/** Text with `ticks` around code, and links written as [words](address). A word joiner keeps #[
 * together in plain text too.
 *
 * The chip, as in Practicum's lessons: a ground darker than whatever it sits on, ringed by a faint white
 * line drawn as an inset shadow so it adds no size, with no colour of its own. `ink` is the code's colour:
 * near white by default, the text's own where it shouldn't outshine the headings, as in the lesson.
 * Its sizes are whole pixels, not a share of the text, so it is the same in a 16px line and in the quiz's
 * 18 (at .875em it came out 15.75 in a question and 11.4 in a note). SF Mono at 14 sets its x height
 * close to the text's (7.7 against 9), and weight 350 matches the text's 320 in colour.
 * It is an inline block on a 16px line, so its height is exact: inline, SF Mono's 16.5 content box made
 * it 23.5. Default is 3 above and 3 below and 4 a side, 22 tall, a balance of two centres: even over the
 * text's capitals and under its baseline, code like system_program (no capitals) sat low in its chip and
 * a j's tail all but touched the ring; 3 and 3 give the tail 3.6. `large` is for the quiz's 18px
 * question, whose capitals stand higher: 5 above and 2 below, 23 tall. `small` is 12 on 16 with 1 above
 * and 2 below, 19 tall, for the 13px and 14px notes on a 20 line. Practicum's 8 a side made a chip of
 * one short word read as a button.
 *
 * A stop right after the chip is glued to it in one unbreakable run: an inline block lets the line break
 * after it, and ". It used" started the next line with its period. The chip keeps 2px clear of the stop,
 * which pulled in stuck to the ring */
export function Prose({ text, chip = CHIP, ink = "text-foreground", small = false, large = false }: { text: string; chip?: string; ink?: string; small?: boolean; large?: boolean }) {
  const all = text.split("`")
  const parts: ReactNode[] = []
  for (let i = 0; i < all.length; i++) {
    if (i % 2 === 0) {
      parts.push(...words(all[i], String(i)))
      continue
    }
    const stop = (all[i + 1] ?? "").match(/^[.,;:!?)\]]+/)?.[0] ?? ""
    const code = (
      <code
        key={i}
        className={`inline-block rounded-[4px] ${chip} ${small ? "px-[3px] pt-px pb-[2px] font-mono text-[12px] leading-4" : large ? "px-1 pt-[5px] pb-[2px] font-mono text-[14px] leading-4" : "px-1 pt-[3px] pb-[3px] font-mono text-[14px] leading-4"} font-[350] whitespace-nowrap ${ink} ${stop ? "mr-[2px]" : ""}`}
      >
        {all[i]}
      </code>
    )
    if (!stop) {
      parts.push(code)
      continue
    }
    parts.push(
      <span key={`${i}-stop`} className="whitespace-nowrap">
        {code}
        {stop}
      </span>
    )
    all[i + 1] = all[i + 1].slice(stop.length)
  }
  return <>{parts}</>
}
