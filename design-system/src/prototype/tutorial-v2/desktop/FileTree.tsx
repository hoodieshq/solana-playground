import { PinOff } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

import { useStore } from "../store"
import { FileTreeList } from "../ui/FileTreeList"

/** The tree docked beside the editor: 220px, laid out at its width and clipped while it opens, as
 * the nav moves, so nothing rewraps. PinOff puts it back in the popover */
export function DockedTree() {
  const { s, dispatch } = useStore()
  const open = s.tree === "docked"
  return (
    <div
      aria-hidden={!open || undefined}
      inert={!open}
      className="shrink-0 overflow-hidden border-r border-border bg-surface-base transition-[width] duration-200 ease-standard motion-reduce:transition-none"
      style={{ width: open ? 220 : 0, borderRightWidth: open ? 1 : 0 }}
    >
      <div className="relative w-[219px] pt-1.5">
        {/* No head, as in the popover: the unpin over the first row's free end */}
        <div className="absolute top-1.5 right-1.5 z-10">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon-xs" className="text-muted-foreground" aria-label="Undock the files" onClick={() => dispatch({ type: "tree", state: "closed" })}>
                <PinOff />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Undock</TooltipContent>
          </Tooltip>
        </div>
        <div className="px-1.5 pb-2">
          <FileTreeList onPick={(file) => dispatch({ type: "openFile", file })} />
        </div>
      </div>
    </div>
  )
}
