import * as React from "react"
import { ListFilter } from "lucide-react"
import { cva } from "class-variance-authority"
import { cn } from "@/lib/utils"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

/* A filter as an icon beside a search, not a second box. It opens one
   choice under a quiet heading, the tick on the right in the accent, and a
   dot on the icon says a filter is on. boxed is a desk's: a square of the
   search field's height, outlined like it. bare is a phone's: the glyph
   alone in a thumb's square, grey at rest. */

const filterButtonVariants = cva(
  "relative flex shrink-0 items-center justify-center transition-colors duration-150 outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
  {
    variants: {
      variant: {
        boxed:
          "size-8 rounded-lg border border-foreground/10 text-foreground hover:bg-foreground/[0.06] data-[state=open]:border-transparent data-[state=open]:bg-foreground/[0.12] [&>svg]:size-[1.125rem]",
        bare: "size-10 rounded-lg text-muted-foreground/80 hover:text-foreground data-[state=open]:text-foreground data-on:text-foreground [&>svg]:size-[1.375rem] pointer-coarse:size-11",
      },
    },
    defaultVariants: {
      variant: "boxed",
    },
  }
)

type FilterOption = { value: string; label: string }

/* The phone's sliders, drawn in the search glass's line so the two read as a pair */
function Sliders() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
      <path d="M6 4v8M6 16v4M12 4v2M12 10v10M18 4v10M18 18v2" />
      <circle cx="6" cy="14" r="2" />
      <circle cx="12" cy="8" r="2" />
      <circle cx="18" cy="16" r="2" />
    </svg>
  )
}

function FilterButton({
  className,
  value,
  onValueChange,
  options,
  label,
  allValue = "all",
  variant = "boxed",
  align = "end",
  "aria-label": ariaLabel,
  ...props
}: Omit<React.ComponentProps<typeof DropdownMenuTrigger>, "value" | "children"> & {
  value: string
  onValueChange: (value: string) => void
  options: FilterOption[]
  /** what it filters by, the menu's heading: "Framework" */
  label: string
  /** the option that means no filter; any other shows the dot */
  allValue?: string
  variant?: "boxed" | "bare"
  align?: "start" | "center" | "end"
}) {
  const on = value !== allValue
  const chosen = options.find((o) => o.value === value)?.label ?? value
  const boxed = variant === "boxed"
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        data-slot="filter-button"
        data-variant={variant}
        data-on={on || undefined}
        aria-label={ariaLabel ?? (on ? `${label}: ${chosen}` : `Filter by ${label.toLowerCase()}`)}
        className={cn(filterButtonVariants({ variant }), className)}
        {...props}
      >
        {boxed ? <ListFilter strokeWidth={1.75} aria-hidden="true" /> : <Sliders />}
        {on && (
          <span
            data-slot="filter-button-dot"
            aria-hidden="true"
            className={cn("absolute size-1.5 rounded-full bg-brand-purple", boxed ? "-top-0.5 -right-0.5" : "top-2 right-2 pointer-coarse:top-2.5 pointer-coarse:right-2.5")}
          />
        )}
      </DropdownMenuTrigger>
      {/* A small card on the field's own fill: rows of the button's height,
          the heading in the rows' size but grey, so it never reads as one more choice */}
      <DropdownMenuContent align={align} sideOffset={6} className="w-44 rounded-xl bg-surface p-1.5 shadow-panel">
        <DropdownMenuLabel className="flex h-7 items-center px-2.5 py-0 text-[0.875rem] font-normal text-muted-foreground/80">{label}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={value} onValueChange={onValueChange}>
          {options.map((o) => (
            <DropdownMenuRadioItem
              key={o.value}
              value={o.value}
              className="h-7 py-0 pr-9 pl-2.5 text-[0.875rem] text-foreground pointer-coarse:h-10 [&_[data-slot=dropdown-menu-radio-item-indicator]]:right-2 [&_[data-slot=dropdown-menu-radio-item-indicator]]:text-brand-purple"
            >
              {o.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export { FilterButton, filterButtonVariants }
export type { FilterOption }
