import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"

import { useStore } from "../store"
import { FileTreeList } from "../ui/FileTreeList"
import { SHEET, SHEET_HEAD, SHEET_TITLE } from "./sheet"

/** The phone's file tree: the desktop's rows at a thumb's height, under Code's file name.
 * Picking a file shows it read only and closes */
export function FilesSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { dispatch } = useStore()
  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className={SHEET}>
        <DrawerHeader className={SHEET_HEAD}>
          <DrawerTitle className={SHEET_TITLE}>Files</DrawerTitle>
        </DrawerHeader>
        <div className="overflow-y-auto px-2 pb-[max(var(--safe-bottom),16px)]">
          <FileTreeList
            tall
            onPick={(file) => {
              dispatch({ type: "openFile", file })
              onClose()
            }}
          />
        </div>
      </DrawerContent>
    </Drawer>
  )
}
