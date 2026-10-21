import { Button } from "@/components/ui/button"
import { Drawer, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"

import { STEPS } from "../data"
import { useStore } from "../store"
import { LessonBlocks, readingMinutes } from "../ui/LessonBlocks"
import { AssistantMark } from "../ui/AssistantMark"

/** The step's lesson, read over the code. Ask hands the same step to the assistant */
export function LessonSheet({ open, onClose, onAsk }: { open: boolean; onClose: () => void; onAsk: () => void }) {
  const { s } = useStore()
  const step = STEPS[s.step]
  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="max-h-[82dvh]">
        {/* One measure for header and text: about 65 characters a line, however wide the screen */}
        <DrawerHeader className="mx-auto w-full max-w-[40rem] pb-2">
          {/* As in the desktop's column: a quiet label with the reading time, the step's goal at 20px,
              then the sections at 17. Before, the step's name at 28 jumped straight down to 17 */}
          <p className="text-caption text-muted-foreground">Lesson · {readingMinutes(step)} min</p>
          <DrawerTitle className="mt-1 font-heading text-[1.25rem]! leading-snug! font-normal!">{step.objective}</DrawerTitle>
        </DrawerHeader>
        <div className="mx-auto min-h-0 w-full max-w-[40rem] overflow-y-auto px-4 pt-4 pb-4">
          <LessonBlocks blocks={step.lesson} />
        </div>
        <DrawerFooter className="mx-auto w-full max-w-[40rem] flex-row gap-2 pb-[max(var(--safe-bottom),16px)]">
          <Button variant="secondary" className="h-14 gap-2 px-4" onClick={onAsk}>
            <AssistantMark className="size-[18px] text-brand-purple" />
            Ask
          </Button>
          <Button variant="secondary" className="h-14 flex-1" onClick={onClose}>
            Got it
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
