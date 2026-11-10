import { Ellipsis } from "lucide-react"
import { Fragment } from "react"

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Kbd } from "@/components/ui/kbd"
import { cn } from "@/lib/utils"

import { soon } from "../Catalog"
import { FOCUS, useRoomy, useTablet } from "./parts"

export type RowMenuFor = { name: string; lesson: boolean; pinned: boolean; current: boolean; notSynced: boolean; onOpen: () => void; onPin: () => void }

type Item = { label: string; key: string; danger?: boolean; run?: () => void }

/** The row's actions, as the product's BaseProjectList groups them. Delete is the one red thing the
 * nav has, and it's inside a menu. In Oak everything but Open and Pin says it isn't here */
function groups(r: RowMenuFor): Item[][] {
  const open: Item[] = [...(r.notSynced ? [{ label: "Sync now", key: "S" }] : []), { label: "Open", key: "O", run: r.onOpen }, { label: r.pinned ? "Unpin" : "Pin", key: "P", run: r.onPin }]
  const share: Item[] = r.current ? [{ label: "Share", key: "G" }] : []
  const remove: Item[] = [{ label: "Delete", key: "⌫", danger: true }]
  return r.lesson
    ? [open, [{ label: "Export as zip", key: "E" }, ...share], remove]
    : [[...open, { label: "Rename", key: "R" }], [{ label: "Duplicate", key: "D" }, { label: "Export as zip", key: "E" }, ...share], remove]
}

/** The ⋯ beside a row, a sibling of the row's button, never inside it. Hidden at rest; it shows on the
 * row's hover and focus, always on the current row, and always on the tablet. A right click on the row
 * opens the same menu (`open` is the row's) */
export function RowMenu({ row, open, onOpenChange }: { row: RowMenuFor; open: boolean; onOpenChange: (open: boolean) => void }) {
  const tablet = useTablet()
  const roomy = useRoomy()
  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Actions for ${row.name}`}
          className={cn(
            "absolute top-1/2 right-1 flex -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-raised hover:text-foreground data-[state=open]:bg-surface-raised data-[state=open]:text-foreground data-[state=open]:opacity-100 [&>svg]:size-4",
            FOCUS,
            roomy ? "size-11 text-(color:--text-quiet)" : "size-6", tablet && "text-(color:--text-quiet)",
            !tablet && !row.current && "opacity-0 group-focus-within/row:opacity-100 group-hover/row:opacity-100 focus-visible:opacity-100"
          )}
        >
          <Ellipsis strokeWidth={1.5} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="right" align="start" className="w-48 rounded-(--radius-panel) p-1 shadow-panel">
        {groups(row).map((g, i) => (
          <Fragment key={g[0].label}>
            {i > 0 && <DropdownMenuSeparator />}
            {g.map((it) => (
              <DropdownMenuItem key={it.label} variant={it.danger ? "destructive" : "default"} onSelect={it.run ?? soon} className="h-[1.875rem] text-[0.8125rem] font-label">
                {it.label}
                <Kbd className="ml-auto">{it.key}</Kbd>
              </DropdownMenuItem>
            ))}
          </Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
