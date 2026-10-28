import { RotateCcw } from "lucide-react"

import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { cn } from "@/lib/utils"

import { LESSON, STEPS } from "../data"
import { useStore } from "../store"
import { StepGlyph } from "../ui/StepGlyph"
import { SHEET, SHEET_HEAD, SHEET_TITLE } from "./sheet"

/** The phone's step bar: the four steps the header stands for, as rows with the desktop bar's glyphs.
 * A step you've reached scrolls the chat back to its divider; nothing resets. Under them Start over,
 * the desktop ⋯ menu's one item a phone needs, which asks first. Every left edge sits at 16px */
export function StepsSheet({ open, onClose, onPick, onStartOver }: { open: boolean; onClose: () => void; onPick: (step: number) => void; onStartOver: () => void }) {
  const { s } = useStore()
  const row =
    "flex w-full items-center gap-3 rounded-lg px-2 text-left outline-none active:bg-surface-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-purple"
  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className={SHEET}>
        <DrawerHeader className={SHEET_HEAD}>
          <DrawerTitle className={SHEET_TITLE}>{LESSON.card.name}</DrawerTitle>
          {/* The caption size spelled as a length: the drawer's cn takes text-caption for a colour and drops it */}
          <DrawerDescription className="text-(length:--text-caption) leading-(--text-caption--line-height) text-muted-foreground">
            {s.passed.filter(Boolean).length} of {STEPS.length} steps done. Tap one to read it again.
          </DrawerDescription>
        </DrawerHeader>
        <nav aria-label="Tutorial steps" className="flex flex-col gap-1 overflow-y-auto px-2 pt-1 pb-[max(var(--safe-bottom),16px)]">
          {STEPS.map((step, i) => {
            const done = s.passed[i]
            const current = s.started && i === s.step && !done
            const reached = s.started && (done || i <= s.step)
            return (
              <button
                key={step.id}
                type="button"
                disabled={!reached}
                aria-current={current ? "step" : undefined}
                onClick={() => {
                  onPick(i)
                  onClose()
                }}
                className={cn(row, "min-h-14 py-2 disabled:opacity-60", current && "bg-foreground/[0.06]")}
              >
                {/* The kit's disc grey is the panel's own: lifted a step here so it shows */}
                <StepGlyph i={i} done={done} current={current} className={current ? undefined : "bg-foreground/10"} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-[0.9375rem] leading-[1.35] text-foreground">{step.title}</span>
                  <span className="text-caption text-muted-foreground">{step.objective}</span>
                </span>
                {(done || current) && <span className="shrink-0 text-caption text-muted-foreground">{done ? "Done" : "Now"}</span>}
              </button>
            )
          })}
          {s.started && (
            <div className="mt-2 border-t border-border pt-2">
              <button
                type="button"
                onClick={() => {
                  onClose()
                  onStartOver()
                }}
                className={cn(row, "h-12 text-[0.9375rem] text-muted-foreground")}
              >
                <span className="grid size-5 shrink-0 place-items-center">
                  <RotateCcw className="size-4" aria-hidden="true" />
                </span>
                Start over…
              </button>
            </div>
          )}
        </nav>
      </DrawerContent>
    </Drawer>
  )
}
