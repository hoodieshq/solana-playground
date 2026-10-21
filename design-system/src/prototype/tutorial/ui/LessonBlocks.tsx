import { CodeBlock, CodeBlockContent } from "@/components/ui/code-block"
import { CopyButton } from "@/components/ui/copy-button"
import { cn } from "@/lib/utils"

import type { LessonBlock, Step } from "../data"
import { highlight } from "./CodeView"
import { Prose } from "./Prose"

/** About 200 words a minute, rounded up, never under a minute */
export function readingMinutes(step: Step) {
  const words = step.lesson.reduce((n, b) => n + (b.kind === "code" ? b.code : b.text).split(/\s+/).length, 0)
  return Math.max(1, Math.ceil(words / 200))
}

function Block({ block, column }: { block: LessonBlock; column: boolean }) {
  // Sections are 28px apart, their parts 8 and 12, so the lesson reads as groups
  if (block.kind === "h") return <h3 className="mt-7 font-heading text-title text-foreground first:mt-0">{block.text}</h3>
  if (block.kind === "p")
    return (
      // The reading weight, 320, and near white: told from the headings by weight, not just by grey.
      // text-body alone leaves it at 400, the headings' weight (to raise in DES-129)
      <p className="mt-2 text-body font-read text-foreground/80">
        <Prose text={block.text} />
      </p>
    )
  return (
    <CodeBlock className={cn("mt-3 bg-surface-well", column && "group relative")}>
      {/* A line that runs past the edge fades into it, so it reads as scrolling on, not cut off */}
      <CodeBlockContent className={cn("text-code", column && "[mask-image:linear-gradient(to_right,#000_calc(100%-1.5rem),transparent)]")}>
        {block.code.split("\n").map((line, i) => (
          // A phone has to wrap. In the desktop column a long line scrolls instead, so a wrapped
          // half never lands at the start of the next line and the indents keep the structure
          <div key={i} className={cn("min-h-[1lh]", column ? "whitespace-pre" : "break-words whitespace-pre-wrap")}>
            {highlight(line)}
          </div>
        ))}
      </CodeBlockContent>
      {/* On hover, for whoever types the step out by hand */}
      {column && (
        <CopyButton
          value={block.code}
          label="Copy code"
          className="absolute top-1.5 right-1.5 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
        />
      )}
    </CodeBlock>
  )
}

/** `column` is the desktop's lesson column, beside an editor: code doesn't wrap, and each block has Copy */
export function LessonBlocks({ blocks, column = false }: { blocks: LessonBlock[]; column?: boolean }) {
  return (
    <>
      {blocks.map((block, i) => (
        <Block key={i} block={block} column={column} />
      ))}
    </>
  )
}
