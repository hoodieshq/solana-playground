import { ArrowUpRight } from "lucide-react"
import { useState } from "react"

import { DropdownMenuItem, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger } from "@/components/ui/dropdown-menu"
import { Kbd } from "@/components/ui/kbd"
import { MenuFold, MenuFoldChevron, MenuFoldContent, MenuFoldTrigger } from "@/components/ui/menu-extras"
import { cn } from "@/lib/utils"

import { TRAIL_ICON } from "../desktop/navLit/AccountMenu"
import { view } from "../view"
import { HELP_LINKS } from "./links"
import { openShortcuts } from "./open"

/** The account menu's row: 30 high and 13px, 44 under a finger */
const ITEM = "h-[1.875rem] text-[0.8125rem] font-label [html.touch_&]:h-11 [html.phone_&]:h-11"

/** Help, in place of the account menu's Docs (CONSENSUS 4.1). Two docs, the shortcuts (where there's a
 * keyboard), Report a bug. On Desktop and Tablet 1152 a submenu beside the menu, as Claude's Learn more
 * opens (Almaz, 9 Nov): the menu keeps its height and its items stay where they were. On the phone views
 * the menu sits in a sheet with no room beside it, so there it's a fold that opens inside the menu,
 * closed each time the menu opens */
export function HelpItems() {
  const [open, setOpen] = useState(false)
  const keyboard = view === "desktop" || view === "tablet"
  const link = (url: string) => () => window.open(url, "_blank", "noopener,noreferrer")
  const [docs, anchor, bug] = HELP_LINKS
  // Three links out in a row read as one: the arrow shows only on the row you're about to pick
  const out = <ArrowUpRight className={cn(TRAIL_ICON, "opacity-0 in-data-highlighted:opacity-100")} />
  const items = (
    <>
      {[docs, anchor].map((l) => (
        <DropdownMenuItem key={l.label} onSelect={link(l.url)} className={ITEM}>
          {l.label}
          {out}
        </DropdownMenuItem>
      ))}
      {keyboard && (
        <DropdownMenuItem onSelect={openShortcuts} className={ITEM}>
          Keyboard shortcuts
          {/* As wide as ⌘, so the two keys share the column's centre */}
          <Kbd className="ml-auto min-w-[1.375rem]">?</Kbd>
        </DropdownMenuItem>
      )}
      <DropdownMenuItem onSelect={link(bug.url)} className={ITEM}>
        {bug.label}
        {out}
      </DropdownMenuItem>
    </>
  )
  if (keyboard)
    return (
      <DropdownMenuSub>
        <DropdownMenuSubTrigger className={cn(ITEM, "[&>svg:last-child]:mr-1 [&>svg:last-child]:size-3.5 [&>svg:last-child]:text-muted-foreground")}>Help</DropdownMenuSubTrigger>
        <DropdownMenuSubContent sideOffset={6} alignOffset={-4} className="w-52 rounded-(--radius-panel) p-1 shadow-panel">
          {items}
        </DropdownMenuSubContent>
      </DropdownMenuSub>
    )
  return (
    <MenuFold open={open} onOpenChange={setOpen}>
      <MenuFoldTrigger asChild>
        <DropdownMenuItem
          onSelect={(e) => e.preventDefault()}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") setOpen(true)
            if (e.key === "ArrowLeft") setOpen(false)
          }}
          className={ITEM}
        >
          Help
          <MenuFoldChevron />
        </DropdownMenuItem>
      </MenuFoldTrigger>
      <MenuFoldContent>{items}</MenuFoldContent>
    </MenuFold>
  )
}
