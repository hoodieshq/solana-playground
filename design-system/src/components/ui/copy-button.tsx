import * as React from "react"
import { Check, Copy } from "lucide-react"
import { cn } from "@/lib/utils"

import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

/* Copies one value: a program id, a signature, a command. Its tooltip turns
   from Copy to Copied and back; the check on the button says it in green.
   The words keep the tip's own colour: green on the light tip was 1.34:1. */
function CopyButton({
  value,
  label = "Copy",
  className,
  ...props
}: Omit<React.ComponentProps<typeof Button>, "value" | "onClick"> & { value: string; label?: string }) {
  const [open, setOpen] = React.useState(false)
  const [copied, setCopied] = React.useState(false)
  return (
    <Tooltip open={open || copied} onOpenChange={setOpen}>
      <TooltipTrigger asChild>
        <Button
          data-slot="copy-button"
          variant="ghost"
          size="icon-xs"
          aria-label={copied ? "Copied" : label}
          className={cn("text-muted-foreground hover:text-foreground", className)}
          onClick={() => {
            navigator.clipboard?.writeText(value).then(() => {
              setCopied(true)
              setTimeout(() => setCopied(false), 1400)
            })
          }}
          {...props}
        >
          {copied ? <Check className="text-success" /> : <Copy />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <span>{copied ? "Copied" : label}</span>
      </TooltipContent>
    </Tooltip>
  )
}

export { CopyButton }
