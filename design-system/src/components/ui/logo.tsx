import * as React from "react"
import { BRAND_MARK_PATH } from "@/components/ui/brand-icon"
import { cn } from "@/lib/utils"

function Logo({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="logo"
      className={cn(
        "inline-flex items-center gap-2 font-heading text-[1.0625rem] leading-none text-foreground",
        className
      )}
      {...props}
    />
  )
}

/* Playground's mark: Solana's three bars folded into a play triangle, with
   the O of Playground beside it (the styleguide's ▷O). Wider than tall, so it
   is sized by its height and keeps its own width */
function LogoMark({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <svg
      data-slot="logo-mark"
      viewBox="0 0 970 574"
      aria-hidden="true"
      className={cn("h-5 w-auto shrink-0 fill-current", className)}
      {...props}
    >
      <path d={BRAND_MARK_PATH} />
    </svg>
  )
}

function LogoText({ className, ...props }: React.ComponentProps<"span">) {
  return <span data-slot="logo-text" className={cn("tracking-tight", className)} {...props} />
}

export { Logo, LogoMark, LogoText }
