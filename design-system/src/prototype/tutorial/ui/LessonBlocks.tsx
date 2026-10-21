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

function Block({ block, copy }: { block: LessonBlock; copy: boolean }) {
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
    <CodeBlock className={cn("mt-3 bg-surface-well", copy && "group relative")}>
      <CodeBlockContent className="text-code">
        {block.code.split("\n").map((line, i) => (
          <div key={i} className="min-h-[1lh] break-words whitespace-pre-wrap">
            {highlight(line)}
          </div>
        ))}
      </CodeBlockContent>
      {/* On hover, for whoever types the step out by hand */}
      {copy && (
        <CopyButton
          value={block.code}
          label="Copy code"
          className="absolute top-1.5 right-1.5 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
        />
      )}
    </CodeBlock>
  )
}

/** `copy` puts a Copy button on each code block, on the desktop, where the lesson sits beside an editor */
export function LessonBlocks({ blocks, copy = false }: { blocks: LessonBlock[]; copy?: boolean }) {
  return (
    <>
      {blocks.map((block, i) => (
        <Block key={i} block={block} copy={copy} />
      ))}
    </>
  )
}
