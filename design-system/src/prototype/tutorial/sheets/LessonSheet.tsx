import type { ReactNode } from "react"
import { MessageCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { CodeBlock, CodeBlockContent } from "@/components/ui/code-block"
import { Drawer, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"

import { STEPS, type LessonBlock } from "../data"
import { useStore } from "../store"
import { highlight } from "../ui/CodeView"

/** Text with `ticks` around code: the code is set in mono on a light chip, so
 * prose and identifiers read apart */
export function Prose({ text, chip = "bg-surface" }: { text: string; chip?: string }) {
  const parts: ReactNode[] = text.split("`").map((part, i) =>
    i % 2 ? (
      <code key={i} className={`rounded-sm ${chip} px-1 py-px font-mono text-[0.84em] whitespace-nowrap text-foreground`}>
        {part}
      </code>
    ) : (
      part
    )
  )
  return <>{parts}</>
}

function Block({ block }: { block: LessonBlock }) {
  // Sections are 28px apart, their parts 8 and 12, so the lesson reads as groups
  if (block.kind === "h") return <h3 className="mt-7 font-heading text-title text-foreground first:mt-0">{block.text}</h3>
  if (block.kind === "p")
    return (
      <p className="mt-2 text-body text-muted-foreground">
        <Prose text={block.text} />
      </p>
    )
  return (
    <CodeBlock className="mt-3 bg-surface-well">
      <CodeBlockContent className="text-code">
        {block.code.split("\n").map((line, i) => (
          <div key={i} className="min-h-[1lh] break-words whitespace-pre-wrap">
            {highlight(line)}
          </div>
        ))}
      </CodeBlockContent>
    </CodeBlock>
  )
}

/** The step's lesson, read over the code. Ask hands the same step to the assistant */
export function LessonSheet({ open, onClose, onAsk }: { open: boolean; onClose: () => void; onAsk: () => void }) {
  const { s } = useStore()
  const step = STEPS[s.step]
  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="max-h-[82dvh]">
        {/* One measure for header and text: about 65 characters a line, however wide the screen */}
        <DrawerHeader className="mx-auto w-full max-w-[40rem] pb-2">
          <p className="text-caption text-muted-foreground">Lesson</p>
          <DrawerTitle className="mt-1 font-heading text-display! font-normal!">{step.title}</DrawerTitle>
        </DrawerHeader>
        <div className="mx-auto min-h-0 w-full max-w-[40rem] overflow-y-auto px-4 pt-4 pb-4">
          {step.lesson.map((block, i) => (
            <Block key={i} block={block} />
          ))}
        </div>
        <DrawerFooter className="mx-auto w-full max-w-[40rem] flex-row gap-2 pb-[max(var(--safe-bottom),16px)]">
          <Button variant="secondary" className="h-14 gap-2 px-4 text-control" onClick={onAsk}>
            <MessageCircle strokeWidth={1.75} className="size-4 text-brand-purple" />
            Ask
          </Button>
          <Button variant="secondary" className="h-14 flex-1 text-control" onClick={onClose}>
            Got it
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
