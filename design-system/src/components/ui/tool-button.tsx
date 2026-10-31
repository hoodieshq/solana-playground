import * as React from "react"
import { cn } from "@/lib/utils"

import { Button } from "@/components/ui/button"
import { Kbd } from "@/components/ui/kbd"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

/* A tool at a bar's end, as Claude Code draws its tools: the glyph alone at
   18px with a 1.5 stroke in a ghost square, lit while its panel is open, the
   name and the key in the tip. The glyph goes in as children. */

function ToolButton({
  className,
  label,
  shortcut,
  pressed,
  side = "bottom",
  children,
  ...props
}: Omit<React.ComponentProps<typeof Button>, "aria-label"> & {
  /** the tool's name: the button's label and the tip */
  label: string
  /** its key, in the tip */
  shortcut?: string
  /** its panel is open; leave out for a tool that is only pressed */
  pressed?: boolean
  side?: React.ComponentProps<typeof TooltipContent>["side"]
}) {
  return (
    <Tooltip delayDuration={300}>
      <TooltipTrigger asChild>
        <Button
          data-slot="tool-button"
          variant="ghost"
          size="icon"
          aria-label={label}
          aria-pressed={pressed}
          className={cn(
            "rounded-lg text-muted-foreground hover:text-foreground aria-pressed:bg-surface-hover aria-pressed:text-foreground [&_svg]:size-[18px]! [&_svg]:stroke-[1.5]",
            className
          )}
          {...props}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side={side} variant="raised">
        {label}
        {shortcut && <Kbd>{shortcut}</Kbd>}
      </TooltipContent>
    </Tooltip>
  )
}

export { ToolButton }
