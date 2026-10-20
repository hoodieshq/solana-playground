import type { ReactNode } from "react"

/** Text with `ticks` around code. The code sits in its own chip, a lighter fill with a
 * hairline, so it reads apart from the prose on any surface: the lesson, the assistant's
 * lines, the notes and the answers. A word joiner keeps #[ together in plain text too */
export function Prose({ text, chip = "bg-surface-raised" }: { text: string; chip?: string }) {
  const parts: ReactNode[] = text.split("`").map((part, i) =>
    i % 2 ? (
      <code key={i} className={`rounded-[5px] ${chip} px-1.5 py-0.5 font-mono text-[0.84em] whitespace-nowrap text-foreground ring-1 ring-border-strong ring-inset`}>
        {part}
      </code>
    ) : (
      part.replaceAll("#[", "#⁠[")
    )
  )
  return <>{parts}</>
}
