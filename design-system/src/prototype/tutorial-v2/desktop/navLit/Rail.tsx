import { forwardRef, type ComponentProps, type ReactNode } from "react"

import { PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

import type { Health, StatusRow } from "../../navStates"
import { FOCUS, HOVER, Tip, useRoomy } from "./parts"
import { HealthMark, StatusPopover } from "./StatusChip"

type RailButtonProps = ComponentProps<"button"> & { label: string; current?: boolean; section?: boolean; children: ReactNode }

/** The rail's square: 36 (44 on the tablet), the glyph centred at x 26 as in every shape. Current takes
 * the fill and the here marker; Tutorials while a lesson is open is bright with no fill. Forwards its
 * ref and props so a menu or a popover can open from it */
export const RailButton = forwardRef<HTMLButtonElement, RailButtonProps>(function RailButton({ label, current = false, section = false, className, children, ...props }, ref) {
  const tablet = useRoomy()
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      aria-current={current ? "page" : undefined}
      data-here={current || undefined}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-lg active:bg-surface-hover data-[state=open]:bg-(--nav-hover)",
        FOCUS,
        HOVER,
        tablet ? "size-11 [&>svg]:h-5 [&>svg]:w-5" : "size-9 [&>svg]:h-[1.125rem] [&>svg]:w-[1.125rem]",
        current ? "bg-(--nav-current) text-foreground" : section ? "text-foreground hover:bg-(--nav-hover)" : "text-muted-foreground hover:bg-(--nav-hover) hover:text-foreground",
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
})

/** The rail's one health dot in place of three unlabelled ones. Its tooltip is the chip's, and it opens
 * the same Status popover, to its right */
export function HealthDot({ health, rows, note }: { health: Health; rows: StatusRow[]; note?: string }) {
  return (
    <StatusPopover
      rows={rows}
      note={note}
      side="right"
      trigger={
        <Tip label={health.tip}>
          <PopoverTrigger asChild>
            <RailButton label={`Status: ${health.word}. ${health.tip}`}>
              <HealthMark health={health} />
            </RailButton>
          </PopoverTrigger>
        </Tip>
      }
    />
  )
}
