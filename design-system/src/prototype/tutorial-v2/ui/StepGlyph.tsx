import { cn } from "@/lib/utils"

import { NAV_ICONS } from "./navIcons"

/** A step's mark in the phone's steps drawer, all in greys: its number on a grey disc, a lighter disc
 * while current, a check once done. `className` lets the drawer lift a disc off its grey panel */
export function StepGlyph({ i, done, current, className }: { i: number; done: boolean; current: boolean; className?: string }) {
  return (
    <span
      className={cn(
        // A filled disc with room round the figure, as Vercel numbers its steps: no ring, only tone
        "relative grid size-5 shrink-0 place-items-center rounded-full text-[0.6875rem] font-act lining-nums tabular-nums leading-none",
        done ? "bg-surface-hover text-muted-foreground" : current ? "bg-foreground/20 text-foreground" : "bg-surface-hover text-subtle",
        className
      )}
    >
      {/* Held at the box's size: a menu item sizes every bare icon to 16px, which pushed the check off centre */}
      {done ? <span className="flex size-3 [&>svg]:size-full!">{NAV_ICONS.check}</span> : i + 1}
    </span>
  )
}
