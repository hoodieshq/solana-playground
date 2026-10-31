import * as React from "react"
import { cn } from "@/lib/utils"

import { Kbd } from "@/components/ui/kbd"

/* Every shortcut as a row: what it does, then its keys. Put it in a Modal
   behind "Keyboard shortcuts".
   Rows come in groups under a small grey name ("In the lesson", "Panels",
   "Steps"), so a long list reads as a few short ones and no lines are
   needed between rows. Give it items with a group each, or write
   ShortcutListGroups by hand. Items without a group, or ShortcutListItems
   straight inside, make one group with no name. */

type Shortcut = {
  /** the keys, pressed together: "⌘ B" or ["⌘", "B"] */
  keys: string | string[]
  /** what it does */
  what: React.ReactNode
  /** the group's name; items keep the order their groups first appear in */
  group?: string
}

function ShortcutList({
  className,
  items,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  /** every shortcut, grouped by their group */
  items?: Shortcut[]
}) {
  let body = children
  if (items) {
    const groups = new Map<string, Shortcut[]>()
    for (const item of items) groups.set(item.group ?? "", [...(groups.get(item.group ?? "") ?? []), item])
    body = [...groups].map(([name, rows]) => (
      <ShortcutListGroup key={name} label={name || undefined}>
        {rows.map((k, i) => (
          <ShortcutListItem key={i} keys={k.keys}>
            {k.what}
          </ShortcutListItem>
        ))}
      </ShortcutListGroup>
    ))
  } else if (!React.Children.toArray(children).some((c) => React.isValidElement(c) && c.type === ShortcutListGroup)) {
    // Rows straight inside still need a dl around them
    body = <ShortcutListGroup>{children}</ShortcutListGroup>
  }
  return (
    <div data-slot="shortcut-list" className={cn("flex flex-col gap-4", className)} {...props}>
      {body}
    </div>
  )
}

/* A group: its name 12/16 in grey, 4 over its rows. Without a label it is
   only the rows */
function ShortcutListGroup({
  className,
  label,
  children,
  ...props
}: React.ComponentProps<"section"> & {
  /** the group's name: "Panels" */
  label?: string
}) {
  return (
    <section data-slot="shortcut-list-group" aria-label={label} className={className} {...props}>
      {label && <h3 className="mb-1 text-[12px] leading-4 text-subtle">{label}</h3>}
      <dl className="flex flex-col">{children}</dl>
    </section>
  )
}

/* One row, 32 tall. The label is 14/18 at 80% white: it leads, the key
   caps follow in grey */
function ShortcutListItem({
  className,
  keys,
  children,
  ...props
}: Omit<React.ComponentProps<"div">, "children"> & {
  /** the keys, pressed together: "⌘ B" or ["⌘", "B"] */
  keys: string | string[]
  /** what it does */
  children: React.ReactNode
}) {
  const list = Array.isArray(keys) ? keys : keys.split(" ").filter(Boolean)
  return (
    <div data-slot="shortcut-list-item" className={cn("flex h-8 items-center justify-between gap-4", className)} {...props}>
      <dt className="min-w-0 text-[14px] leading-[18px] text-foreground/80">{children}</dt>
      <dd className="flex shrink-0 gap-1">
        {list.map((key, i) => (
          <Kbd key={i}>{key}</Kbd>
        ))}
      </dd>
    </div>
  )
}

export { ShortcutList, ShortcutListGroup, ShortcutListItem, type Shortcut }
