import type { ReactNode } from "react"

// [words](address) as in Markdown, or a bare address without the punctuation that ends the
// sentence after it. The tail forms catch a link still being typed out by Typed, so its
// brackets and address never flash on screen
const LINK = /\[([^\]]+)\]\(([^)\s]+)\)|(https?:\/\/[^\s`]*[^\s`.,;:!?)])|(?<!#)\[([^\]]*)\]?\(?[^)\s]*$/

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

/** Text with `ticks` around code. No colour of its own, as on GitHub: the chip is a 10%
 * white fill over whatever it sits on, so it shows on any dark surface. SF Mono's lowercase
 * stands as tall as Stack Sans's (0.55 and 0.56 of the size), so at 87.5% the code's x height sits
 * close to the text's (13 in 15) without its wide letters taking over, and a lighter 350 matches the
 * text's 320 in colour. 0.8em read a size too small. The padding only keeps the glyphs off the
 * ground's edge: before a period or a comma the chip gives a little of it back, or "hello ." reads
 * as a spaced stop (3.3px from the glyph, not 5.5). A word joiner keeps #[
 * together in plain text too. Links are written as [words](address). `ink` is the code's colour:
 * near white by default, the text's own where it shouldn't outshine the headings, as in the lesson */
export function Prose({ text, chip = "bg-foreground/10", ink = "text-foreground" }: { text: string; chip?: string; ink?: string }) {
  const parts: ReactNode[] = text.split("`").map((part, i, all) =>
    i % 2 ? (
      <code
        key={i}
        className={`rounded-[5px] ${chip} px-[0.25em] py-[0.1em] font-mono text-[0.875em] font-[350] whitespace-nowrap ${ink} ${/^[.,;:!?)\]]/.test(all[i + 1] ?? "") ? "-mr-[0.07em]" : ""}`}
      >
        {part}
      </code>
    ) : (
      words(part, String(i))
    )
  )
  return <>{parts}</>
}
