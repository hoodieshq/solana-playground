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
 * white fill over whatever it sits on, so it shows on any dark surface, with GitHub's
 * 0.2em by 0.4em of room inside and 85% of the text size. A word joiner keeps #[
 * together in plain text too. Links are written as [words](address) */
export function Prose({ text, chip = "bg-foreground/10" }: { text: string; chip?: string }) {
  const parts: ReactNode[] = text.split("`").map((part, i) =>
    i % 2 ? (
      <code key={i} className={`rounded-[6px] ${chip} px-[0.4em] py-[0.2em] font-mono text-[0.85em] whitespace-nowrap text-foreground`}>
        {part}
      </code>
    ) : (
      words(part, String(i))
    )
  )
  return <>{parts}</>
}
