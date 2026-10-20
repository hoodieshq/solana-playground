import type { ReactNode } from "react"

/** Text with `ticks` around code. No colour of its own, as on GitHub: the chip is a 10%
 * white fill over whatever it sits on, so it shows on any dark surface, with GitHub's
 * 0.2em by 0.4em of room inside and 85% of the text size. A word joiner keeps #[
 * together in plain text too */
export function Prose({ text, chip = "bg-foreground/10" }: { text: string; chip?: string }) {
  const parts: ReactNode[] = text.split("`").map((part, i) =>
    i % 2 ? (
      <code key={i} className={`rounded-[6px] ${chip} px-[0.4em] py-[0.2em] font-mono text-[0.85em] whitespace-nowrap text-foreground`}>
        {part}
      </code>
    ) : (
      part.replaceAll("#[", "#⁠[")
    )
  )
  return <>{parts}</>
}
