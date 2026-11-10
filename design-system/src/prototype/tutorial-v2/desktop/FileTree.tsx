import { useStore } from "../store"
import { FileTreeList } from "../ui/FileTreeList"

/** The tree docked beside the editor: 256px, as wide as the popover was so a file and its note fit, laid out at its width and clipped while it opens, as
 * the nav moves, so nothing rewraps. The open tab's arrow, Files and ⌘E close it again */
export function DockedTree() {
  const { s, dispatch } = useStore()
  const open = s.tree === "docked"
  return (
    <div
      aria-hidden={!open || undefined}
      inert={!open}
      className="shrink-0 overflow-hidden border-r border-border bg-surface-base transition-[width] duration-200 ease-standard motion-reduce:transition-none"
      style={{ width: open ? 256 : 0, borderRightWidth: open ? 1 : 0 }}
    >
      <div className="w-[255px] pt-1.5">
        <div className="px-1.5 pb-2">
          <FileTreeList onPick={(file) => dispatch({ type: "openFile", file })} />
        </div>
      </div>
    </div>
  )
}
