import * as React from "react"
import { ChevronDown, FileCode, PinOff } from "lucide-react"
import { cn } from "@/lib/utils"

import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

/* A project's files by folder. Folders are labels, files are 28px rows (44
   with size="touch"), the open file filled, a dot on the file that wants
   you, and a file that is not there yet disabled with a note saying when it
   comes. A child starts right under its parent's name: the folder's caret
   and the gap after it, 20px a level. The arrow keys, Home and End move
   between files. FileTreeDock is the tree docked beside the editor. */

type FileTreeSize = "default" | "touch"

const Size = React.createContext<FileTreeSize>("default")

/* A level's indent: the folder's caret (12) and the gap after it (8) */
const indent = (depth: number): React.CSSProperties => ({ paddingLeft: `${8 + depth * 20}px` })

const ROW =
  "flex h-7 w-full items-center gap-2 rounded-[6px] px-2 text-left text-[0.8125rem] whitespace-nowrap outline-none transition-colors duration-100 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none"

function FileTree({
  className,
  size = "default",
  onKeyDown,
  "aria-label": label = "Files",
  ...props
}: React.ComponentProps<"div"> & { size?: FileTreeSize }) {
  return (
    <Size.Provider value={size}>
      <div
        role="tree"
        data-slot="file-tree"
        data-size={size}
        aria-label={label}
        onKeyDown={(e) => {
          onKeyDown?.(e)
          if (e.defaultPrevented || !["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) return
          const rows = [...e.currentTarget.querySelectorAll<HTMLButtonElement>('[data-slot="file-tree-item"]:not(:disabled)')]
          if (!rows.length) return
          const at = rows.findIndex((r) => r === document.activeElement)
          const to =
            e.key === "Home"
              ? 0
              : e.key === "End"
                ? rows.length - 1
                : at === -1
                  ? 0
                  : e.key === "ArrowDown"
                    ? Math.min(rows.length - 1, at + 1)
                    : Math.max(0, at - 1)
          e.preventDefault()
          rows[to]?.focus()
        }}
        className={cn("flex flex-col gap-px", className)}
        {...props}
      />
    </Size.Provider>
  )
}

/* A folder: a label, never pressed. Under a finger it stands 36px, not a
   file's 44, so the list doesn't drift apart */
function FileTreeFolder({ className, depth = 0, style, children, ...props }: React.ComponentProps<"div"> & { depth?: number }) {
  const size = React.useContext(Size)
  return (
    <div
      role="treeitem"
      aria-expanded="true"
      aria-level={depth + 1}
      data-slot="file-tree-folder"
      style={{ ...indent(depth), ...style }}
      className={cn(ROW, "cursor-default text-muted-foreground", size === "touch" && "h-9 text-[0.9375rem]", className)}
      {...props}
    >
      <ChevronDown aria-hidden="true" className="size-3 shrink-0 text-muted-foreground" strokeWidth={1.75} />
      {children}
    </div>
  )
}

function FileTreeItem({
  className,
  depth = 0,
  selected = false,
  marked = false,
  markLabel = "Marked",
  icon,
  style,
  children,
  ...props
}: React.ComponentProps<"button"> & {
  depth?: number
  /** the open file */
  selected?: boolean
  /** a dot at the row's end: the file the current step works in */
  marked?: boolean
  /** what the dot says to a screen reader */
  markLabel?: string
  /** the file's glyph; a code file's when left out */
  icon?: React.ReactNode
}) {
  const size = React.useContext(Size)
  const touch = size === "touch"
  return (
    <button
      type="button"
      role="treeitem"
      aria-level={depth + 1}
      aria-selected={selected}
      data-slot="file-tree-item"
      data-selected={selected || undefined}
      data-marked={marked || undefined}
      style={{ ...indent(depth), ...style }}
      className={cn(
        ROW,
        "group/file-tree-item relative text-muted-foreground disabled:cursor-default [&>svg]:shrink-0 [&>svg]:text-subtle",
        touch ? "h-11 text-[0.9375rem] [&>svg]:size-4" : "[&>svg]:size-[15px]",
        /* Under a finger the open file takes a fill of its own and hover
           leaves it be: a tap's hover sticks on a phone, so a press answers */
        touch
          ? "active:bg-foreground/[0.05] data-selected:bg-foreground/[0.07] data-selected:text-foreground"
          : "hover:bg-surface-hover hover:text-foreground disabled:hover:bg-transparent disabled:hover:text-muted-foreground data-selected:bg-surface-hover data-selected:text-foreground",
        className
      )}
      {...props}
    >
      {icon ?? <FileCode aria-hidden="true" />}
      <span className="truncate">{children}</span>
      {marked && (
        <span data-slot="file-tree-item-mark" className="ml-auto size-1.5 shrink-0 rounded-full bg-brand-purple">
          <span className="sr-only">{markLabel}</span>
        </span>
      )}
    </button>
  )
}

/* Why a file can't be opened yet, said once in words at the row's end: no fade, no lock */
function FileTreeItemNote({ className, ...props }: React.ComponentProps<"span">) {
  return <span data-slot="file-tree-item-note" className={cn("ml-auto shrink-0 pl-3 text-caption text-muted-foreground", className)} {...props} />
}

/* The tree docked beside the editor: laid out at its full width and
   clipped while it opens, so nothing rewraps. The unpin sits over the first
   row's free end and gives the tree back to wherever it came from */
function FileTreeDock({
  className,
  open = true,
  width = 220,
  onUndock,
  undockLabel = "Undock",
  style,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  open?: boolean
  /** its width when open, in px */
  width?: number
  onUndock?: () => void
  undockLabel?: string
}) {
  return (
    <div
      data-slot="file-tree-dock"
      data-state={open ? "open" : "closed"}
      aria-hidden={!open || undefined}
      inert={!open}
      className={cn(
        "shrink-0 overflow-hidden border-border bg-surface-base transition-[width] duration-200 ease-standard motion-reduce:transition-none",
        className
      )}
      style={{ width: open ? width : 0, borderRightWidth: open ? 1 : 0, ...style }}
      {...props}
    >
      <div className="relative pt-1.5" style={{ width: width - 1 }}>
        {onUndock && (
          <div className="absolute top-1.5 right-1.5 z-10">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon-xs" className="text-muted-foreground" aria-label={undockLabel} onClick={onUndock}>
                  <PinOff />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">{undockLabel}</TooltipContent>
            </Tooltip>
          </div>
        )}
        <div className="px-1.5 pb-2">{children}</div>
      </div>
    </div>
  )
}

export { FileTree, FileTreeDock, FileTreeFolder, FileTreeItem, FileTreeItemNote }
