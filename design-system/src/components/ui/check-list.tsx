import * as React from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

/* What a lesson taught, one line each with a green tick, in the reading
   text: 16/24 at 320 and 80%, items 6 apart. It is the lesson's summary,
   not a side note, so it reads as the intro's How it goes does. The tick
   sits on the first line's middle, (24 - 16) / 2 down. */

function CheckList({ className, ...props }: React.ComponentProps<"ul">) {
  return <ul data-slot="check-list" className={cn("flex flex-col gap-1.5", className)} {...props} />
}

function CheckListItem({ className, children, ...props }: React.ComponentProps<"li">) {
  return (
    <li
      data-slot="check-list-item"
      className={cn(
        "flex items-start gap-2.5 text-[1rem] leading-[1.5rem] font-read tracking-normal text-foreground/80",
        className
      )}
      {...props}
    >
      <Check strokeWidth={2.25} aria-hidden="true" className="mt-1 size-4 shrink-0 text-success" />
      <span className="min-w-0">{children}</span>
    </li>
  )
}

export { CheckList, CheckListItem }
