import * as React from "react"
import { Slot } from "radix-ui"
import { cn } from "@/lib/utils"

/* Where a step starts in a conversation: its goal as a heading, since the
   step track already names the step. A passed step shows nothing more: the
   track's segment says it is done, and a tick and time beside the heading
   only took the line's room.
   In a feed whose turns stand 24 apart (gap-6), give it mt-1.5 and
   -mb-[15px]: 30 above and 9 under, so it belongs to the text it heads.
   The first one needs no mt.
   flash lights it once, for when a step track jumps here; give it a new key
   to play it again. scroll-mt stops a jump 22 under the feed's top, where
   the first step's heading sits on load, so it lands in the same place. */

function StepHeading({ className, flash = false, ...props }: React.ComponentProps<"div"> & { flash?: boolean }) {
  return (
    <div
      data-slot="step-heading"
      data-flash={flash || undefined}
      className={cn(
        "-mx-2 scroll-mt-[22px] rounded-control px-2 data-flash:animate-anchor-flash motion-reduce:data-flash:animate-none",
        className
      )}
      {...props}
    />
  )
}

/* The lesson's section heading, 24/28 at 500 in the heading face */
function StepHeadingTitle({ className, asChild = false, ...props }: React.ComponentProps<"h2"> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "h2"
  return (
    <Comp
      data-slot="step-heading-title"
      className={cn("font-heading text-[1.5rem] leading-[1.75rem] font-medium tracking-normal text-foreground", className)}
      {...props}
    />
  )
}

export { StepHeading, StepHeadingTitle }
