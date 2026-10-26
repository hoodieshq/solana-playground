import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer"
import { cn } from "@/lib/utils"

import { TestForm } from "../ui/TestForm"
import { SHEET } from "./sheet"

/** The Call panel on a phone: the same form, drawn from the deployed program's IDL, in a drawer that
 * opens from Call in Code's head, or from an answer that offers it. A call's result shows here, not in the chat. The
 * panel's own head is the sheet's head, under the drag handle, so the drawer keeps its title for screen
 * readers only */
export function TestSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      {/* One height for Form and IDL, so switching doesn't make the sheet jump: the form's button stays at
          the foot and the JSON scrolls inside */}
      <DrawerContent className={cn(SHEET, "h-[80dvh] max-h-[80dvh]")}>
        <DrawerTitle className="sr-only">Call</DrawerTitle>
        <DrawerDescription className="sr-only">Call the deployed program's instructions from a form</DrawerDescription>
        <div className="mt-1 flex min-h-0 flex-1 flex-col">
          <TestForm phone />
        </div>
      </DrawerContent>
    </Drawer>
  )
}
