import { MessageCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"

import { STEPS } from "../data"
import { useStore } from "../store"

/** The step's lesson, read over the code. Ask hands the same step to the assistant */
export function LessonSheet({ open, onClose, onAsk }: { open: boolean; onClose: () => void; onAsk: () => void }) {
  const { s } = useStore()
  const step = STEPS[s.step]
  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="max-h-[72dvh]">
        <DrawerHeader>
          <p className="text-caption tracking-wide text-muted-foreground uppercase">
            Lesson · Step {s.step + 1} of {STEPS.length}
          </p>
          <DrawerTitle className="mt-1 font-heading text-title">{step.title}</DrawerTitle>
        </DrawerHeader>
        <div className="min-h-0 overflow-y-auto px-4">
          <DrawerDescription className="text-body text-foreground">{step.page}</DrawerDescription>
        </div>
        <DrawerFooter className="flex-row gap-2 pb-[max(var(--safe-bottom),16px)]">
          <Button variant="secondary" className="h-11 gap-2 px-3.5 text-control" onClick={onAsk}>
            <MessageCircle strokeWidth={1.75} className="size-4 text-brand-purple" />
            Ask
          </Button>
          <Button variant="secondary" className="h-11 flex-1 text-control" onClick={onClose}>
            Back to the step
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
