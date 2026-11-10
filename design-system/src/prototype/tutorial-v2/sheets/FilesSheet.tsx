import { FileCode } from "lucide-react"

import type { ReactNode } from "react"

import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

import { INITIAL_FILES } from "../data"
import { useStore } from "../store"
import { FileTreeList, ROW } from "../ui/FileTreeList"
import { SHEET, SHEET_HEAD, SHEET_TITLE } from "./sheet"

/** Recent shows once the tree is long enough to hunt in: below this many files the tree is the list */
const RECENT_FROM = 5

const LABEL = "px-2 pt-2 pb-1 text-caption text-muted-foreground"

/** Recent files, then the tree, at a thumb's height. Picking a file shows it read only. In a bigger
 * project the files opened last come first, so going back and forth between two doesn't mean finding
 * them in the tree each time */
function FilesList({ onPick }: { onPick: (file: string) => void }) {
  const { s } = useStore()
  const many = Object.keys(INITIAL_FILES).length >= RECENT_FROM
  const recent = many ? s.recent.filter((f) => f !== s.open && f in s.files).slice(0, 3) : []
  return (
    <>
      {recent.length > 0 && (
        <section aria-label="Recent" className="mb-2 flex flex-col gap-px border-b border-border pb-2">
          <h3 className={LABEL}>Recent</h3>
          {recent.map((file) => {
            const at = file.lastIndexOf("/")
            return (
              <button
                key={file}
                type="button"
                onClick={() => onPick(file)}
                className={cn(ROW, "h-11 text-[0.9375rem] text-muted-foreground hover:bg-transparent active:bg-foreground/[0.05]")}
              >
                <FileCode className="size-4 shrink-0 text-subtle" aria-hidden="true" />
                <span className="truncate text-foreground">{file.slice(at + 1)}</span>
                {at > 0 && <span className="ml-auto pl-3 text-caption">{file.slice(0, at)}</span>}
              </button>
            )
          })}
        </section>
      )}
      {recent.length > 0 && <h3 className={LABEL}>All files</h3>}
      <FileTreeList tall onPick={onPick} />
    </>
  )
}

/** The phone's file tree, under Code's file name: a sheet from the bottom that closes on a pick */
export function FilesSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { dispatch } = useStore()
  const pick = (file: string) => {
    dispatch({ type: "openFile", file })
    onClose()
  }
  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className={SHEET}>
        <DrawerHeader className={SHEET_HEAD}>
          <DrawerTitle className={SHEET_TITLE}>Files</DrawerTitle>
        </DrawerHeader>
        <div className="overflow-y-auto px-2 pb-[max(var(--safe-bottom),16px)]">
          <FilesList onPick={pick} />
        </div>
      </DrawerContent>
    </Drawer>
  )
}

/** The upright tablet's file tree: a popover hung from the file's name, as an iPad drops a menu from
 * the button that opened it. The phone's sheet there came up from the bottom edge, a third of the
 * screen wide, far from the name it was opened from, over the status line (Almaz, 10 Nov) */
export function FilesPopover({ open, onOpenChange, children }: { open: boolean; onOpenChange: (open: boolean) => void; children: ReactNode }) {
  const { dispatch } = useStore()
  const pick = (file: string) => {
    dispatch({ type: "openFile", file })
    onOpenChange(false)
  }
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        aria-label="Files"
        className="max-h-[min(28rem,var(--radix-popover-content-available-height))] w-80 gap-0 overflow-y-auto rounded-xl bg-surface-panel p-2 shadow-modal"
      >
        <FilesList onPick={pick} />
      </PopoverContent>
    </Popover>
  )
}
