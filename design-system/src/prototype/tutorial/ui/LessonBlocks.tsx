import { Check } from "lucide-react"

import { CodeBlock, CodeBlockContent } from "@/components/ui/code-block"
import { CopyButton } from "@/components/ui/copy-button"
import { cn } from "@/lib/utils"

import { holds } from "../check"
import type { LessonBlock, Step } from "../data"
import { highlight } from "./CodeView"
import { Prose } from "./Prose"

/** About 200 words a minute, rounded up, never under a minute */
export function readingMinutes(step: Step) {
  const words = step.lesson.reduce((n, b) => n + (b.kind === "code" ? b.code : b.text).split(/\s+/).length, 0)
  return Math.max(1, Math.ceil(words / 200))
}

function Block({ block, column, file }: { block: LessonBlock; column: boolean; file?: string }) {
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
  // The lesson notices the code: a block already in the file, as a build would read it, gets a quiet
  // check, and loses it again when the code goes. It says what's done, never what's wrong
  const matched = file !== undefined && holds(file, block.code)
  return (
    <CodeBlock
      className={cn(
        "mt-3 bg-surface-well transition-colors duration-200 ease-standard motion-reduce:transition-none",
        column && "group relative",
        matched && "border-success/35"
      )}
    >
      {/* A line that runs past the edge fades into it, so it reads as scrolling on, not cut off */}
      <CodeBlockContent className="text-code [mask-image:linear-gradient(to_right,#000_calc(100%-1.5rem),transparent)]">
        {block.code.split("\n").map((line, i) => (
          // A long line scrolls, on the phone too, rather than wrap: a wrapped half would land at
          // the start of the next line and break the indents that show the structure
          <div key={i} className="min-h-[1lh] whitespace-pre">
            {highlight(line)}
          </div>
        ))}
      </CodeBlockContent>
      {/* Where Copy shows on hover, so with a mouse the two take turns; without hover Copy stays, and the
          check sits left of it. It grows in from the centre, and with reduced motion simply shows */}
      {file !== undefined && (
        // On the well's own colour with a ring of it, so a line of code running under it to the edge
        // doesn't show through
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute top-[13px] right-3 rounded-full bg-surface-well ring-4 ring-surface-well transition-[opacity,scale] duration-200 ease-pop motion-reduce:transition-none [@media(hover:none)]:right-11",
            matched ? "scale-100 opacity-100 group-hover:opacity-0" : "scale-50 opacity-0"
          )}
        >
          <span className="grid size-[18px] place-items-center rounded-full bg-success/15 text-success">
            <Check strokeWidth={2.5} className="size-3" />
          </span>
        </span>
      )}
      {matched && <span className="sr-only">This code is in your file</span>}
      {/* On hover, for whoever types the step out by hand */}
      {column && (
        <CopyButton
          value={block.code}
          label="Copy code"
          // Centred on the first line of code, and as far from the edge as the code is. Shown on hover,
          // and always where there is no hover, as on a tablet
          className="absolute top-[10.5px] right-1.5 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
        />
      )}
    </CodeBlock>
  )
}

/** `column` is the desktop's lesson column, beside an editor: each code block gets Copy, for typing the step out.
 * `file` is the code the step's file holds: each block found in it is checked off as it's typed */
export function LessonBlocks({ blocks, column = false, file }: { blocks: LessonBlock[]; column?: boolean; file?: string }) {
  return (
    <>
      {blocks.map((block, i) => (
        <Block key={i} block={block} column={column} file={file} />
      ))}
    </>
  )
}
