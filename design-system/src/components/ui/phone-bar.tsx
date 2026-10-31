import * as React from "react"
import { cn } from "@/lib/utils"

/* A phone screen's head: a 44px slot either side, the title between. With
   a back button in the start slot the title follows it; without one the
   title starts on the content's own 16px edge, in line with the cards
   below. A screen with a large title of its own leaves the title out, and
   the bar keeps only its buttons. No rule under it: the large title right
   below already starts the page, and a line there cuts it off from the
   bar. */

function PhoneBar({ className, ...props }: React.ComponentProps<"header">) {
  return (
    <header
      data-slot="phone-bar"
      className={cn(
        "flex h-phone-head shrink-0 items-center gap-1 pr-1.5 pl-4 has-data-[slot=phone-bar-start]:pl-1.5",
        className
      )}
      {...props}
    />
  )
}

function PhoneBarStart({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="phone-bar-start" className={cn("flex size-11 shrink-0 items-center justify-center", className)} {...props} />
  )
}

function PhoneBarTitle({ className, ...props }: React.ComponentProps<"h1">) {
  return (
    <h1
      data-slot="phone-bar-title"
      className={cn("min-w-0 flex-1 truncate font-heading text-title text-foreground", className)}
      {...props}
    />
  )
}

/* Its slot keeps its place with nothing in it, so a title never runs under
   where a button appears later. */
function PhoneBarEnd({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="phone-bar-end"
      className={cn("ml-auto flex size-11 shrink-0 items-center justify-center", className)}
      {...props}
    />
  )
}

export { PhoneBar, PhoneBarEnd, PhoneBarStart, PhoneBarTitle }
