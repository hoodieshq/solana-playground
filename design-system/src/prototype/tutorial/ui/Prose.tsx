import type { ReactNode } from "react"

/** Text with `ticks` around code: the code is set in mono on a light chip, so prose and
 * identifiers read apart, the same in the lesson, the assistant's lines and the notes.
 * A word joiner keeps #[ together in plain text too */
export function Prose({ text, chip = "bg-surface" }: { text: string; chip?: string }) {
  const parts: ReactNode[] = text.split("`").map((part, i) =>
    i % 2 ? (
      <code key={i} className={`rounded-sm ${chip} px-1 py-px font-mono text-[0.84em] whitespace-nowrap text-foreground`}>
        {part}
      </code>
    ) : (
      part.replaceAll("#[", "#⁠[")
    )
  )
  return <>{parts}</>
}
